import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Route, SearchX } from 'lucide-react-native';

import { getAllVisits } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, spacing } from '@/lib/theme';
import { formatCount } from '@/lib/format';
import SearchBar from '@/components/ui/SearchBar';
import VisitCard from '@/components/ui/VisitCard';
import EmptyState from '@/components/ui/EmptyState';
import type { Visit } from '@/types';

export default function AdminVisitsScreen() {
  const { token } = useAuthStore();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (reset = false) => {
    if (!token) return;
    const pg = reset ? 1 : page;
    try {
      const res = await getAllVisits(token, { search, page: pg, limit: 20 });
      if (reset) {
        setVisits(res.visits);
        setPage(2);
      } else {
        setVisits(prev => [...prev, ...res.visits]);
        setPage(pg + 1);
      }
      setTotal(res.pagination.total);
      setHasMore(res.pagination.hasNextPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [token, search, page]);

  useEffect(() => { setLoading(true); load(true); }, [search]);

  const onRefresh = () => { setRefreshing(true); load(true); };
  const onEndReached = () => {
    if (hasMore && !loadingMore) { setLoadingMore(true); load(); }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.titleRow}>
          <Text style={s.title}>All Visits</Text>
          {!loading && total > 0 ? (
            <View style={s.countChip}>
              <Text style={s.countText}>{formatCount(total)}</Text>
            </View>
          ) : null}
        </View>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search destination, bill no, vehicle…"
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
              onPress={() => router.push({ pathname: '/(transport-admin)/visit-detail' as any, params: { id: item._id } })}
            />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.2}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            search ? (
              <EmptyState
                icon={<SearchX size={24} color={colors.primary} strokeWidth={2} />}
                title="No matching visits"
                subtitle={`Nothing found for “${search}”. Try a different destination, bill number or vehicle.`}
                actionLabel="Clear search"
                onAction={() => setSearch('')}
              />
            ) : (
              <EmptyState
                icon={<Route size={24} color={colors.primary} strokeWidth={2} />}
                title="No visits recorded"
                subtitle="Visits created by the accounts team will appear here."
              />
            )
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} /> : null}
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
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  countText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.primaryDark },
  search: { marginTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['4xl'] },
});
