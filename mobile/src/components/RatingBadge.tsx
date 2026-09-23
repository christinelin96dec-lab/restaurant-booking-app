import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/theme/colors';

function bandFor(rating: number): { label: string; color: string } {
  if (rating >= 4.6) return { label: 'Exceptional', color: colors.ratingExceptional };
  if (rating >= 4.2) return { label: 'Excellent', color: colors.ratingExcellent };
  if (rating >= 3.6) return { label: 'Very Good', color: colors.ratingGood };
  if (rating >= 3.0) return { label: 'Good', color: colors.ratingAverage };
  return { label: 'Needs Work', color: colors.ratingPoor };
}

export function RatingBadge({
  rating,
  reviewCount,
  compact,
}: {
  rating: number;
  reviewCount?: number;
  compact?: boolean;
}) {
  const isUnrated = !reviewCount;
  const { label, color } = isUnrated ? { label: 'New', color: colors.textSecondary } : bandFor(rating);
  return (
    <View style={styles.row}>
      <View style={[styles.score, { backgroundColor: color }]}>
        <Text style={styles.scoreText}>{isUnrated ? '—' : rating.toFixed(1)}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {label}
        </Text>
        {!compact && (
          <Text style={styles.count} numberOfLines={1}>
            {isUnrated ? 'No reviews yet' : `${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  score: {
    minWidth: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  scoreText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  textCol: { gap: 1 },
  label: { fontWeight: '700', fontSize: 13 },
  count: { color: colors.textSecondary, fontSize: 12 },
});
