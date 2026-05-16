import React from "react";
import { StyleSheet, View, ViewProps, ViewStyle } from "react-native";

import { colors, radius, shadow } from "@/lib/theme";

interface CardProps extends ViewProps {
  variant?: "default" | "elevated" | "soft" | "outlined";
  padding?: number;
  style?: ViewStyle | ViewStyle[];
}

export function Card({
  variant = "default",
  padding = 16,
  style,
  children,
  ...rest
}: CardProps) {
  const variantStyle: ViewStyle =
    variant === "elevated"
      ? { backgroundColor: colors.surface, ...(shadow.md as ViewStyle) }
      : variant === "soft"
        ? { backgroundColor: colors.primarySofter, borderWidth: 1, borderColor: colors.primaryBorder }
        : variant === "outlined"
          ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
          : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border };

  return (
    <View
      style={[
        styles.base,
        { padding },
        variantStyle,
        ...(Array.isArray(style) ? style : style ? [style] : []),
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
  },
});
