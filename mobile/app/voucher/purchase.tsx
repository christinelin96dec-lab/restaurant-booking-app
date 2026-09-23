import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '@/utils/alert';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

export default function PurchaseVoucherScreen() {
  const router = useRouter();
  const [recipientId, setRecipientId] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [amount, setAmount] = useState('20');

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/vouchers', {
        type: 'GIFT',
        recipientId: recipientId.trim() || undefined,
        restaurantId: restaurantId.trim() || undefined,
        valueCents: Math.round(Number(amount) * 100),
      }),
    onSuccess: ({ data }) => {
      Alert.alert('Voucher created', `Share this code with the recipient: ${data.code}`);
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Could not create voucher', err?.response?.data?.message ?? 'Please try again.');
    },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
      <Text style={styles.title}>Gift a voucher</Text>
      <Text style={styles.subtitle}>
        Buy a voucher for a friend or family member to redeem at a restaurant, or leave it open to any
        participating restaurant.
      </Text>

      <Text style={styles.label}>Amount ({'$'})</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={styles.input} />

      <Text style={styles.label}>Recipient user ID (optional — leave blank to keep for yourself)</Text>
      <TextInput
        value={recipientId}
        onChangeText={setRecipientId}
        placeholder="recipient-user-id"
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.label}>Restaurant ID (optional — leave blank for any participating restaurant)</Text>
      <TextInput
        value={restaurantId}
        onChangeText={setRestaurantId}
        placeholder="restaurant-id"
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
      />

      <Pressable style={styles.submit} onPress={() => mutation.mutate()} disabled={mutation.isPending || !amount}>
        <Text style={styles.submitText}>{mutation.isPending ? 'Creating...' : `Buy $${amount || '0'} voucher`}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.sm },
  label: { fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  submit: { backgroundColor: colors.accent, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  submitText: { color: '#fff', fontWeight: '700' },
});
