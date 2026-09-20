import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

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
}

export default function AdminDashboardScreen() {
  // In a full build this queries GET /bulk-orders?restaurantId= scoped to the admin's restaurant(s).
  const { data } = useQuery<BulkOrderQueueItem[]>({
    queryKey: ['admin-bulk-order-queue'],
    queryFn: async () => (await apiClient.get('/bulk-orders/mine')).data,
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Bulk Order Queue</Text>
      {data?.map((order) => (
        <View key={order.id} style={styles.card}>
          <Text style={styles.orderType}>
            {order.type} · {order.guestCount} guests
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: 4, marginBottom: spacing.sm },
  orderType: { fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  feeLabel: { color: colors.textSecondary, fontSize: 13 },
  feeValue: { color: colors.textPrimary, fontSize: 13 },
  feeValueNegative: { color: colors.danger, fontSize: 13 },
  feeLabelBold: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  feeValueBold: { color: colors.success, fontWeight: '700', fontSize: 13 },
  status: { marginTop: 6, color: colors.primary, fontWeight: '600', fontSize: 12 },
});
