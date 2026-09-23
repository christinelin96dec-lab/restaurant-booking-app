import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '@/theme/colors';
import { RatingBadge } from './RatingBadge';
import type { RestaurantSummary } from '@/api/types';

const BADGE_RIBBON: Record<string, { label: string; color: string }> = {
  RISING_STAR: { label: '↑ Rising Star', color: '#8C6D1F' },
  GUEST_FAVORITE: { label: '♥ Guest Favorite', color: '#B23A6B' },
  TOP_RATED: { label: '★ Top Rated', color: '#0B8457' },
  PLATFORM_CHOICE: { label: '🏆 Platform Choice', color: colors.primaryDark },
};

export function RestaurantCard({ restaurant }: { restaurant: RestaurantSummary }) {
  const activeBadge = restaurant.badges?.find((b) => !b.revokedAt);
  const ribbon = activeBadge ? BADGE_RIBBON[activeBadge.type] : undefined;
  const photoCount = restaurant.photos?.length ?? 0;

  return (
    <Link href={`/restaurant/${restaurant.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: restaurant.photos[0] ?? 'https://placehold.co/600x360?text=Restaurant' }}
            style={styles.image}
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.imageScrim} />

          {ribbon && (
            <View style={[styles.ribbon, { backgroundColor: ribbon.color }]}>
              <Text style={styles.ribbonText}>{ribbon.label}</Text>
            </View>
          )}

          {photoCount > 1 && (
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>📷 {photoCount}</Text>
            </View>
          )}

          <View style={styles.priceTag}>
            <Text style={styles.priceTagText}>{'$'.repeat(restaurant.priceRange)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {restaurant.cuisineTypes.join(' · ')} · {restaurant.city}
          </Text>

          <View style={styles.footerRow}>
            <RatingBadge
              rating={restaurant.stats?.averageRating ?? 0}
              reviewCount={restaurant.stats?.reviewCount ?? 0}
            />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardPressed: { opacity: 0.92 },
  imageWrap: { width: '100%', height: 190, backgroundColor: colors.border },
  image: { width: '100%', height: '100%' },
  imageScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70 },
  ribbon: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  ribbonText: { color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.2 },
  photoCount: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  photoCountText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  priceTag: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
  },
  priceTagText: { color: '#fff', fontWeight: '800', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  body: { padding: spacing.md, gap: 8 },
  name: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: 13, letterSpacing: 0.1 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
});
