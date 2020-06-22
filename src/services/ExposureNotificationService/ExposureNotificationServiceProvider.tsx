import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import {useI18n} from '@shopify/react-i18n';
import ExposureNotification from 'bridge/ExposureNotification';
import {AppState, AppStateStatus} from 'react-native';
import SecureStorage from 'react-native-sensitive-info';
import SystemSetting from 'react-native-system-setting';

import {BackendInterface} from '../BackendService';
import {BackgroundScheduler} from '../BackgroundSchedulerService';

import {
  ExposureNotificationService,
  PersistencyProvider,
  SecurePersistencyProvider,
  SystemStatus,
  ExposureStatus,
} from './ExposureNotificationService';

const ExposureNotificationServiceContext = createContext<ExposureNotificationService | undefined>(undefined);

export interface ExposureNotificationServiceProviderProps {
  backendInterface: BackendInterface;
  backgroundScheduler?: typeof BackgroundScheduler;
  exposureNotification?: typeof ExposureNotification;
  storage?: PersistencyProvider;
  secureStorage?: SecurePersistencyProvider;
  children?: React.ReactElement;
}

export const ExposureNotificationServiceProvider = ({
  backendInterface,
  backgroundScheduler = BackgroundScheduler,
  exposureNotification,
  storage,
  secureStorage,
  children,
}: ExposureNotificationServiceProviderProps) => {
  const [i18n] = useI18n();
  const [ready, setReady] = useState(false);
  const exposureNotificationService = useMemo(
    () =>
      new ExposureNotificationService(
        backendInterface,
        i18n.translate,
        storage || AsyncStorage,
        secureStorage || SecureStorage,
        exposureNotification || ExposureNotification,
        () => setReady(true),
      ),
    [backendInterface, exposureNotification, i18n.translate, secureStorage, storage],
  );

  useEffect(() => {
    backgroundScheduler.registerPeriodicTask(() => {
      return exposureNotificationService.updateExposureStatusInBackground();
    });
  }, [backgroundScheduler, exposureNotificationService]);

  return (
    <ExposureNotificationServiceContext.Provider value={exposureNotificationService}>
      {ready && children}
    </ExposureNotificationServiceContext.Provider>
  );
};

export function useExposureNotificationService() {
  return useContext(ExposureNotificationServiceContext)!;
}

export function useSystemStatus() {
  const exposureNotificationService = useContext(ExposureNotificationServiceContext)!;
  const [state, setState] = useState<SystemStatus>(exposureNotificationService.systemStatus.get());
  useEffect(() => {
    return exposureNotificationService.systemStatus.observe(setState);
  }, [exposureNotificationService.systemStatus, setState]);

  return state;
}

export function useExposureStatus() {
  const exposureNotificationService = useContext(ExposureNotificationServiceContext)!;
  const [state, setState] = useState<ExposureStatus>(exposureNotificationService.exposureStatus.get());
  useEffect(() => {
    return exposureNotificationService.exposureStatus.observe(setState);
  }, [exposureNotificationService.exposureStatus]);
  return state;
}

export function useExposureNotificationListener() {
  const exposureNotificationService = useExposureNotificationService();
  return useCallback(() => {
    const updateStatus = async (newState: AppStateStatus) => {
      if (newState === 'active') {
        await exposureNotificationService.updateSystemStatus();
        await exposureNotificationService.updateExposureStatus();
      }
    };
    AppState.addEventListener('change', updateStatus);

    const bluetoothListenerPromise = SystemSetting.addBluetoothListener(() => {
      exposureNotificationService.updateSystemStatus();
    });

    return () => {
      AppState.removeEventListener('change', updateStatus);
      bluetoothListenerPromise.then(listener => listener.remove()).catch(() => {});
    };
  }, [exposureNotificationService]);
}
