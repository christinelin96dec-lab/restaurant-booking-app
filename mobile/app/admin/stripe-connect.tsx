import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

interface StripeStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[styles.pill, ok ? styles.pillOk : styles.pillPending]}>
      <Text style={[styles.pillText, ok ? styles.pillTextOk : styles.pillTextPending]}>
        {ok ? '✓' : '—'} {label}
      </Text>
    </View>
  );
}

export default function StripeConnectScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();

  const { data: status, refetch } = useQuery({
    queryKey: ['stripe-status', restaurantId],
    queryFn: async () => (await apiClient.get<StripeStatus>(`/restaurants/${restaurantId}/stripe/status`)).data,
  });

  const mutation = useMutation({
    mutationFn: async () => (await apiClient.post<{ url: string }>(`/restaurants/${restaurantId}/stripe/onboarding-link`)).data,
    onSuccess: async ({ url }) => {
      await Linking.openURL(url);
    },
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Payouts</Text>
      <Text style={styles.subtitle}>
        Connect your restaurant to Stripe to receive payouts from bulk orders (90% of each order — the platform
        keeps a 10% fee). This is required before you can accept bulk/event orders.
      </Text>

      {!!status && (
        <View style={styles.statusRow}>
          <StatusPill ok={status.connected} label="Account connected" />
          <StatusPill ok={status.detailsSubmitted} label="Details submitted" />
          <StatusPill ok={status.chargesEnabled} label="Charges enabled" />
          <StatusPill ok={status.payoutsEnabled} label="Payouts enabled" />
        </View>
      )}

      <Pressable style={styles.connectButton} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        <Text style={styles.connectButtonText}>
          {mutation.isPending ? 'Opening Stripe...' : status?.connected ? 'Continue Stripe setup' : 'Connect with Stripe'}
        </Text>
      </Pressable>

      <Pressable style={styles.refreshButton} onPress={() => refetch()}>
        <Text style={styles.refreshButtonText}>I've finished on Stripe — refresh status</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary },
  statusRow: { gap: spacing.sm },
  pill: { borderRadius: radii.sm, padding: spacing.sm },
  pillOk: { backgroundColor: '#E7F7EF' },
  pillPending: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  pillText: { fontWeight: '600', fontSize: 13 },
  pillTextOk: { color: colors.success },
  pillTextPending: { color: colors.textSecondary },
  connectButton: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.md, alignItems: 'center' },
  connectButtonText: { color: '#fff', fontWeight: '700' },
  refreshButton: { alignItems: 'center', padding: spacing.sm },
  refreshButtonText: { color: colors.primary, fontWeight: '600' },
});
