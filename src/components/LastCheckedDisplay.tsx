import React from 'react';
import {useI18n} from '@shopify/react-i18n';
import {useExposureStatus} from 'services/ExposureNotificationService';
import {daysFromNow, hoursFromNow, minutesFromNow} from 'shared/date-fns';
import {pluralizeKey} from 'shared/pluralization';

import {Box} from './Box';
import {Text} from './Text';

export const LastCheckedDisplay = () => {
  const [i18n] = useI18n();
  const exposureStatus = useExposureStatus();
  if (!exposureStatus.lastChecked) return null;

  const lastCheckedDate = new Date(parseInt(exposureStatus.lastChecked, 10));
  const daysDiff = daysFromNow(lastCheckedDate);
  const hoursDiff = hoursFromNow(lastCheckedDate);
  const minutesDiff = Math.max(minutesFromNow(lastCheckedDate), 1);

  let text = i18n.translate(pluralizeKey('Home.LastCheckedMinutes', minutesDiff), {number: minutesDiff});

  if (daysDiff > 0) {
    text = i18n.translate(pluralizeKey('Home.LastCheckedHours', daysDiff), {number: daysDiff});
  } else if (hoursDiff > 0) {
    text = i18n.translate(pluralizeKey('Home.LastCheckedHours', hoursDiff), {number: hoursDiff});
  }

  return (
    <Box marginTop="s">
      <Text variant="smallText" color="bodyTextFaded" lineHeight={24} textAlign="center">
        {text}
      </Text>
    </Box>
  );
};
