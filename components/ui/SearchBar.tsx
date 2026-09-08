import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';

/** Search field with a clear affordance once there's text to clear. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.wrap, style]}>
      <Search size={16} color={colors.textMuted} strokeWidth={2.3} />
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={10} style={s.clear}>
          <X size={13} color={colors.textMuted} strokeWidth={2.6} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.xs,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  clear: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SearchBar;
