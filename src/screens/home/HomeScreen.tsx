import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useNetInfo} from '@react-native-community/netinfo';
import {DrawerActions, useNavigation} from '@react-navigation/native';
import {BottomSheet, Box} from 'components';
import {DevSettings} from 'react-native';
import {checkNotifications, requestNotifications} from 'react-native-permissions';
import {
  SystemStatus,
  useExposureNotificationListener,
  useExposureNotificationService,
  useExposureStatus,
  useSystemStatus,
} from 'services/ExposureNotificationService';
import {createCancellablePromise} from 'shared/cancellablePromise';
import {useMaxContentWidth} from 'shared/useMaxContentWidth';

import {BluetoothDisabledView} from './views/BluetoothDisabledView';
import {CollapsedOverlayView} from './views/CollapsedOverlayView';
import {DiagnosedShareView} from './views/DiagnosedShareView';
import {DiagnosedView} from './views/DiagnosedView';
import {ExposureNotificationsDisabledView} from './views/ExposureNotificationsDisabledView';
import {ExposureView} from './views/ExposureView';
import {NetworkDisabledView} from './views/NetworkDisabledView';
import {NoExposureView} from './views/NoExposureView';
import {OverlayView} from './views/OverlayView';

type NotificationPermission = 'denied' | 'granted' | 'unavailable' | 'blocked';

const useNotificationPermissionStatus = (): [string, () => void] => {
  const [status, setStatus] = useState<NotificationPermission>('granted');

  useEffect(() => {
    return createCancellablePromise<NotificationPermission>(
      checkNotifications()
        .then(({status}) => status)
        .catch(() => 'unavailable'),
      setStatus,
    );
  }, []);

  const request = useCallback(() => {
    return createCancellablePromise(
      requestNotifications(['alert']).then(({status}) => status),
      setStatus,
    );
  }, []);

  return [status, request];
};

const Content = () => {
  const exposureStatus = useExposureStatus();
  const systemStatus = useSystemStatus();

  // Note: this library has bad implementation causing memory leak
  const network = useNetInfo();

  switch (exposureStatus.type) {
    case 'exposed':
      return <ExposureView />;
    case 'diagnosed':
      return exposureStatus.needsSubmission ? <DiagnosedShareView /> : <DiagnosedView />;
    case 'monitoring':
    default:
      if (!network.isConnected) return <NetworkDisabledView />;
      switch (systemStatus) {
        case SystemStatus.Disabled:
        case SystemStatus.Restricted:
          return <ExposureNotificationsDisabledView />;
        case SystemStatus.BluetoothOff:
          return <BluetoothDisabledView />;
        case SystemStatus.Active:
        case SystemStatus.Unknown:
          return <NoExposureView />;
      }
  }
};

export const HomeScreen = () => {
  const navigation = useNavigation();
  useEffect(() => {
    if (__DEV__) {
      DevSettings.addMenuItem('Show Test Menu', () => {
        navigation.dispatch(DrawerActions.openDrawer());
      });
    }
  }, [navigation]);

  const exposureNotificationService = useExposureNotificationService();
  useEffect(() => {
    exposureNotificationService.start();
  }, [exposureNotificationService]);

  const exposureNotificationListener = useExposureNotificationListener();
  useEffect(() => {
    return exposureNotificationListener();
  }, [exposureNotificationListener]);

  const systemStatus = useSystemStatus();
  const [notificationStatus, turnNotificationsOn] = useNotificationPermissionStatus();
  const showNotificationWarning = notificationStatus !== 'granted';
  const collapsedContent = useMemo(
    () => (
      <CollapsedOverlayView
        status={systemStatus}
        notificationWarning={showNotificationWarning}
        turnNotificationsOn={turnNotificationsOn}
      />
    ),
    [showNotificationWarning, systemStatus, turnNotificationsOn],
  );

  const maxWidth = useMaxContentWidth();

  return (
    <Box flex={1} alignItems="center" backgroundColor="mainBackground">
      <Box flex={1} maxWidth={maxWidth} paddingTop="m">
        <Content />
      </Box>
      <BottomSheet
        // need to change the key here so bottom sheet is rerendered. This is because the snap points change.
        key={showNotificationWarning ? 'notifications-disabled' : 'notifications-enabled'}
        collapsedContent={collapsedContent}
        extraContent={showNotificationWarning}
      >
        <OverlayView
          status={systemStatus}
          notificationWarning={showNotificationWarning}
          turnNotificationsOn={turnNotificationsOn}
          maxWidth={maxWidth}
        />
      </BottomSheet>
    </Box>
  );
};
