import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

const TABLE_TYPES = [
  { id: 'TABLE', label: 'Table' },
  { id: 'PRIVATE_ROOM', label: 'Private Room' },
  { id: 'WHOLE_VENUE', label: 'Whole Venue' },
];

export default function BookingScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const [tableType, setTableType] = useState('TABLE');
  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');

  const mutation = useMutation({
    mutationFn: async () => {
      const slotStart = new Date(`${date}T${time}:00`);
      const slotEnd = new Date(slotStart.getTime() + 90 * 60 * 1000);
      return apiClient.post('/bookings', {
        restaurantId,
        tableId: tableType, // in a full flow, an availability picker resolves this to a real Table.id
        partySize: Number(partySize),
        date: slotStart.toISOString(),
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString(),
      });
    },
    onSuccess: () => {
      Alert.alert('Booking confirmed', 'Your table has been booked.');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Could not book', err?.response?.data?.message ?? 'Please try a different time.');
    },
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>What are you booking?</Text>
      <View style={styles.row}>
        {TABLE_TYPES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTableType(t.id)}
            style={[styles.pill, tableType === t.id && styles.pillActive]}
          >
            <Text style={[styles.pillText, tableType === t.id && styles.pillTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Party size</Text>
      <TextInput
        value={partySize}
        onChangeText={setPartySize}
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput value={date} onChangeText={setDate} placeholder="2026-10-01" style={styles.input} />

      <Text style={styles.label}>Time</Text>
      <TextInput value={time} onChangeText={setTime} placeholder="19:00" style={styles.input} />

      <Pressable
        style={styles.submit}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending || !date}
      >
        <Text style={styles.submitText}>{mutation.isPending ? 'Booking...' : 'Confirm booking'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.sm },
  label: { fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textPrimary },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  submit: { backgroundColor: colors.accent, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  submitText: { color: '#fff', fontWeight: '700' },
});
