import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, LogOut, Mail } from 'lucide-react-native';

import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, gradients, radius, shadow, spacing } from '@/lib/theme';

export type ProfileMenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
};

/** Initials from a name: "Ravi Kumar" → "RK". */
function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Shared "More" / profile screen for every transport role.
 *
 * Deliberately shows name and email only — role labels were removed from the
 * app, so the header carries identity, not permissions.
 */
export function ProfileScreen({
  sections = [],
}: {
  sections?: { title: string; items: ProfileMenuItem[] }[];
}) {
  const { user, logout } = useAuthStore();

  const handleLogout = () =>
    Alert.alert('Log out', 'You will need to sign in again to continue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        // Clearing the session is enough — the root guard shows the login screen.
        onPress: () => { void logout(); },
      },
    ]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradients.brandDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
          <View style={s.blob} pointerEvents="none" />
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(user?.name)}</Text>
          </View>
          <Text style={s.name} numberOfLines={1}>{user?.name ?? '—'}</Text>
          {user?.email ? (
            <View style={s.emailChip}>
              <Mail size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.2} />
              <Text style={s.emailText} numberOfLines={1}>{user.email}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={s.body}>
          {sections.map(section => (
            <View key={section.title}>
              <Text style={s.sectionLabel}>{section.title}</Text>
              <View style={s.card}>
                {section.items.map((item, i) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.menuItem, i === section.items.length - 1 && s.menuItemLast]}
                    onPress={item.onPress}
                    activeOpacity={0.8}
                  >
                    <View style={s.menuIcon}>{item.icon}</View>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    <ChevronRight size={17} color={colors.textFaint} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={17} color={colors.danger} strokeWidth={2.3} />
            <Text style={s.logoutText}>Log out</Text>
          </TouchableOpacity>

          <Text style={s.footer}>Eashwa PRO</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  scroll: { paddingBottom: spacing['4xl'] },

  header: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 27, letterSpacing: 0.5, color: colors.white },
  name: { fontFamily: fonts.extrabold, fontSize: 21, letterSpacing: -0.4, color: colors.white },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '90%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginTop: spacing.sm,
  },
  emailText: { fontFamily: fonts.medium, fontSize: 12, color: colors.white },

  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
    ...shadow.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14.5, color: colors.text },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing['2xl'],
    paddingVertical: 15,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.danger },

  footer: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.textFaint,
    marginTop: spacing.xl,
  },
});

export default ProfileScreen;
