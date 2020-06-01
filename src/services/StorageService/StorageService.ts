import AsyncStorage from '@react-native-community/async-storage';
import {MutableObservable} from 'shared/Observable';

enum Key {
  IsOnboarded = 'IsOnboarded',
  Locale = 'Locale',
}

export class StorageService {
  isOnboarding: MutableObservable<boolean>;
  locale: MutableObservable<string>;

  ready: MutableObservable<boolean>;

  constructor() {
    this.isOnboarding = new MutableObservable<boolean>(true);
    this.locale = new MutableObservable<string>('en');
    this.ready = new MutableObservable<boolean>(false);
    this.init();
  }

  setOnboarded = async (value: boolean) => {
    await AsyncStorage.setItem(Key.IsOnboarded, value ? '1' : '0');
    this.isOnboarding.set(!value);
  };

  setLocale = async (value: string) => {
    await AsyncStorage.setItem(Key.Locale, value);
    this.locale.set(value);
  };

  private init = async () => {
    const isOnboarded = (await AsyncStorage.getItem(Key.IsOnboarded)) === '1';
    this.isOnboarding.set(!isOnboarded);

    const locale = (await AsyncStorage.getItem(Key.Locale)) || this.locale.get();
    this.locale.set(locale);

    this.ready.set(true);
  };
}
