import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, ChevronRight, MapPin, Truck } from 'lucide-react-native';

import { getAllVisits } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Visit } from '@/types';

export default function AdminVisitsScreen() {
  const { token } = useAuthStore();
  const [visits, setVisits] = useState<Visit[]>([]);
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

  const renderItem = ({ item }: { item: Visit }) => {
    const driver = typeof item.driver === 'object' ? item.driver : null;
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/(transport-admin)/visit-detail' as any, params: { id: item._id } })}
      >
        <View style={s.cardHeader}>
          <View style={s.driverBadge}>
            <Truck size={14} color={colors.primary} />
            <Text style={s.driverName}>{driver?.name ?? '—'}</Text>
          </View>
          <Text style={s.vehicle}>{item.vehicleNumber}</Text>
        </View>
        <View style={s.cardRow}>
          <MapPin size={13} color={colors.textMuted} />
          <Text style={s.dest}>{item.destination}</Text>
        </View>
        <View style={s.cardFooter}>
          <Text style={s.meta}>{new Date(item.startDate).toLocaleDateString('en-IN')} – {new Date(item.endDate).toLocaleDateString('en-IN')}</Text>
          <Text style={s.meta}>{item.totalDays} days · {item.distance} km</Text>
          <ChevronRight size={16} color={colors.textFaint} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.title}>All Visits</Text>
      </View>
      <View style={s.searchWrap}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search destination, bill no..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={v => v._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No visits found</Text></View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  driverBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  vehicle: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  dest: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint },
});
