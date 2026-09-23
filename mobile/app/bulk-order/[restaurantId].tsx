import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '@/utils/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

const ORDER_TYPES = ['WEDDING', 'BIRTHDAY', 'CORPORATE', 'DONATION', 'OTHER'] as const;

export default function BulkOrderScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const [type, setType] = useState<(typeof ORDER_TYPES)[number]>('WEDDING');
  const [guestCount, setGuestCount] = useState('50');
  const [eventDate, setEventDate] = useState('');
  const [eventAddress, setEventAddress] = useState('');
  const [eventCity, setEventCity] = useState('');
  const [packageId, setPackageId] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/bulk-orders', {
        restaurantId,
        packageId,
        type,
        guestCount: Number(guestCount),
        eventDate: new Date(eventDate).toISOString(),
        eventAddress,
        eventCity,
      }),
    onSuccess: () => {
      Alert.alert('Order submitted', 'Complete payment to secure your slot — a 10% platform fee applies.');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Could not place order', err?.response?.data?.message ?? 'Please check the details.');
    },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Bulk / event order rules</Text>
        <Text style={styles.noticeText}>
          • Must be placed at least 3 days (72 hours) before your event{'\n'}
          • Restaurant must be located in the same city as your event/delivery address{'\n'}
          • Full payment is required upfront to secure your slot{'\n'}
          • A 10% platform fee is included in the total charged to the restaurant's payout
        </Text>
      </View>

      <Text style={styles.label}>Order type</Text>
      <View style={styles.row}>
        {ORDER_TYPES.map((t) => (
          <Pressable key={t} onPress={() => setType(t)} style={[styles.pill, type === t && styles.pillActive]}>
            <Text style={[styles.pillText, type === t && styles.pillTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Bulk order package ID</Text>
      <TextInput value={packageId} onChangeText={setPackageId} placeholder="package-uuid" style={styles.input} />

      <Text style={styles.label}>Guest count</Text>
      <TextInput value={guestCount} onChangeText={setGuestCount} keyboardType="number-pad" style={styles.input} />

      <Text style={styles.label}>Event date (must be 3+ days out)</Text>
      <TextInput value={eventDate} onChangeText={setEventDate} placeholder="2026-10-05" style={styles.input} />

      <Text style={styles.label}>Event / delivery address</Text>
      <TextInput value={eventAddress} onChangeText={setEventAddress} style={styles.input} />

      <Text style={styles.label}>Event city (must match restaurant's city)</Text>
      <TextInput value={eventCity} onChangeText={setEventCity} style={styles.input} />

      <Pressable style={styles.submit} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        <Text style={styles.submitText}>
          {mutation.isPending ? 'Submitting...' : 'Continue to payment (full amount)'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  notice: { backgroundColor: '#FFF4E5', borderRadius: radii.md, padding: spacing.md, gap: 4 },
  noticeTitle: { fontWeight: '700', color: colors.textPrimary },
  noticeText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  label: { fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textPrimary, fontSize: 12 },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  submit: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  submitText: { color: '#fff', fontWeight: '700' },
});
