import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, ChevronRight, MapPin, Truck } from 'lucide-react-native';

import { getAllVisits } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Visit } from '@/types';

export default function DriverVisitsScreen() {
  const { token } = useAuthStore();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (reset = true) => {
    if (!token) return;
    try {
      const res = await getAllVisits(token, { search, limit: 50 });
      setVisits(res.visits);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, search]);

  useEffect(() => { setLoading(true); load(); }, [search]);

  const renderItem = ({ item }: { item: Visit }) => (
    <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={() => router.push({ pathname: '/(driver)/visit-detail' as any, params: { id: item._id } })}>
      <View style={s.cardHeader}>
        <View style={s.dest}><MapPin size={14} color={colors.primary} /><Text style={s.destText}>{item.destination}</Text></View>
        <Text style={s.vehicle}>{item.vehicleNumber}</Text>
      </View>
      <Text style={s.dates}>{new Date(item.startDate).toLocaleDateString('en-IN')} – {new Date(item.endDate).toLocaleDateString('en-IN')}</Text>
      <View style={s.cardFooter}>
        <Text style={s.meta}>{item.totalDays} days</Text>
        <Text style={s.metaDot}>·</Text>
        <Text style={s.meta}>{item.distance} km</Text>
        <Text style={s.metaDot}>·</Text>
        <Text style={s.meta}>Qty {item.quantity}</Text>
        <ChevronRight size={16} color={colors.textFaint} style={{ marginLeft: 'auto' }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.title}>My Visits</Text>
      </View>
      <View style={s.searchWrap}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Search destination..." placeholderTextColor={colors.textFaint} value={search} onChangeText={setSearch} />
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} /> : (
        <FlatList
          data={visits}
          keyExtractor={v => v._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No visits assigned</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSubtle },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  title: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, borderWidth: 1.5, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dest: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  destText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  vehicle: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  dates: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  metaDot: { fontFamily: fonts.medium, fontSize: 12, color: colors.textFaint },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint },
});
