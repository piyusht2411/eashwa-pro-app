import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Route, SearchX } from 'lucide-react-native';

import { getAllVisits } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import { formatCount } from '@/lib/format';
import SearchBar from '@/components/ui/SearchBar';
import VisitCard from '@/components/ui/VisitCard';
import EmptyState from '@/components/ui/EmptyState';
import type { Visit } from '@/types';

export default function AccountsVisitsScreen() {
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
      if (reset) { setVisits(res.visits); setPage(2); }
      else { setVisits(prev => [...prev, ...res.visits]); setPage(pg + 1); }
      setTotal(res.pagination.total);
      setHasMore(res.pagination.hasNextPage);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [token, search, page]);

  useEffect(() => { setLoading(true); load(true); }, [search]);

  // Refresh quietly on return, so edited or deleted visits show up as they are now.
  const focusedOnce = useRef(false);
  const loadRef = useRef(load);
  loadRef.current = load;
  useFocusEffect(useCallback(() => {
    if (focusedOnce.current) loadRef.current(true);
    focusedOnce.current = true;
  }, []));

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.titleRow}>
          <Text style={s.title}>Visits</Text>
          {!loading && total > 0 ? (
            <View style={s.countChip}><Text style={s.countText}>{formatCount(total)}</Text></View>
          ) : null}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => router.push('/(accounts)/create-visit' as any)}
            activeOpacity={0.88}
          >
            <Plus size={16} color={colors.white} strokeWidth={2.8} />
            <Text style={s.addBtnText}>New</Text>
          </TouchableOpacity>
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
              onPress={() => router.push({ pathname: '/(accounts)/visit-detail' as any, params: { id: item._id } })}
            />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
          onEndReached={() => { if (hasMore && !loadingMore) { setLoadingMore(true); load(); } }}
          onEndReachedThreshold={0.2}
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
                title="No visits yet"
                subtitle="Create the first visit to start tracking trips and expenses."
                actionLabel="Add a visit"
                onAction={() => router.push('/(accounts)/create-visit' as any)}
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
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  countText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.primaryDark },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...shadow.brand,
  },
  addBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  search: { marginTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['4xl'] },
});
