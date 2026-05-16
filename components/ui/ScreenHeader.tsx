import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius } from "@/lib/theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  variant?: "gradient" | "plain";
}

export function ScreenHeader({
  title,
  subtitle,
  showBack,
  right,
  variant = "plain",
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (variant === "gradient") {
    return (
      <LinearGradient
        colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.row}>
          <View style={styles.leftWrap}>
            {showBack ? (
              <Pressable
                onPress={() => router.back()}
                style={styles.backBtnLight}
                hitSlop={10}
              >
                <ChevronLeft size={20} color={colors.white} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.white }]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: "rgba(255,255,255,0.85)" }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          {right ? <View>{right}</View> : null}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.plain, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        <View style={styles.leftWrap}>
          {showBack ? (
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
              <ChevronLeft size={20} color={colors.text} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  plain: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnLight: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
