import React from 'react';
import {useStorage} from 'services/StorageService';
import {useI18n} from '@shopify/react-i18n';
import {Picker} from '@react-native-community/picker';

export const LanguageToggle = () => {
  const [i18n] = useI18n();
  const {setLocale} = useStorage();

  return (
    <Picker
      selectedValue={i18n.locale}
      style={{height: 50, width: 140}}
      onValueChange={itemValue => {
        setLocale(`${itemValue}`);
      }}
    >
      <Picker.Item label={i18n.translate('LanguageSelect.EnShort')} value="en" />
      <Picker.Item label={i18n.translate('LanguageSelect.FrShort')} value="fr" />
      <Picker.Item label={i18n.translate('LanguageSelect.PtShort')} value="pt" />
    </Picker>
  );
};
