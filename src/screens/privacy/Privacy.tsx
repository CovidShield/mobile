import React, {useCallback} from 'react';
import {Linking, ScrollView, StyleSheet, Text, TouchableWithoutFeedback} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Box, Toolbar} from 'components';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useI18n} from '@shopify/react-i18n';
import Markdown, {RenderRules, RenderFunction} from 'react-native-markdown-display';
import privacyPolicyEn from 'assets/privacypolicy';
import privacyPolicyFr from 'assets/privacypolicy-fr';

export const PrivacyScreen = () => {
  const navigation = useNavigation();
  const [i18n] = useI18n();
  const close = useCallback(() => navigation.goBack(), [navigation]);

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  const renderHeader: RenderFunction = (node, children, styles: any) => (
    <Text key={node.key} style={[styles.heading, styles.heading1]} accessibilityRole="header">
      {children}
    </Text>
  );

  const renderLink: RenderFunction = (node: any, children: React.ReactNode[], styles: any) => (
    <TouchableWithoutFeedback
      key={node.key}
      style={styles.link}
      onPress={() => openUrl(node.attributes.href)}
      accessibilityLabel={children.toString()}
      accessibilityHint={i18n.translate('Home.ExternalLinkHint')}
      accessibilityRole="link"
    >
      <Text style={styles.link}>{children}</Text>
    </TouchableWithoutFeedback>
  );

  const rules: RenderRules = {
    link: renderLink,
    heading1: renderHeader,
  };

  return (
    <Box backgroundColor="overlayBackground" flex={1}>
      <SafeAreaView style={styles.flex}>
        <Toolbar
          title={i18n.translate('Privacy.Title')}
          navIcon="icon-back-arrow"
          navText={i18n.translate('Privacy.Close')}
          navLabel={i18n.translate('Privacy.Close')}
          onIconClicked={close}
        />
        <ScrollView style={styles.flex}>
          <Box padding="m">
            <Markdown
              style={{
                body: styles.bodyContent,
              }}
              rules={rules}
            >
              {i18n.locale === 'en' ? privacyPolicyEn : privacyPolicyFr}
            </Markdown>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  bodyContent: {
    fontFamily: 'Nunito',
  },
});
