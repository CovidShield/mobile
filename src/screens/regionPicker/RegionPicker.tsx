import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {Box, Text, Icon, Button} from 'components';
import {StyleSheet, TouchableOpacity, ScrollView, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStorage} from 'services/StorageService';
import {useI18n} from '@shopify/react-i18n';
import GsuFlag from 'assets/flags/gsu-flag.png';
import GstFlag from 'assets/flags/gst-flag.png';
import GtFlag from 'assets/flags/gt-flag.png';
import KsuFlag from 'assets/flags/ksu-flag.png';
import UgaFlag from 'assets/flags/uga-flag.png';
import UwgFlag from 'assets/flags/uwg-flag.png';
import VsuFlag from 'assets/flags/vsu-flag.png';
import {Region} from 'shared/Region';

interface RegionItemProps {
  code: Region;
  flagIcon: any;
  name: string;
  selected: boolean;
  onPress: (code: Region) => void;
}

const items: Omit<RegionItemProps, 'onPress' | 'selected' | 'name'>[] = [
  {code: 'GSU', flagIcon: GsuFlag},
  {code: 'GST', flagIcon: GstFlag},
  {code: 'GT', flagIcon: GtFlag},
  {code: 'KSU', flagIcon: KsuFlag},
  {code: 'UGA', flagIcon: UgaFlag},
  {code: 'UWG', flagIcon: UwgFlag},
  {code: 'VSU', flagIcon: VsuFlag},
];

const RegionItem_ = ({code, onPress, name, flagIcon, selected}: RegionItemProps) => (
  <>
    <TouchableOpacity onPress={() => onPress(code)} accessibilityRole="radio" accessibilityState={{selected}}>
      <Box paddingVertical="s" flexDirection="row" alignContent="center" justifyContent="space-between">
        <Box flexDirection="row" alignItems="center" paddingVertical="s">
          <Image source={flagIcon} style={styles.flag} />
          <Text variant="bodyText" color="overlayBodyText" marginHorizontal="m">
            {name}
          </Text>
        </Box>
        <Box alignSelf="center">{selected && <Icon size={32} name="icon-check" />}</Box>
      </Box>
    </TouchableOpacity>
    <Box height={1} marginHorizontal="-m" backgroundColor="overlayBackground" />
  </>
);
const RegionItem = React.memo(RegionItem_);

export const RegionPickerScreen = () => {
  const [i18n] = useI18n();
  const {setRegion: persistRegion} = useStorage();
  const [selectedRegion, setSelectedRegion] = useState<Region>('None');
  const {navigate} = useNavigation();

  return (
    <Box flex={1} backgroundColor="overlayBackground">
      <SafeAreaView style={styles.flex}>
        <ScrollView style={styles.flex}>
          <Box flex={1} paddingHorizontal="m" paddingTop="m">
            <Text variant="bodySubTitle" color="overlayBodyText" textAlign="center" accessibilityRole="header">
              {i18n.translate('RegionPicker.Title')}
            </Text>
            <Text marginVertical="m" variant="bodyText" color="overlayBodyText" textAlign="center">
              {i18n.translate('RegionPicker.Body')}
            </Text>
            <Box
              paddingHorizontal="m"
              borderRadius={10}
              backgroundColor="infoBlockNeutralBackground"
              accessibilityRole="radiogroup"
            >
              {items.map(item => {
                return (
                  <RegionItem
                    key={item.code}
                    selected={selectedRegion === item.code}
                    onPress={setSelectedRegion}
                    name={i18n.translate(`RegionPicker.${item.code}`)}
                    {...item}
                  />
                );
              })}
            </Box>
          </Box>
        </ScrollView>
        <Box
          backgroundColor="overlayBackground"
          padding="m"
          shadowColor="infoBlockNeutralBackground"
          shadowOffset={{width: 0, height: 2}}
          shadowOpacity={0.5}
          shadowRadius={2}
          elevation={10}
        >
          <Button
            text={i18n.translate(`RegionPicker.${selectedRegion === 'None' ? 'Skip' : 'GetStarted'}`)}
            variant={selectedRegion === 'None' ? 'bigHollow' : 'bigFlat'}
            onPress={async () => {
              await persistRegion(selectedRegion);
              navigate('OnboardingTutorial');
            }}
          />
        </Box>
      </SafeAreaView>
    </Box>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  flag: {
    width: 40,
    height: 22,
    resizeMode: 'stretch',
  },
});
