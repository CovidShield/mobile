import {downloadDiagnosisKeysFile} from '../../bridge/CovidShield';
import {TemporaryExposureKey} from '../../bridge/ExposureNotification';

import {BackendService} from './BackendService';
import {covidshield} from './covidshield';

jest.mock('tweetnacl', () => ({
  __esModule: true,
  default: {
    box: jest.fn(),
  },
}));

jest.mock('./covidshield', () => ({
  covidshield: {
    Upload: {
      create: jest.fn(),
      encode: () => ({
        finish: jest.fn(),
      }),
    },
    TemporaryExposureKey: {
      create: jest.fn(),
    },
    EncryptedUploadRequest: {
      encode: () => ({
        finish: jest.fn(),
      }),
    },
    EncryptedUploadResponse: {
      decode: jest.fn(),
    },
  },
}));

jest.mock('../../bridge/CovidShield', () => ({
  getRandomBytes: jest.fn(),
  downloadDiagnosisKeysFile: jest.fn(),
}));

jest.mock('../../shared/fetch', () => ({
  blobFetch: () => Promise.resolve([]),
}));

/**
 * Utils for comparing jsonString
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Expect {
      toHaveLength(length: number): any;
    }
  }
}
expect.extend({
  toHaveLength(array, length) {
    const pass = Array.isArray(array) && array.length === length;
    if (!pass) {
      return {
        pass,
        message: () => `expect ${array} to have length of ${length}`,
      };
    }
    return {
      message: () => '',
      pass,
    };
  },
});

function generateRandomKeys(numberOfKeys: number) {
  const keys: TemporaryExposureKey[] = [];
  for (let i = 0; i < numberOfKeys; i++) {
    keys.push({
      keyData: '',
      rollingPeriod: i,
      rollingStartIntervalNumber: i,
      transmissionRiskLevel: 0,
    });
  }
  return keys;
}

describe('BackendService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('reportDiagnosisKeys', () => {
    it('returns last 14 keys if there is more than 14', async () => {
      const backendService = new BackendService('http://localhost', 'https://localhost', 'mock', 302);
      const keys = generateRandomKeys(20);

      await backendService.reportDiagnosisKeys(
        {
          clientPrivateKey: 'mock',
          clientPublicKey: 'mock',
          serverPublicKey: 'mock',
        },
        keys,
      );

      expect(covidshield.Upload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          keys: expect.toHaveLength(14),
        }),
      );
      keys
        .sort((first, second) => second.rollingStartIntervalNumber - first.rollingStartIntervalNumber)
        .splice(0, 14)
        .map(({rollingStartIntervalNumber, rollingPeriod}) => ({rollingStartIntervalNumber, rollingPeriod}))
        .forEach(value => {
          expect(covidshield.TemporaryExposureKey.create).toHaveBeenCalledWith(expect.objectContaining(value));
        });
    });
  });

  describe('retrieveDiagnosisKeys', () => {
    it('returns keys file for set period', async () => {
      const backendService = new BackendService('http://localhost', 'https://localhost', 'mock', 302);

      await backendService.retrieveDiagnosisKeys(18457);

      expect(downloadDiagnosisKeysFile).toHaveBeenCalledWith(
        'http://localhost/retrieve/302/18457/c4d9820c20f7073e47f54cc1bd24475fb98c8ab9ffc0ea81dded3f8ebfb48b67',
      );
    });

    it('returns keys file for 14 days if period is 0', async () => {
      const backendService = new BackendService('http://localhost', 'https://localhost', 'mock', 302);

      await backendService.retrieveDiagnosisKeys(0);

      expect(downloadDiagnosisKeysFile).toHaveBeenCalledWith(
        'http://localhost/retrieve/302/00000/ca365ad512568f4292953403590b398e3f1336efcb4f1acedb20926c35408bd9',
      );
    });
  });
});
