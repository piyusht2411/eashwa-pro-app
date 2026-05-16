import { Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import { colors, fonts, radius } from "@/lib/theme";

interface InputProps extends TextInputProps {
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  hint?: string;
  error?: string;
}

export function Input({
  label,
  leftIcon,
  rightIcon,
  isPassword,
  containerStyle,
  hint,
  error,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const secure = isPassword ? !show : props.secureTextEntry;

  return (
    <View style={[{ marginBottom: 14 }, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && { borderColor: colors.primary, backgroundColor: colors.white },
          error ? { borderColor: colors.danger } : null,
        ]}
      >
        {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
        <TextInput
          {...props}
          secureTextEntry={secure}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={colors.textFaint}
          style={[styles.input, style]}
        />
        {isPassword ? (
          <Pressable onPress={() => setShow((p) => !p)} hitSlop={8} style={styles.right}>
            {show ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.right}>{rightIcon}</View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  right: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  hint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textFaint,
  },
  error: {
    marginTop: 6,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.danger,
  },
});
