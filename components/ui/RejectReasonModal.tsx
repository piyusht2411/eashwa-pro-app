import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { XCircle } from 'lucide-react-native';

import { colors, fonts, radius, spacing } from '@/lib/theme';

/**
 * Cross-platform replacement for Alert.prompt (which is iOS-only and silently
 * does nothing on Android). Collects a mandatory rejection remark.
 */
export default function RejectReasonModal({
  visible,
  title = 'Reject Expense',
  message,
  submitting = false,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (remark: string) => void;
}) {
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');

  // Reset each time the sheet opens so a previous reason never leaks through.
  useEffect(() => {
    if (visible) { setRemark(''); setError(''); }
  }, [visible]);

  const submit = () => {
    if (!remark.trim()) { setError('Please enter a reason.'); return; }
    onSubmit(remark.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.card}>
          <View style={s.titleRow}>
            <XCircle size={18} color={colors.danger} />
            <Text style={s.title}>{title}</Text>
          </View>

          {message ? <Text style={s.message}>{message}</Text> : null}

          <TextInput
            style={[s.input, error ? s.inputError : null]}
            placeholder="Reason for rejection"
            placeholderTextColor={colors.textFaint}
            value={remark}
            onChangeText={(t) => { setRemark(t); if (error) setError(''); }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoFocus
            editable={!submitting}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <View style={s.actions}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={onCancel}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, submitting ? s.disabled : null]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={s.submitText}>Reject</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 400, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  message: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.md, minHeight: 80, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  inputError: { borderColor: colors.danger },
  error: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  submitBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.sm, backgroundColor: colors.danger },
  submitText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  disabled: { opacity: 0.6 },
});
