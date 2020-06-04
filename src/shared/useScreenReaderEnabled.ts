import {useEffect, useState} from 'react';
import {AccessibilityInfo, AccessibilityEvent} from 'react-native';

export function useScreenReaderEnabled() {
  const [screenReaderEnabled, setEnabled] = useState(false);
  useEffect(() => {
    const handleChange = (isScreenReaderEnabled: AccessibilityEvent) => {
      setEnabled(Boolean(isScreenReaderEnabled));
    };
    AccessibilityInfo.isScreenReaderEnabled()
      .then(handleChange)
      .catch(error => {
        console.warn('AccessibilityInfo.isScreenReaderEnabled promise failed', error);
      });
    AccessibilityInfo.addEventListener('screenReaderChanged', handleChange);
    return () => {
      AccessibilityInfo.removeEventListener('screenReaderChanged', handleChange);
    };
  }, []);
  return screenReaderEnabled;
}
