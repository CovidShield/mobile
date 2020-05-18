import Config from 'react-native-config';

export const TEST_MODE = Config.TEST_MODE === 'true' || false;

export const SUBMIT_URL = Config.SUBMIT_URL;

export const RETRIEVE_URL = Config.RETRIEVE_URL;

export const HMAC_KEY = Config.HMAC_KEY;
