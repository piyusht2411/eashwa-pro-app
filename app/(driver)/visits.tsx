import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Route, SearchX } from 'lucide-react-native';

import { getAllVisits } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, spacing } from '@/lib/theme';
import { formatCount } from '@/lib/format';
import SearchBar from '@/components/ui/SearchBar';
import VisitCard from '@/components/ui/VisitCard';
import EmptyState from '@/components/ui/EmptyState';
import type { Visit } from '@/types';

export default function DriverVisitsScreen() {
  const { token } = useAuthStore();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getAllVisits(token, { search, limit: 50 });
      setVisits(res.visits);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, search]);

  useEffect(() => { setLoading(true); load(); }, [search]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.titleRow}>
          <Text style={s.title}>My Visits</Text>
          {!loading && visits.length > 0 ? (
            <View style={s.countChip}><Text style={s.countText}>{formatCount(visits.length)}</Text></View>
          ) : null}
        </View>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search destination…"
          style={s.search}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={v => v._id}
          renderItem={({ item }) => (
            <VisitCard
              visit={item}
              showDriver={false}
              onPress={() => router.push({ pathname: '/(driver)/visit-detail' as any, params: { id: item._id } })}
            />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            search ? (
              <EmptyState
                icon={<SearchX size={24} color={colors.primary} strokeWidth={2} />}
                title="No matching visits"
                subtitle={`Nothing found for “${search}”.`}
                actionLabel="Clear search"
                onAction={() => setSearch('')}
              />
            ) : (
              <EmptyState
                icon={<Route size={24} color={colors.primary} strokeWidth={2} />}
                title="No visits assigned"
                subtitle="Your trips will show up here once the accounts team assigns them."
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
