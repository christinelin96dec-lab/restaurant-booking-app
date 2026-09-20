import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/colors';

const BADGE_LABELS: Record<string, string> = {
  RISING_STAR: '🥉 Rising Star',
  GUEST_FAVORITE: '🥈 Guest Favorite',
  TOP_RATED: '🥇 Top Rated',
  PLATFORM_CHOICE: '🏆 Platform Choice',
};

export function BadgePill({ type }: { type: string }) {
  const label = BADGE_LABELS[type] ?? type;
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: '#FFF4E5',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
  },
});
