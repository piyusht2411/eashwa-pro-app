// Accounts drivers screen — view-only (no create driver for account role)
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, ChevronRight, Truck } from 'lucide-react-native';

import { getAllDrivers } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Driver } from '@/types';

export default function AccountsDriversScreen() {
  const { token } = useAuthStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try { const res = await getAllDrivers(token, { search, limit: 50 }); setDrivers(res.drivers); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, search]);

  useEffect(() => { setLoading(true); load(); }, [search]);

  const renderItem = ({ item }: { item: Driver }) => (
    <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(accounts)/driver-detail' as any, params: { id: item._id } })}>
      <View style={s.avatar}><Truck size={22} color={colors.primary} /></View>
      <View style={s.info}><Text style={s.name}>{item.name}</Text><Text style={s.vehicle}>{item.vehicleNumber}</Text></View>
      <ChevronRight size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.title}>Drivers</Text>
      </View>

      <View style={s.searchWrap}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Search..." placeholderTextColor={colors.textFaint} value={search} onChangeText={setSearch} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} /> : (
        <FlatList data={drivers} keyExtractor={d => d._id} renderItem={renderItem} contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No drivers found</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, borderWidth: 1.5, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  info: { flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  vehicle: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint },
});
