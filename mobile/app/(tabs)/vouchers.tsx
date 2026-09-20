import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

interface VoucherItem {
  id: string;
  code: string;
  type: 'GIFT' | 'PROMOTIONAL';
  valueCents?: number;
  currency?: string;
  expiresAt?: string;
}

export default function VouchersScreen() {
  const { data } = useQuery({
    queryKey: ['vouchers-mine'],
    queryFn: async () => (await apiClient.get<VoucherItem[]>('/vouchers/mine')).data,
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My Vouchers</Text>
      <FlatList
        data={data}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.code}>{item.code}</Text>
            <Text style={styles.meta}>
              {item.type === 'GIFT' ? '🎁 Gift voucher' : '🎉 Promotional voucher'}
              {item.valueCents ? ` · ${(item.valueCents / 100).toFixed(2)} ${item.currency}` : ''}
            </Text>
            {item.expiresAt && (
              <Text style={styles.expiry}>Expires {new Date(item.expiresAt).toDateString()}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No vouchers yet. Buy one as a gift, or watch for restaurant promos!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: '700', paddingHorizontal: spacing.md, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md },
  code: { fontWeight: '700', fontSize: 16, letterSpacing: 1, color: colors.primary },
  meta: { color: colors.textSecondary, marginTop: 4 },
  expiry: { color: colors.danger, marginTop: 4, fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg, paddingHorizontal: spacing.lg },
});
