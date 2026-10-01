import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, fonts, radius, shadow } from "@/lib/theme";
import { useAuthStore } from "@/stores/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Mail } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const em = email.trim();
    const pass = password.trim();
    if (!em || !pass) {
      Alert.alert("Error", "Enter email and password");
      return;
    }
    if (!em.includes("@")) {
      Alert.alert("Error", "Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await login(em, pass);
      // On success the root guard moves to the right dashboard. Navigating from
      // here as well would fire a second, racing navigation.
      if (!res.success) {
        Alert.alert("Login Failed", res.error ?? "Invalid credentials");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, "#9A3412"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientHeader}
      />
      <View style={s.blob1} />
      <View style={s.blob2} />

      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <KeyboardAwareScrollView
          style={s.flex}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
            <View style={s.header}>
              <View style={s.logoWrap}>
                <View style={s.logoInner}>
                  <Image
                    source={require("../../assets/images/splash-icon.png")}
                    style={s.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={s.appName}>Eashwa PRO</Text>
              <Text style={s.tagline}>Production · Verification · Payment</Text>
            </View>

            <View style={s.formCard}>
              <Text style={s.welcome}>Welcome back</Text>
              <Text style={s.sub}>Sign in to continue to your dashboard</Text>

              <View style={{ height: 22 }} />

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                leftIcon={<Mail size={18} color={colors.textMuted} />}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                isPassword
                editable={!loading}
                leftIcon={<Lock size={18} color={colors.textMuted} />}
              />

              <View style={{ height: 6 }} />

              <Button
                title={loading ? "Signing in…" : "Sign In"}
                onPress={handleLogin}
                loading={loading}
                size="lg"
                fullWidth
              />
            </View>

            <Text style={s.footer}>Secure access · Powered by Eashwa</Text>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  gradientHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
  },
  blob1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  blob2: {
    position: "absolute",
    top: 120,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 32, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    padding: 6,
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  logoImage: {
    width: 50,
    height: 50,
  },
  appName: {
    fontFamily: fonts.extrabold,
    fontSize: 30,
    color: colors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
    marginTop: 4,
    letterSpacing: 1.2,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 24,
    marginTop: 18,
    ...(shadow.md as object),
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  welcome: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  footer: {
    textAlign: "center",
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 22,
    letterSpacing: 0.5,
  },
});
