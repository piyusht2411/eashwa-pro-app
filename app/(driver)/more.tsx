import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';

export default function DriverMoreScreen() {
  const { user, logout } = useAuthStore();
  const handleLogout = () => Alert.alert('Logout', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
  ]);
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={[colors.white, colors.bgMuted]} style={s.header}>
        <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} style={s.avatar}>
          <Text style={s.avatarText}>{user?.name?.[0] ?? 'D'}</Text>
        </LinearGradient>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.role}>Driver</Text>
        <Text style={s.email}>{user?.email}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.infoCard}>
          <Text style={s.infoCardTitle}>Your Account</Text>
          <View style={s.infoRow}><Text style={s.infoLabel}>Name</Text><Text style={s.infoValue}>{user?.name ?? '—'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Email</Text><Text style={s.infoValue}>{user?.email ?? '—'}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Role</Text><Text style={s.infoValue}>Driver (View Only)</Text></View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={18} color={colors.danger} />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  header: { alignItems: 'center', paddingVertical: spacing['3xl'], borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, ...shadow.md },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.white },
  name: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  role: { fontFamily: fonts.medium, fontSize: 13, color: colors.success, marginTop: 3 },
  email: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  body: { padding: spacing.lg },
  infoCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  infoCardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  infoLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  infoValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.dangerBorder, backgroundColor: colors.dangerSoft },
  logoutText: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
});
