import React, {useCallback, useRef, useEffect, useMemo} from 'react';
import {View, StyleSheet, TouchableOpacity, useWindowDimensions} from 'react-native';
import Animated from 'react-native-reanimated';
import {useSafeArea} from 'react-native-safe-area-context';
import BottomSheetRaw from 'reanimated-bottom-sheet';
import {useI18n} from '@shopify/react-i18n';

import {Box} from '../Box';
import {Icon} from '../Icon';

import {SheetContentsContainer} from './SheetContentsContainer';

const {abs, sub, pow} = Animated;

export interface BottomSheetProps {
  collapsed?: React.ComponentType;
  content: React.ComponentType;
  extraContent?: boolean;
  isExpanded: boolean;
  setIsExpanded: (bool: boolean) => void;
}

const BottomSheet = ({
  content: ContentComponent,
  collapsed: CollapsedComponent,
  extraContent,
  isExpanded,
  setIsExpanded,
}: BottomSheetProps) => {
  const bottomSheetPosition = useRef(new Animated.Value(1));
  const bottomSheetRef: React.Ref<BottomSheetRaw> = useRef(null);
  // const [isExpanded, setIsExpanded] = useState(false);
  const [i18n] = useI18n();
  const toggleExpanded = useCallback(() => {
    if (isExpanded) {
      bottomSheetRef.current?.snapTo(1);
    } else {
      bottomSheetRef.current?.snapTo(0);
    }
  }, [isExpanded]);

  const insets = useSafeArea();
  const renderHeader = useCallback(() => <Box height={insets.top} />, [insets.top]);

  const onOpenEnd = useCallback(() => setIsExpanded(true), []);
  const onCloseEnd = useCallback(() => setIsExpanded(false), []);

  const {width, height} = useWindowDimensions();
  const snapPoints = [height, Math.max(width, height) * (extraContent ? 0.3 : 0.2)];

  // Need to add snapPoints to set enough height when BottomSheet is collapsed
  useEffect(() => {
    bottomSheetRef.current?.snapTo(isExpanded ? 0 : 1);
  }, [width, isExpanded, snapPoints]);

  const expandedContentWrapper = useMemo(
    () => (
      <Animated.View style={{opacity: abs(sub(bottomSheetPosition.current, 1))}}>
        <ContentComponent />
        <TouchableOpacity
          onPress={toggleExpanded}
          style={styles.collapseButton}
          accessibilityLabel={i18n.translate('BottomSheet.Collapse')}
          accessibilityRole="button"
        >
          <Icon name="icon-chevron" />
        </TouchableOpacity>
      </Animated.View>
    ),
    [i18n, toggleExpanded],
  );
  const collapsedContentWrapper = useMemo(
    () => (
      <Animated.View style={{...styles.collapseContent, opacity: pow(bottomSheetPosition.current, 2)}}>
        <View style={styles.collapseContentHandleBar}>
          <Icon name="sheet-handle-bar" />
        </View>
        {CollapsedComponent ? <CollapsedComponent /> : null}
      </Animated.View>
    ),
    [CollapsedComponent],
  );

  const renderContent = useCallback(() => {
    return (
      <SheetContentsContainer isExpanded={isExpanded} toggleExpanded={toggleExpanded}>
        <>
          {collapsedContentWrapper}
          {expandedContentWrapper}
        </>
      </SheetContentsContainer>
    );
  }, [collapsedContentWrapper, expandedContentWrapper, isExpanded, toggleExpanded]);

  return (
    <>
      <BottomSheetRaw
        ref={bottomSheetRef}
        borderRadius={32}
        enabledContentGestureInteraction
        renderContent={renderContent}
        onOpenEnd={onOpenEnd}
        onCloseEnd={onCloseEnd}
        onCloseStart={onCloseEnd}
        renderHeader={renderHeader}
        snapPoints={snapPoints}
        initialSnap={1}
        callbackNode={bottomSheetPosition.current}
        enabledInnerScrolling
      />
      <Box height={snapPoints[1]} style={styles.spacer} />
    </>
  );
};

const styles = StyleSheet.create({
  collapseContent: {
    position: 'absolute',
    width: '100%',
  },
  collapseContentHandleBar: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    top: -24,
  },
  collapseButton: {
    position: 'absolute',
    top: 0,
    right: 15,
    height: 30,
    width: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{rotate: '90deg'}],
  },
  spacer: {
    marginBottom: -18,
  },
});

export default BottomSheet;
