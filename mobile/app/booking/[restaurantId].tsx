import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

interface AvailabilityResponse {
  date: string;
  tables: {
    id: string;
    name: string;
    type: 'TABLE' | 'PRIVATE_ROOM' | 'WHOLE_VENUE';
    capacity: number;
    bookedSlots: { slotStart: string; slotEnd: string }[];
  }[];
}

const BOOKING_DURATION_MS = 90 * 60 * 1000;

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

export default function BookingScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();
  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const { data: availability, isFetching } = useQuery({
    queryKey: ['availability', restaurantId, date],
    queryFn: async () =>
      (await apiClient.get<AvailabilityResponse>(`/restaurants/${restaurantId}/availability`, { params: { date } })).data,
    enabled: !!date,
  });

  const slotStart = date && time ? new Date(`${date}T${time}:00`) : null;
  const slotEnd = slotStart ? new Date(slotStart.getTime() + BOOKING_DURATION_MS) : null;

  const availableTables = useMemo(() => {
    if (!availability || !slotStart || !slotEnd) return availability?.tables ?? [];
    return availability.tables.filter(
      (table) =>
        !table.bookedSlots.some((slot) =>
          overlaps(slotStart.getTime(), slotEnd.getTime(), new Date(slot.slotStart).getTime(), new Date(slot.slotEnd).getTime()),
        ),
    );
  }, [availability, slotStart, slotEnd]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedTableId || !slotStart || !slotEnd) throw new Error('Select a date, time, and table first');
      return apiClient.post('/bookings', {
        restaurantId,
        tableId: selectedTableId,
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
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
      <Text style={styles.label}>Party size</Text>
      <TextInput value={partySize} onChangeText={setPartySize} keyboardType="number-pad" style={styles.input} />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        value={date}
        onChangeText={(v) => {
          setDate(v);
          setSelectedTableId(null);
        }}
        placeholder="2026-10-01"
        style={styles.input}
      />

      <Text style={styles.label}>Time</Text>
      <TextInput
        value={time}
        onChangeText={(v) => {
          setTime(v);
          setSelectedTableId(null);
        }}
        placeholder="19:00"
        style={styles.input}
      />

      {!!date && (
        <>
          <Text style={styles.label}>Available tables</Text>
          {isFetching && <Text style={styles.helper}>Checking availability...</Text>}
          {!isFetching && availableTables.length === 0 && (
            <Text style={styles.helper}>No tables free at this time — try a different slot.</Text>
          )}
          <View style={styles.tableList}>
            {availableTables.map((table) => (
              <Pressable
                key={table.id}
                onPress={() => setSelectedTableId(table.id)}
                style={[styles.tableCard, selectedTableId === table.id && styles.tableCardSelected]}
              >
                <Text style={styles.tableName}>{table.name}</Text>
                <Text style={styles.tableMeta}>
                  {table.type.replace('_', ' ')} · seats {table.capacity}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Pressable
        style={[styles.submit, !selectedTableId && styles.submitDisabled]}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending || !selectedTableId}
      >
        <Text style={styles.submitText}>{mutation.isPending ? 'Booking...' : 'Confirm booking'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  label: { fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
  helper: { color: colors.textSecondary, fontSize: 13 },
  input: { backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  tableList: { gap: spacing.sm },
  tableCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  tableCardSelected: { borderColor: colors.primary, backgroundColor: '#EEF3FC' },
  tableName: { fontWeight: '700', color: colors.textPrimary },
  tableMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  submit: { backgroundColor: colors.accent, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700' },
});
