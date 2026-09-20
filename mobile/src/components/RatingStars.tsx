import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function RatingStars({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.value}>{rating.toFixed(1)}</Text>
      {typeof reviewCount === 'number' && <Text style={styles.count}>({reviewCount})</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { color: colors.gold, fontSize: 14 },
  value: { fontWeight: '700', color: colors.textPrimary, fontSize: 13 },
  count: { color: colors.textSecondary, fontSize: 12 },
});
