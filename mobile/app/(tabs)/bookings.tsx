import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

interface BookingItem {
  id: string;
  date: string;
  partySize: number;
  status: string;
  restaurant: { name: string };
}

export default function BookingsScreen() {
  const { data } = useQuery({
    queryKey: ['bookings-mine'],
    queryFn: async () => (await apiClient.get<BookingItem[]>('/bookings/mine')).data,
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My Bookings & Orders</Text>
      <FlatList
        data={data}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.restaurant.name}</Text>
            <Text style={styles.meta}>
              {new Date(item.date).toDateString()} · {item.partySize} guests
            </Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No bookings yet — go book a table!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: '700', paddingHorizontal: spacing.md, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md },
  name: { fontWeight: '700', fontSize: 15, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4 },
  status: { marginTop: 6, color: colors.primary, fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
