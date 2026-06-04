import { colors, fonts, radius } from "@/lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  leftIcon?: React.ReactNode;
}

export function GradientHeader({
  title,
  subtitle,
  showBack,
  right,
  leftIcon,
}: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.wrap, { paddingTop: insets.top + 14 }]}
    >
      <View style={s.row}>
        <View style={s.leftWrap}>
          {showBack ? (
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
              <ChevronLeft color={colors.white} size={20} />
            </Pressable>
          ) : leftIcon ? (
            <View style={s.iconChip}>{leftIcon}</View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            {subtitle ? (
              <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leftWrap: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
});
