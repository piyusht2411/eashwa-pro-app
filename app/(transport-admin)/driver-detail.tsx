import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Truck, MapPin, DollarSign, CheckCircle } from 'lucide-react-native';

import { getDriverSummary } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { DriverSummary, Visit } from '@/types';

export default function AdminDriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuthStore();
  const [data, setData] = useState<DriverSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await getDriverSummary(id, token);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SafeAreaView style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></SafeAreaView>;
  if (!data) return <SafeAreaView style={s.centered}><Text>Driver not found</Text></SafeAreaView>;

  const { driver, summary, recentVisits } = data;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}><ArrowLeft size={22} color={colors.white} /></TouchableOpacity>
        <View>
          <Text style={s.driverName}>{driver.name}</Text>
          <Text style={s.vehicle}>{driver.vehicleNumber}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={s.statsGrid}>
          <StatCard icon={<Truck size={18} color={colors.primary} />} label="Total Visits" value={summary.totalVisits} bg={colors.primarySoft} />
          <StatCard icon={<MapPin size={18} color={colors.info} />} label="Distance (km)" value={summary.totalDistance} bg={colors.infoSoft} />
          <StatCard icon={<DollarSign size={18} color={colors.warning} />} label="Total Expense" value={`₹${summary.totalExpense.toLocaleString('en-IN')}`} bg={colors.warningSoft} />
          <StatCard icon={<CheckCircle size={18} color={colors.success} />} label="Approved Reimb." value={`₹${summary.approvedReimbursement.toLocaleString('en-IN')}`} bg={colors.successSoft} />
        </View>

        <LinearGradient colors={[colors.primaryLight, colors.primary, colors.primaryDark]} style={s.balanceCard}>
          <Text style={s.balanceLabel}>Pending Reimbursement Balance</Text>
          <Text style={s.balanceAmount}>₹{summary.pendingReimbursement.toLocaleString('en-IN')}</Text>
        </LinearGradient>

        {/* Visits */}
        <Text style={s.sectionTitle}>Recent Visits</Text>
        {recentVisits.map(visit => (
          <TouchableOpacity
            key={visit._id}
            style={s.visitRow}
            onPress={() => router.push({ pathname: '/(transport-admin)/visit-detail' as any, params: { id: visit._id } })}
            activeOpacity={0.8}
          >
            <View style={s.visitLeft}>
              <Text style={s.visitDest}>{visit.destination}</Text>
              <Text style={s.visitMeta}>{new Date(visit.startDate).toLocaleDateString('en-IN')} · {visit.totalDays} days · {visit.distance} km</Text>
            </View>
          </TouchableOpacity>
        ))}
        {recentVisits.length === 0 && <Text style={s.empty}>No visits recorded</Text>}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <View style={s.statIcon}>{icon}</View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: 14, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  back: { padding: 4 },
  driverName: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white },
  vehicle: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: spacing.lg },
  statCard: { width: '47.5%', borderRadius: radius.lg, padding: spacing.lg, gap: 4, borderWidth: 1, borderColor: colors.borderSoft, ...shadow.sm },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadow.sm,
  },
  statValue: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.text },
  statLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary },
  balanceCard: { marginHorizontal: spacing.lg, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg, ...shadow.lg },
  balanceLabel: { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  balanceAmount: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.white, marginTop: 4 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  visitRow: { backgroundColor: colors.white, marginHorizontal: spacing.lg, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  visitLeft: { flex: 1 },
  visitDest: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  visitMeta: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  empty: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint, textAlign: 'center', padding: spacing['3xl'] },
});
