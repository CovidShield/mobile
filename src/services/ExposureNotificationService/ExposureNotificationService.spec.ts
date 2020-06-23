import {mock} from 'jest-mock-extended';
import {when} from 'jest-when';

import ExposureNotification, {Status as SystemStatus} from '../../bridge/ExposureNotification';
import {addDays} from '../../shared/date-fns';
import {BackendInterface} from '../BackendService';

import {
  ExposureNotificationService,
  PersistencyProvider,
  SecurePersistencyProvider,
  SUBMISSION_CYCLE_STARTED_AT,
  Translate,
  LAST_CHECK_TIMESTAMP,
} from './ExposureNotificationService';

const backendInterface = mock<BackendInterface>();
const translate = mock<Translate>();
const storage = mock<PersistencyProvider>();
const secureStorage = mock<SecurePersistencyProvider>();
const exposureNotification = mock<typeof ExposureNotification>();

describe('ExposureNotificationService', () => {
  async function createService(onReady?: (service: ExposureNotificationService) => void) {
    return new Promise<ExposureNotificationService>(
      resolve =>
        new ExposureNotificationService(
          backendInterface,
          translate,
          storage,
          secureStorage,
          exposureNotification,
          service => {
            onReady?.(service);
            resolve(service);
          },
        ),
    );
  }

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('init', () => {
    it('calls onReady', async () => {
      const onReadyMock = jest.fn();

      await createService(onReadyMock);

      expect(onReadyMock).toHaveBeenCalledTimes(1);
    });

    it('sets default status', async () => {
      exposureNotification.getStatus.mockResolvedValue(SystemStatus.Disabled);

      const service = await createService();

      expect(service.systemStatus.get()).toStrictEqual(SystemStatus.Disabled);
      expect(service.exposureStatus.get()).toStrictEqual({type: 'monitoring'});
    });

    it('calls updateSystemStatus', async () => {
      exposureNotification.getStatus.mockResolvedValue(SystemStatus.Active);

      const service = await createService();

      expect(service.systemStatus.get()).toStrictEqual(SystemStatus.Active);
    });

    it('updates systemStatus', async () => {
      exposureNotification.getStatus.mockResolvedValue(SystemStatus.Active);

      const service = await createService();

      expect(service.systemStatus.get()).toStrictEqual(SystemStatus.Active);
    });

    it('updates exposureStatus to diagnosed when SUBMISSION_CYCLE_STARTED_AT is available', async () => {
      const submissionCycleStartedAtStr = Date.now().toString();
      when(storage.getItem)
        .calledWith(SUBMISSION_CYCLE_STARTED_AT)
        .mockResolvedValue(submissionCycleStartedAtStr);

      const service = await createService();

      expect(service.exposureStatus.get()).toStrictEqual({
        type: 'diagnosed',
        cycleEndsAt: addDays(new Date(parseInt(submissionCycleStartedAtStr, 10)), 14),
        needsSubmission: false,
      });
    });

    it('adds lastChecked to exposureStatus if it is available', async () => {
      const lastCheckTimestamp = Date.now().toString();
      when(storage.getItem)
        .calledWith(LAST_CHECK_TIMESTAMP)
        .mockResolvedValue(lastCheckTimestamp);

      const service = await createService();

      expect(service.exposureStatus.get()).toMatchObject({
        lastChecked: lastCheckTimestamp,
      });
    });
  });

  describe('start', () => {
    it('calls exposureNotification.start', async () => {
      const service = await createService();
      await service.start();

      expect(exposureNotification.start).toHaveBeenCalled();
    });

    it('calls exposureNotification.start once if it is still running', async () => {
      const service = await createService();
      const startPromise = service.start();
      service.start();

      await startPromise;

      expect(exposureNotification.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSystemStatus', () => {
    it('updates systemStatus', async () => {
      exposureNotification.getStatus.mockResolvedValue(SystemStatus.BluetoothOff);

      const service = await createService();

      expect(service.systemStatus.get()).toStrictEqual(SystemStatus.BluetoothOff);
    });
  });

  describe('updateExposureStatus', () => {
    it('backfills keys when last timestamp not available', async () => {
      when(storage.getItem)
        .calledWith(LAST_CHECK_TIMESTAMP)
        .mockResolvedValue(undefined);
      backendInterface.retrieveDiagnosisKeys.mockResolvedValue('foo');

      const service = await createService();

      await service.updateExposureStatus();
      expect(backendInterface.retrieveDiagnosisKeys).toHaveBeenCalledTimes(14);
    });

    describe('backfills the right amount of keys for current day', () => {
      async function run(dayToBackfill: number) {
        const today = Date.now();
        backendInterface.retrieveDiagnosisKeys.mockResolvedValue('foo');
        when(storage.getItem)
          .calledWith(LAST_CHECK_TIMESTAMP)
          .mockResolvedValue((today - dayToBackfill * 24 * 3600 * 1000).toString());

        await (await createService()).updateExposureStatus();
      }

      it('backfills 0 day', async () => {
        await run(0);
        expect(backendInterface.retrieveDiagnosisKeys).toHaveBeenCalledTimes(0);
      });

      it('backfills 1 day', async () => {
        await run(1);
        expect(backendInterface.retrieveDiagnosisKeys).toHaveBeenCalledTimes(1);
      });

      it('backfills 2 days', async () => {
        await run(2);
        expect(backendInterface.retrieveDiagnosisKeys).toHaveBeenCalledTimes(2);
      });
    });
  });

  // it('serializes status update', async () => {
  //   const updatePromise = service.updateExposureStatus();
  //   const anotherUpdatePromise = service.updateExposureStatus();
  //   await Promise.all([updatePromise, anotherUpdatePromise]);
  //   expect(server.getExposureConfiguration).toHaveBeenCalledTimes(1);
  // });

  // it('stores last update timestamp', async () => {
  //   const currentDatetime = new OriginalDate('2020-05-19T07:10:00+0000');
  //   dateSpy.mockImplementation((args: any) => {
  //     if (args === undefined) return currentDatetime;
  //     return new OriginalDate(args);
  //   });

  //   when(storage.getItem)
  //     .calledWith('lastCheckTimestamp')
  //     .mockResolvedValue(new OriginalDate('2020-05-18T04:10:00+0000').getTime());

  //   await service.updateExposureStatus();
  //   expect(storage.setItem).toHaveBeenCalledWith('lastCheckTimestamp', `${currentDatetime.getTime()}`);
  // });

  // it('enters Diagnosed flow when start keys submission process', async () => {
  //   dateSpy.mockImplementation(() => {
  //     return new OriginalDate();
  //   });
  //   when(server.claimOneTimeCode)
  //     .calledWith('12345678')
  //     .mockResolvedValue({
  //       serverPublicKey: 'serverPublicKey',
  //       clientPrivateKey: 'clientPrivateKey',
  //       clientPublicKey: 'clientPublicKey',
  //     });

  //   await service.startKeysSubmission('12345678');
  //   expect(service.exposureStatus.get()).toStrictEqual(
  //     expect.objectContaining({
  //       type: 'diagnosed',
  //       cycleEndsAt: expect.any(OriginalDate),
  //       needsSubmission: true,
  //     }),
  //   );
  // });

  // it('restores "diagnosed" status from storage', async () => {
  //   when(storage.getItem)
  //     .calledWith('submissionCycleStartedAt')
  //     .mockResolvedValueOnce(new OriginalDate('2020-05-18T04:10:00+0000').toString());
  //   dateSpy.mockImplementation((...args) =>
  //     args.length > 0 ? new OriginalDate(...args) : new OriginalDate('2020-05-19T04:10:00+0000'),
  //   );

  //   await service.start();

  //   expect(service.exposureStatus.get()).toStrictEqual(
  //     expect.objectContaining({
  //       type: 'diagnosed',
  //     }),
  //   );
  // });

  // describe('NeedsSubmission status calculated initially', () => {
  //   beforeEach(() => {
  //     dateSpy.mockImplementation((...args) =>
  //       args.length > 0 ? new OriginalDate(...args) : new OriginalDate('2020-05-19T04:10:00+0000'),
  //     );
  //     when(storage.getItem)
  //       .calledWith('submissionCycleStartedAt')
  //       .mockResolvedValue(new OriginalDate('2020-05-14T04:10:00+0000').toString());
  //   });

  //   it('for positive', async () => {
  //     when(storage.getItem)
  //       .calledWith('submissionLastCompletedAt')
  //       .mockResolvedValue(new OriginalDate('2020-05-18T04:10:00+0000').toString());

  //     await service.start();
  //     expect(service.exposureStatus.get()).toStrictEqual(
  //       expect.objectContaining({
  //         needsSubmission: false,
  //       }),
  //     );
  //   });
  //   it('for negative', async () => {
  //     when(storage.getItem)
  //       .calledWith('submissionLastCompletedAt')
  //       .mockResolvedValue(new OriginalDate('2020-05-19T04:10:00+0000').getTime().toString());
  //     await service.start();
  //     expect(service.exposureStatus.get()).toStrictEqual(
  //       expect.objectContaining({
  //         needsSubmission: false,
  //       }),
  //     );
  //   });
  // });

  // it('needsSubmission status recalculates daily', async () => {
  //   let currentDateString = '2020-05-19T04:10:00+0000';

  //   when(storage.getItem)
  //     .calledWith('submissionCycleStartedAt')
  //     .mockResolvedValue(new OriginalDate('2020-05-14T04:10:00+0000').getTime().toString());
  //   when(storage.getItem)
  //     .calledWith('submissionLastCompletedAt')
  //     .mockResolvedValue(null);

  //   dateSpy.mockImplementation((...args) =>
  //     args.length > 0 ? new OriginalDate(...args) : new OriginalDate(currentDateString),
  //   );

  //   await service.start();
  //   await service.updateExposureStatus();
  //   expect(service.exposureStatus.get()).toStrictEqual(
  //     expect.objectContaining({type: 'diagnosed', needsSubmission: true}),
  //   );

  //   currentDateString = '2020-05-20T04:10:00+0000';
  //   when(secureStorage.getItem)
  //     .calledWith('submissionAuthKeys')
  //     .mockResolvedValueOnce('{}');
  //   await service.fetchAndSubmitKeys();

  //   expect(storage.setItem).toHaveBeenCalledWith(
  //     'submissionLastCompletedAt',
  //     new OriginalDate(currentDateString).getTime().toString(),
  //   );

  //   expect(service.exposureStatus.get()).toStrictEqual(
  //     expect.objectContaining({type: 'diagnosed', needsSubmission: false}),
  //   );

  //   when(storage.getItem)
  //     .calledWith('submissionLastCompletedAt')
  //     .mockResolvedValue(new OriginalDate(currentDateString).getTime().toString());

  //   // advance day forward
  //   currentDateString = '2020-05-21T04:10:00+0000';

  //   await service.updateExposureStatus();
  //   expect(service.exposureStatus.get()).toStrictEqual(
  //     expect.objectContaining({type: 'diagnosed', needsSubmission: true}),
  //   );

  //   // advance 14 days
  //   currentDateString = '2020-05-30T04:10:00+0000';
  //   when(storage.getItem)
  //     .calledWith('submissionLastCompletedAt')
  //     .mockResolvedValue(new OriginalDate('2020-05-28T04:10:00+0000').getTime().toString());

  //   await service.updateExposureStatus();
  //   expect(service.exposureStatus.get()).toStrictEqual(
  //     expect.objectContaining({type: 'diagnosed', needsSubmission: false}),
  //   );
  // });
});
