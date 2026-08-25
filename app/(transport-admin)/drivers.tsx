import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, ChevronRight, Truck, Plus, X } from 'lucide-react-native';

import { getAllDrivers, createDriver } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import type { Driver } from '@/types';

export default function AdminDriversScreen() {
  const { token } = useAuthStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', vehicleNumber: '' });

  const load = useCallback(async (reset = true) => {
    if (!token) return;
    try {
      const res = await getAllDrivers(token, { search, limit: 50 });
      setDrivers(res.drivers);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, search]);

  useEffect(() => { setLoading(true); load(); }, [search]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.vehicleNumber.trim()) {
      Alert.alert('Required', 'Name and vehicle number are required');
      return;
    }
    if (!token) return;
    setCreating(true);
    try {
      await createDriver({ name: form.name.trim(), vehicleNumber: form.vehicleNumber.trim().toUpperCase() }, token);
      setForm({ name: '', vehicleNumber: '' });
      setShowCreate(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setCreating(false); }
  };

  const renderItem = ({ item }: { item: Driver }) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(transport-admin)/driver-detail' as any, params: { id: item._id } })}
    >
      <View style={s.avatar}>
        <Truck size={22} color={colors.primary} />
      </View>
      <View style={s.info}>
        <Text style={s.name}>{item.name}</Text>
        <Text style={s.vehicle}>{item.vehicleNumber}</Text>
        {!item.isActive && <Text style={s.inactive}>Inactive</Text>}
      </View>
      <ChevronRight size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.title}>Drivers</Text>
        <TouchableOpacity style={s.fab} onPress={() => setShowCreate(v => !v)} activeOpacity={0.85}>
          {showCreate ? <X size={18} color={colors.white} /> : <Plus size={18} color={colors.white} />}
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={s.createCard}>
          <Text style={s.createTitle}>Add New Driver</Text>
          <TextInput
            style={s.input}
            placeholder="Driver Name"
            placeholderTextColor={colors.textFaint}
            value={form.name}
            onChangeText={v => setForm(p => ({ ...p, name: v }))}
          />
          <TextInput
            style={s.input}
            placeholder="Vehicle Number (e.g. HR55AB9988)"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            value={form.vehicleNumber}
            onChangeText={v => setForm(p => ({ ...p, vehicleNumber: v }))}
          />
          <TouchableOpacity style={s.createBtn} onPress={handleCreate} disabled={creating} activeOpacity={0.85}>
            {creating ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={s.createBtnText}>Create Driver</Text>}
          </TouchableOpacity>
        </View>
      )}

      <View style={s.searchWrap}>
        <Search size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search drivers..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={d => d._id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
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
  fab: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.md },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, borderWidth: 1.5, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  info: { flex: 1 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  vehicle: { fontFamily: fonts.medium, fontSize: 12, color: colors.primary, marginTop: 2 },
  inactive: { fontFamily: fonts.medium, fontSize: 11, color: colors.danger, marginTop: 2 },
  createCard: { backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, padding: spacing.lg, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm },
  createTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, marginBottom: spacing.md },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.regular, fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  createBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', ...shadow.sm },
  createBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint },
});
