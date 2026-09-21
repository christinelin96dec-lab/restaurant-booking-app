import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

interface BookingItem {
  id: string;
  date: string;
  partySize: number;
  status: string;
  restaurant: { id: string; name: string };
}

interface BulkOrderItem {
  id: string;
  type: string;
  guestCount: number;
  eventDate: string;
  status: string;
  restaurant: { id: string; name: string };
}

type Row =
  | { kind: 'booking'; id: string; title: string; subtitle: string; status: string; restaurantName: string }
  | { kind: 'bulk-order'; id: string; title: string; subtitle: string; status: string; restaurantName: string };

export default function BookingsScreen() {
  const { data: bookings } = useQuery({
    queryKey: ['bookings-mine'],
    queryFn: async () => (await apiClient.get<BookingItem[]>('/bookings/mine')).data,
  });
  const { data: bulkOrders } = useQuery({
    queryKey: ['bulk-orders-mine'],
    queryFn: async () => (await apiClient.get<BulkOrderItem[]>('/bulk-orders/mine')).data,
  });

  const rows: Row[] = [
    ...(bookings ?? []).map((b): Row => ({
      kind: 'booking',
      id: b.id,
      title: b.restaurant.name,
      subtitle: `${new Date(b.date).toDateString()} · ${b.partySize} guests`,
      status: b.status,
      restaurantName: b.restaurant.name,
    })),
    ...(bulkOrders ?? []).map((o): Row => ({
      kind: 'bulk-order',
      id: o.id,
      title: `${o.restaurant.name} — ${o.type.toLowerCase()}`,
      subtitle: `${new Date(o.eventDate).toDateString()} · ${o.guestCount} guests`,
      status: o.status,
      restaurantName: o.restaurant.name,
    })),
  ].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My Bookings & Orders</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.kind}-${r.id}`}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>{item.subtitle}</Text>
            <View style={styles.footerRow}>
              <Text style={styles.status}>{item.status}</Text>
              {item.status === 'COMPLETED' && (
                <Link
                  href={{
                    pathname: '/review/submit',
                    params:
                      item.kind === 'booking'
                        ? { bookingId: item.id, restaurantName: item.restaurantName }
                        : { bulkOrderId: item.id, restaurantName: item.restaurantName },
                  }}
                  asChild
                >
                  <Pressable>
                    <Text style={styles.reviewLink}>Leave a review</Text>
                  </Pressable>
                </Link>
              )}
            </View>
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
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  status: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  reviewLink: { color: colors.accent, fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
