import {TemporaryExposureKey} from 'bridge/ExposureNotification';
import {BackendInterface, SubmissionKeySet} from 'services/BackendService';

const DefaultConfiguration = {
  minimumRiskScore: 0,
  attenuationLevelValues: [1, 2, 3, 4, 5, 6, 7, 8],
  attenuationWeight: 50,
  daysSinceLastExposureLevelValues: [1, 2, 3, 4, 5, 6, 7, 8],
  daysSinceLastExposureWeight: 50,
  durationLevelValues: [1, 2, 3, 4, 5, 6, 7, 8],
  durationWeight: 50,
  transmissionRiskLevelValues: [1, 2, 3, 4, 5, 6, 7, 8],
  transmissionRiskWeight: 50,
};

const MockBackend: BackendInterface = {
  async claimOneTimeCode(_code: string) {
    return {
      clientPrivateKey: 'clientPrivateKey',
      clientPublicKey: 'clientPublicKey',
      serverPublicKey: 'serverPublicKey',
    };
  },

  async reportDiagnosisKeys(_submissionKeyPair: SubmissionKeySet, _keys: TemporaryExposureKey[]) {},

  async retrieveDiagnosisKeysByDay(_sinceDate: Date) {
    return [];
  },

  async retrieveDiagnosisKeysByHour(_sinceDate: Date) {
    return [];
  },

  async getExposureConfiguration() {
    return DefaultConfiguration;
  },
};

export default MockBackend;
