import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Plus, SearchX, Truck, UserPlus, Users, X } from 'lucide-react-native';

import { getAllDrivers, createDriver } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, radius, shadow, spacing } from '@/lib/theme';
import { formatCount } from '@/lib/format';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import SearchBar from '@/components/ui/SearchBar';
import DriverCard from '@/components/ui/DriverCard';
import EmptyState from '@/components/ui/EmptyState';
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

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getAllDrivers(token, { search, limit: 50 });
      setDrivers(res.drivers);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, search]);

  useEffect(() => { setLoading(true); load(); }, [search]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Driver name is required');
      return;
    }
    if (!token) return;
    setCreating(true);
    try {
      // Vehicle number is optional — it can be assigned later.
      await createDriver({ name: form.name.trim(), vehicleNumber: form.vehicleNumber.trim().toUpperCase() }, token);
      setForm({ name: '', vehicleNumber: '' });
      setShowCreate(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setCreating(false); }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.titleRow}>
          <Text style={s.title}>Drivers</Text>
          {!loading && drivers.length > 0 ? (
            <View style={s.countChip}><Text style={s.countText}>{formatCount(drivers.length)}</Text></View>
          ) : null}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[s.addBtn, showCreate && s.addBtnActive]}
            onPress={() => setShowCreate(v => !v)}
            activeOpacity={0.88}
          >
            {showCreate ? (
              <>
                <X size={15} color={colors.textSecondary} strokeWidth={2.8} />
                <Text style={s.addBtnTextActive}>Cancel</Text>
              </>
            ) : (
              <>
                <Plus size={15} color={colors.white} strokeWidth={2.8} />
                <Text style={s.addBtnText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {!showCreate ? (
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or vehicle…"
            style={s.search}
          />
        ) : null}
      </View>

      {/* Android draws edge-to-edge, so the window does not shrink on its own
          when the keyboard opens. Shrinking this region keeps the create form
          and its button clear of it. */}
      <KeyboardAvoidingView style={s.flex} behavior="padding">
      {showCreate && (
        <View style={s.createCard}>
          <View style={s.createHead}>
            <View style={s.createIcon}>
              <UserPlus size={16} color={colors.primaryDark} strokeWidth={2.3} />
            </View>
            <Text style={s.createTitle}>Add New Driver</Text>
          </View>

          <Text style={s.fieldLabel}>Driver Name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Ravi Kumar"
            placeholderTextColor={colors.textFaint}
            value={form.name}
            onChangeText={v => setForm(p => ({ ...p, name: v }))}
          />

          <View style={s.labelRow}>
            <Text style={s.fieldLabel}>Vehicle Number</Text>
            <Text style={s.optional}>Optional</Text>
          </View>
          <View style={s.inputWithIcon}>
            <Truck size={15} color={colors.textMuted} strokeWidth={2.2} />
            <TextInput
              style={s.inputInner}
              placeholder="Can be assigned later"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              value={form.vehicleNumber}
              onChangeText={v => setForm(p => ({ ...p, vehicleNumber: v }))}
            />
          </View>

          <TouchableOpacity
            style={[s.createBtn, creating && s.createBtnDisabled]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.88}
          >
            {creating
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.createBtnText}>Create Driver</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={d => d._id}
          renderItem={({ item }) => (
            <DriverCard
              driver={item}
              onPress={() => router.push({ pathname: '/(transport-admin)/driver-detail' as any, params: { id: item._id } })}
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
                subtitle="Add your first driver to start assigning visits."
                actionLabel="Add a driver"
                onAction={() => setShowCreate(true)}
              />
            )
          }
        />
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
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
  addBtnActive: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  addBtnText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
  addBtnTextActive: { fontFamily: fonts.bold, fontSize: 13, color: colors.textSecondary },
  search: { marginTop: spacing.md },

  createCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.md,
  },
  createHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  createIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  optional: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.textFaint,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bgMuted,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgMuted,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    letterSpacing: 0.4,
    color: colors.text,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadow.brand,
  },
  createBtnDisabled: { opacity: 0.7 },
  createBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },

  list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing['4xl'] },
});
