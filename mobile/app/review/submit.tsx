import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

export default function SubmitReviewScreen() {
  const { bookingId, bulkOrderId, restaurantName } = useLocalSearchParams<{
    bookingId?: string;
    bulkOrderId?: string;
    restaurantName?: string;
  }>();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.post('/reviews', {
        bookingId: bookingId || undefined,
        bulkOrderId: bulkOrderId || undefined,
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      Alert.alert('Thanks for your review!', 'Your review has been posted.');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Could not submit review', err?.response?.data?.message ?? 'Please try again.');
    },
  });

  return (
    <View style={styles.screen}>
      {!!restaurantName && <Text style={styles.title}>How was {restaurantName}?</Text>}

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setRating(value)}>
            <Text style={[styles.star, value <= rating && styles.starFilled]}>★</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Tell other diners about your experience..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={5}
        style={styles.input}
      />

      <Pressable style={styles.submit} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        <Text style={styles.submitText}>{mutation.isPending ? 'Posting...' : 'Post review'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  starsRow: { flexDirection: 'row', gap: spacing.sm },
  star: { fontSize: 36, color: colors.border },
  starFilled: { color: colors.gold },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submit: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.md, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' },
});
