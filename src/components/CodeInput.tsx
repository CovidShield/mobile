import React, {useCallback, useRef} from 'react';
import {TextInput, TouchableWithoutFeedback, StyleSheet} from 'react-native';

import {Box} from './Box';
import {Text} from './Text';

const inputBorderColor = (string: string, position: number) => {
  // active
  if (!string[position] && Boolean(string[position - 1])) return 'infoBlockBrightText';
  // first
  if (string.length === 0 && position === 0) return 'infoBlockBrightText';
  // empty
  if (!string[position]) return 'overlayBodyText';
  // filled
  return 'fadedBackground';
};

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export const CodeInput = ({value, onChange, autoFocus}: CodeInputProps) => {
  const inputRef = useRef<TextInput>(null);
  const onChangeTrimmed = useCallback(text => onChange(text.trim()), [onChange]);

  const displayValue = useCallback(
    () =>
      Array(8)
        .fill(null)
        .map((_, x) => {
          const characterToDisplay = value[x] || ' ';
          return (
            <Box
              /* eslint-disable-next-line react/no-array-index-key */
              key={`input-${x}`}
              flex={1}
              marginHorizontal="xs"
              borderBottomWidth={1.5}
              borderBottomColor={inputBorderColor(value, x)}
            >
              <Text variant="codeInput" color="overlayBodyText" textAlign="center" marginBottom="s">
                {characterToDisplay}
              </Text>
            </Box>
          );
        }),
    [value],
  );

  const giveFocus = useCallback(() => inputRef.current?.focus(), []);

  return (
    <>
      <TextInput
        value={value}
        ref={inputRef}
        onChangeText={onChangeTrimmed}
        keyboardType="number-pad"
        autoCorrect={false}
        autoCompleteType="off"
        returnKeyType="done"
        maxLength={8}
        style={styles.input}
        autoFocus={autoFocus}
      />
      <TouchableWithoutFeedback onPress={giveFocus}>
        <Box flexDirection="row" justifyContent="space-evenly" marginHorizontal="m">
          {displayValue()}
        </Box>
      </TouchableWithoutFeedback>
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 0,
    width: 0,
  },
});
