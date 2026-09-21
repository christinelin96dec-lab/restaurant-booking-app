import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

interface AdminRestaurant {
  id: string;
  name: string;
  city: string;
  stats?: { averageRating: number; reviewCount: number };
}

interface BulkOrderQueueItem {
  id: string;
  type: string;
  guestCount: number;
  eventDate: string;
  status: string;
  subtotalCents: number;
  platformFeeCents: number;
  totalCents: number;
  currency: string;
  user: { fullName: string };
}

export default function AdminDashboardScreen() {
  const { data: restaurants, isLoading: loadingRestaurants } = useQuery({
    queryKey: ['restaurants-mine'],
    queryFn: async () => (await apiClient.get<AdminRestaurant[]>('/restaurants/mine')).data,
  });

  const restaurant = restaurants?.[0];

  const { data: queue } = useQuery({
    queryKey: ['bulk-order-queue', restaurant?.id],
    queryFn: async () => (await apiClient.get<BulkOrderQueueItem[]>(`/bulk-orders/restaurant/${restaurant!.id}`)).data,
    enabled: !!restaurant,
  });

  if (loadingRestaurants) return null;

  if (!restaurant) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>You don't manage any restaurants yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={styles.headerCard}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={styles.restaurantMeta}>
          {restaurant.city} · ★ {restaurant.stats?.averageRating?.toFixed(1) ?? '—'} ({restaurant.stats?.reviewCount ?? 0} reviews)
        </Text>
        <View style={styles.actionsRow}>
          <Link href={{ pathname: '/admin/edit-restaurant', params: { restaurantId: restaurant.id } }} asChild>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Edit profile</Text>
            </Pressable>
          </Link>
          <Link href={{ pathname: '/admin/menu-manager', params: { restaurantId: restaurant.id } }} asChild>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Manage menu</Text>
            </Pressable>
          </Link>
          <Link href={{ pathname: '/admin/tables-manager', params: { restaurantId: restaurant.id } }} asChild>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Tables & rooms</Text>
            </Pressable>
          </Link>
          <Link href={{ pathname: '/admin/stripe-connect', params: { restaurantId: restaurant.id } }} asChild>
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Payouts</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Bulk Order Queue</Text>
      {queue?.map((order) => (
        <View key={order.id} style={styles.card}>
          <Text style={styles.orderType}>
            {order.type} · {order.guestCount} guests · {order.user.fullName}
          </Text>
          <Text style={styles.meta}>{new Date(order.eventDate).toDateString()}</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Subtotal</Text>
            <Text style={styles.feeValue}>{(order.subtotalCents / 100).toFixed(2)} {order.currency}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Platform fee (10%)</Text>
            <Text style={styles.feeValueNegative}>-{(order.platformFeeCents / 100).toFixed(2)} {order.currency}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabelBold}>Your payout</Text>
            <Text style={styles.feeValueBold}>
              {((order.totalCents - order.platformFeeCents) / 100).toFixed(2)} {order.currency}
            </Text>
          </View>
          <Text style={styles.status}>{order.status}</Text>
        </View>
      ))}
      {!queue?.length && <Text style={styles.empty}>No bulk orders yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: 4 },
  restaurantName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  restaurantMeta: { color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: 4 },
  orderType: { fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  feeLabel: { color: colors.textSecondary, fontSize: 13 },
  feeValue: { color: colors.textPrimary, fontSize: 13 },
  feeValueNegative: { color: colors.danger, fontSize: 13 },
  feeLabelBold: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  feeValueBold: { color: colors.success, fontWeight: '700', fontSize: 13 },
  status: { marginTop: 6, color: colors.primary, fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
