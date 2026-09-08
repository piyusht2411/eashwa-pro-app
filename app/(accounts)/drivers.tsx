// Accounts drivers screen — view-only (no create driver for account role)
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SearchX, Users } from 'lucide-react-native';

import { getAllDrivers } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { formatCount } from '@/lib/format';
import SearchBar from '@/components/ui/SearchBar';
import DriverCard from '@/components/ui/DriverCard';
import EmptyState from '@/components/ui/EmptyState';
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

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.titleRow}>
          <Text style={s.title}>Drivers</Text>
          {!loading && drivers.length > 0 ? (
            <View style={s.countChip}><Text style={s.countText}>{formatCount(drivers.length)}</Text></View>
          ) : null}
        </View>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or vehicle…"
          style={s.search}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={d => d._id}
          renderItem={({ item }) => (
            <DriverCard
              driver={item}
              onPress={() => router.push({ pathname: '/(accounts)/driver-detail' as any, params: { id: item._id } })}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            search ? (
              <EmptyState
                icon={<SearchX size={24} color={colors.primary} strokeWidth={2} />}
                title="No matching drivers"
                subtitle={`Nothing found for “${search}”.`}
                actionLabel="Clear search"
                onAction={() => setSearch('')}
              />
            ) : (
              <EmptyState
                icon={<Users size={24} color={colors.primary} strokeWidth={2} />}
                title="No drivers yet"
                subtitle="Drivers added by the admin will appear here."
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  countChip: {
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  countText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.primaryDark },
  search: { marginTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['4xl'] },
});
