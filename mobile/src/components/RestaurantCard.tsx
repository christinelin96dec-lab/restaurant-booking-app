import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { colors, radii, spacing } from '@/theme/colors';
import { RatingStars } from './RatingStars';
import { BadgePill } from './BadgePill';
import type { RestaurantSummary } from '@/api/types';

export function RestaurantCard({ restaurant }: { restaurant: RestaurantSummary }) {
  const activeBadge = restaurant.badges?.find((b) => !b.revokedAt);
  return (
    <Link href={`/restaurant/${restaurant.id}`} asChild>
      <Pressable style={styles.card}>
        <Image
          source={{ uri: restaurant.photos[0] ?? 'https://placehold.co/600x360?text=Restaurant' }}
          style={styles.image}
        />
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <Text style={styles.price}>{'$'.repeat(restaurant.priceRange)}</Text>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {restaurant.cuisineTypes.join(' · ')} · {restaurant.city}
          </Text>
          <View style={styles.footerRow}>
            <RatingStars
              rating={restaurant.stats?.averageRating ?? 0}
              reviewCount={restaurant.stats?.reviewCount ?? 0}
            />
            {activeBadge && <BadgePill type={activeBadge.type} />}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  image: { width: '100%', height: 160, backgroundColor: colors.border },
  body: { padding: spacing.md, gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  price: { color: colors.textSecondary, fontWeight: '600' },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});
