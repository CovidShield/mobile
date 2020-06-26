import React, {useEffect} from 'react';
import {useNetInfo} from '@react-native-community/netinfo';
import {DrawerActions, useNavigation} from '@react-navigation/native';
import {BottomSheet, Box} from 'components';
import {DevSettings} from 'react-native';
import {
  SystemStatus,
  useExposureNotificationSystemStatusAutomaticUpdater,
  useExposureStatus,
  useStartExposureNotificationService,
  useSystemStatus,
} from 'services/ExposureNotificationService';
import {useMaxContentWidth} from 'shared/useMaxContentWidth';

import {
  NotificationPermissionStatusProvider,
  useNotificationPermissionStatus,
} from './components/NotificationPermissionStatus';
import {BluetoothDisabledView} from './views/BluetoothDisabledView';
import {CollapsedOverlayView} from './views/CollapsedOverlayView';
import {DiagnosedShareView} from './views/DiagnosedShareView';
import {DiagnosedView} from './views/DiagnosedView';
import {ExposureNotificationsDisabledView} from './views/ExposureNotificationsDisabledView';
import {ExposureView} from './views/ExposureView';
import {NetworkDisabledView} from './views/NetworkDisabledView';
import {NoExposureView} from './views/NoExposureView';
import {OverlayView} from './views/OverlayView';

const Content = () => {
  const [exposureStatus] = useExposureStatus();
  const [systemStatus] = useSystemStatus();
  const network = useNetInfo();

  switch (exposureStatus.type) {
    case 'exposed':
      return <ExposureView />;
    case 'diagnosed':
      return exposureStatus.needsSubmission ? <DiagnosedShareView /> : <DiagnosedView />;
    case 'monitoring':
    default:
      if (!network.isConnected && network.type !== 'unknown') return <NetworkDisabledView />;
      switch (systemStatus) {
        case SystemStatus.Disabled:
        case SystemStatus.Restricted:
        case SystemStatus.Unknown:
          return <ExposureNotificationsDisabledView />;
        case SystemStatus.BluetoothOff:
          return <BluetoothDisabledView />;
        case SystemStatus.Active:
          return <NoExposureView />;
        default:
          return null;
      }
  }
};

const CollapsedContent = () => {
  const [systemStatus] = useSystemStatus();
  const [notificationStatus, turnNotificationsOn] = useNotificationPermissionStatus();
  const showNotificationWarning = notificationStatus === 'denied';

  if (systemStatus === SystemStatus.Undefined) {
    return null;
  }

  return (
    <CollapsedOverlayView
      status={systemStatus}
      notificationWarning={showNotificationWarning}
      turnNotificationsOn={turnNotificationsOn}
    />
  );
};

const BottomSheetContent = () => {
  const [systemStatus] = useSystemStatus();
  const [notificationStatus, turnNotificationsOn] = useNotificationPermissionStatus();
  const showNotificationWarning = notificationStatus !== 'granted';
  const maxWidth = useMaxContentWidth();

  if (systemStatus === SystemStatus.Undefined) {
    return null;
  }

  return (
    <OverlayView
      status={systemStatus}
      notificationWarning={showNotificationWarning}
      turnNotificationsOn={turnNotificationsOn}
      maxWidth={maxWidth}
    />
  );
};

const BottomSheetWrapper = () => {
  const [notificationStatus] = useNotificationPermissionStatus();
  const showNotificationWarning = notificationStatus !== 'granted';
  return (
    <BottomSheet content={BottomSheetContent} collapsed={CollapsedContent} extraContent={showNotificationWarning} />
  );
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

  // This only initiate system status updater.
  // The actual updates will be delivered in useSystemStatus().
  const subscribeToStatusUpdates = useExposureNotificationSystemStatusAutomaticUpdater();
  useEffect(() => {
    return subscribeToStatusUpdates();
  }, [subscribeToStatusUpdates]);

  const startExposureNotificationService = useStartExposureNotificationService();
  useEffect(() => {
    startExposureNotificationService();
  }, [startExposureNotificationService]);

  const maxWidth = useMaxContentWidth();

  return (
    <NotificationPermissionStatusProvider>
      <Box flex={1} alignItems="center" backgroundColor="mainBackground">
        <Box flex={1} maxWidth={maxWidth} paddingTop="m">
          <Content />
        </Box>
        <BottomSheetWrapper />
      </Box>
    </NotificationPermissionStatusProvider>
  );
};
