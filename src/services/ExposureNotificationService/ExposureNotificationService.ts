import ExposureNotification, {ExposureInformation, Status as SystemStatus} from 'bridge/ExposureNotification';
import PushNotification from 'bridge/PushNotification';
import {MutableObservable, Observable} from 'shared/Observable';
import {addDays, daysBetween, periodSinceEpoch} from 'shared/date-fns';

import {BackendInterface, SubmissionKeySet} from '../BackendService';

const SUBMISSION_AUTH_KEYS = 'submissionAuthKeys';
const SUBMISSION_CYCLE_STARTED_AT = 'submissionCycleStartedAt';
const SUBMISSION_LAST_COMPLETED_AT = 'submissionLastCompletedAt';

const SECURE_OPTIONS = {
  sharedPreferencesName: 'covidShieldSharedPreferences',
  keychainService: 'covidShieldKeychain',
};

type Translate = (key: string) => string;

export {SystemStatus};

export type ExposureStatus =
  | {
      type: 'monitoring';
      lastChecked?: string;
    }
  | {
      type: 'exposed';
      exposures: ExposureInformation[];
      lastChecked?: string;
    }
  | {
      type: 'diagnosed';
      needsSubmission: boolean;
      cycleEndsAt: Date;
      lastChecked?: string;
    };

export interface PersistencyProvider {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
}

export interface SecurePersistencyProvider {
  setItem(key: string, value: string, options: SecureStorageOptions): Promise<null>;
  getItem(key: string, options: SecureStorageOptions): Promise<string | null>;
}

export interface SecureStorageOptions {
  keychainService?: string;
  sharedPreferencesName?: string;
}

export class ExposureNotificationService {
  public get exposureStatus(): Observable<ExposureStatus> {
    return this.exposureStatusInternal;
  }

  public get systemStatus(): Observable<SystemStatus> {
    return this.systemStatusInternal;
  }

  private exposureStatusInternal: MutableObservable<ExposureStatus>;
  private systemStatusInternal: MutableObservable<SystemStatus>;

  private backendInterface: BackendInterface;
  private exposureNotification: typeof ExposureNotification;

  private secureStorage: SecurePersistencyProvider;
  private storage: PersistencyProvider;
  private translate: Translate;

  private isUpdatingExposureStatus = false;

  constructor(
    backendInterface: BackendInterface,
    translate: Translate,
    storage: PersistencyProvider,
    secureStorage: SecurePersistencyProvider,
    exposureNotification: typeof ExposureNotification,
  ) {
    this.systemStatusInternal = new MutableObservable<SystemStatus>(SystemStatus.Disabled);
    this.exposureStatusInternal = new MutableObservable<ExposureStatus>({type: 'monitoring'});

    this.secureStorage = secureStorage;
    this.storage = storage;
    this.translate = translate;

    this.exposureNotification = exposureNotification;
    this.backendInterface = backendInterface;

    this.start();
  }

  async start(): Promise<void> {
    try {
      await this.exposureNotification.start();
    } catch (_) {
      // Noop due to ExposureNotification framework is not available on device
      return;
    }
    // we check the lastCheckTimeStamp on start to make sure it gets populated even if the server doesn't run
    const timestamp = await this.storage.getItem('lastCheckTimeStamp');
    const submissionCycleStartedAtStr = await this.storage.getItem(SUBMISSION_CYCLE_STARTED_AT);
    if (submissionCycleStartedAtStr) {
      this.exposureStatusInternal.set({
        type: 'diagnosed',
        cycleEndsAt: addDays(new Date(parseInt(submissionCycleStartedAtStr, 10)), 14),
        // let updateExposureStatus() deal with that
        needsSubmission: false,
      });
    }
    if (timestamp) {
      this.exposureStatusInternal.set({...this.exposureStatus.get(), lastChecked: timestamp});
    }
    await this.updateExposureStatus();
  }

  async updateSystemStatus(): Promise<SystemStatus> {
    const status = await this.exposureNotification.getStatus().catch(() => SystemStatus.Disabled);
    this.systemStatusInternal.set(status);
    return this.systemStatus.get();
  }

  async updateExposureStatusInBackground() {
    if (this.systemStatus.get() !== SystemStatus.Active) return;
    await this.updateExposureStatus();
    const status = this.exposureStatus.get();
    if (status.type === 'exposed') {
      PushNotification.presentLocalNotification({
        alertTitle: this.translate('Notification.ExposedMessageTitle'),
        alertBody: this.translate('Notification.ExposedMessageBody'),
      });
    }

    if (status.type === 'diagnosed' && status.needsSubmission) {
      PushNotification.presentLocalNotification({
        alertTitle: this.translate('Notification.DailyUploadNotificationTitle'),
        alertBody: this.translate('Notification.DailyUploadNotificationBody'),
      });
    }
  }

