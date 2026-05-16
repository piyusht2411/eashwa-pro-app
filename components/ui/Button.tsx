import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { colors, fonts, radius } from "@/lib/theme";

type Variant = "primary" | "outline" | "danger" | "success" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  onPress?: () => void;
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const sizeMap: Record<Size, { paddingVertical: number; paddingHorizontal: number; fontSize: number; borderRadius: number; gap: number }> = {
  sm: { paddingVertical: 9, paddingHorizontal: 14, fontSize: 13, borderRadius: radius.md, gap: 6 },
  md: { paddingVertical: 13, paddingHorizontal: 18, fontSize: 15, borderRadius: radius.lg, gap: 8 },
  lg: { paddingVertical: 16, paddingHorizontal: 22, fontSize: 16, borderRadius: radius.lg, gap: 10 },
};

export function Button({
  onPress,
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sz = sizeMap[size];

  const containerStyle: ViewStyle = {
    paddingVertical: sz.paddingVertical,
    paddingHorizontal: sz.paddingHorizontal,
    borderRadius: sz.borderRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sz.gap,
    width: fullWidth ? "100%" : undefined,
    opacity: isDisabled ? 0.55 : 1,
  };

  const textColor =
    variant === "outline" || variant === "ghost"
      ? colors.primary
      : variant === "soft"
        ? colors.primaryDark
        : colors.white;

  const renderInner = () => (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text style={{ color: textColor, fontFamily: fonts.bold, fontSize: sz.fontSize, letterSpacing: 0.2 }}>
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (variant === "primary") {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[{ borderRadius: sz.borderRadius }, style]}>
        <LinearGradient
          colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={containerStyle}
        >
          {renderInner()}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantBg: Partial<Record<Variant, ViewStyle>> = {
    outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
    danger: { backgroundColor: colors.danger },
    success: { backgroundColor: colors.success },
    ghost: { backgroundColor: "transparent" },
    soft: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder },
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[containerStyle, variantBg[variant], style]}
    >
      {renderInner()}
    </Pressable>
  );
}

const _styles = StyleSheet.create({});