  async updateExposureStatus() {
    if (this.systemStatus.get() !== SystemStatus.Active) return;
    if (this.isUpdatingExposureStatus) return;
    this.isUpdatingExposureStatus = true;
    const cleanUpPromise = <T>(input: T): T => {
      this.isUpdatingExposureStatus = false;
      return input;
    };
    await this.performExposureStatusUpdate().then(cleanUpPromise, cleanUpPromise);
  }

  async startKeysSubmission(oneTimeCode: string): Promise<void> {
    const keys = await this.backendInterface.claimOneTimeCode(oneTimeCode);
    const serialized = JSON.stringify(keys);
    await this.secureStorage.setItem(SUBMISSION_AUTH_KEYS, serialized, SECURE_OPTIONS);
    const submissionCycleStartAt = new Date();
    this.storage.setItem(SUBMISSION_CYCLE_STARTED_AT, submissionCycleStartAt.getTime().toString());
    this.exposureStatusInternal.set({
      type: 'diagnosed',
      needsSubmission: true,
      cycleEndsAt: addDays(submissionCycleStartAt, 14),
    });
  }

  async fetchAndSubmitKeys(): Promise<void> {
    const submissionKeysStr = await this.secureStorage.getItem(SUBMISSION_AUTH_KEYS, SECURE_OPTIONS);
    if (!submissionKeysStr) {
      throw new Error('No Upload keys found, did you forget to claim one-time code?');
    }
    const auth = JSON.parse(submissionKeysStr) as SubmissionKeySet;
    const diagnosisKeys = await this.exposureNotification.getTemporaryExposureKeyHistory();

    await this.backendInterface.reportDiagnosisKeys(auth, diagnosisKeys);
    await this.recordKeySubmission();
  }

  private async submissionCycleEndsAt(): Promise<Date> {
    const cycleStart = await this.storage.getItem(SUBMISSION_CYCLE_STARTED_AT);
    return addDays(cycleStart ? new Date(parseInt(cycleStart, 10)) : new Date(), 14);
  }

  private async *keysSinceLastFetch(lastFetchDate?: Date): AsyncGenerator<string> {
    const runningDate = new Date();

    const lastCheckPeriod = periodSinceEpoch(lastFetchDate || addDays(runningDate, -14));
    let runningPeriod = periodSinceEpoch(runningDate);

    while (runningPeriod > lastCheckPeriod) {
      yield await this.backendInterface.retrieveDiagnosisKeys(runningPeriod);
      runningPeriod -= 2;
    }
  }

  private async recordKeySubmission() {
    const currentStatus = this.exposureStatus.get();
    if (currentStatus.type === 'diagnosed') {
      await this.storage.setItem(SUBMISSION_LAST_COMPLETED_AT, new Date().getTime().toString());
      this.exposureStatusInternal.set({...currentStatus, needsSubmission: false});
    }
  }

  private async calculateNeedsSubmission(): Promise<boolean> {
    const lastSubmittedStr = await this.storage.getItem(SUBMISSION_LAST_COMPLETED_AT);
    const submissionCycleEnds = await this.submissionCycleEndsAt();
    if (!lastSubmittedStr) {
      return true;
    }

    const lastSubmittedDay = new Date(parseInt(lastSubmittedStr, 10));
    const today = new Date();

    if (daysBetween(lastSubmittedDay, submissionCycleEnds) <= 0) {
      // we're done submitting keys
      return false;
    } else if (daysBetween(lastSubmittedDay, today) > 0) {
      return true;
    }
    return false;
  }

  private async performExposureStatusUpdate(): Promise<ExposureStatus> {
    const exposureConfigutration = await this.backendInterface.getExposureConfiguration();
    const lastCheckDate = await (async () => {
      const timestamp = await this.storage.getItem('lastCheckTimeStamp');
      if (timestamp) {
        return new Date(parseInt(timestamp, 10));
      }
      return undefined;
    })();

    const finalize = (status: ExposureStatus) => {
      const timestamp = `${new Date().getTime()}`;
      this.exposureStatusInternal.set({...status, lastChecked: timestamp});
      this.storage.setItem('lastCheckTimeStamp', timestamp);
      return this.exposureStatus.get();
    };

    const currentStatus = this.exposureStatus.get();
    if (currentStatus.type === 'diagnosed') {
      return finalize({...currentStatus, needsSubmission: await this.calculateNeedsSubmission()});
    }

    console.log('lastCheckDate', lastCheckDate);
    const generator = this.keysSinceLastFetch(lastCheckDate);
    while (true) {
      const {value: keysFilesUrl, done} = await generator.next();
      if (done) break;

      const summary = await this.exposureNotification.detectExposure(exposureConfigutration, [keysFilesUrl]);
      if (summary.matchedKeyCount > 0) {
        const exposures = await this.exposureNotification.getExposureInformation(summary);
        return finalize({type: 'exposed', exposures});
      }
    }
    return finalize({type: 'monitoring'});
  }
}
