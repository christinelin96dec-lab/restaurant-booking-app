import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';
import { RatingStars } from '@/components/RatingStars';
import { BadgePill } from '@/components/BadgePill';
import type { MenuItem, Review } from '@/api/types';

interface RestaurantDetail {
  id: string;
  name: string;
  description?: string;
  city: string;
  address: string;
  cuisineTypes: string[];
  photos: string[];
  priceRange: number;
  stats?: { averageRating: number; reviewCount: number };
  badges?: { type: string; revokedAt: string | null }[];
  menuItems: MenuItem[];
  deliveryLinks?: Record<string, string>;
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: async () => (await apiClient.get<RestaurantDetail>(`/restaurants/${id}`)).data,
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => (await apiClient.get<Review[]>('/reviews', { params: { restaurantId: id } })).data,
  });

  if (!restaurant) return null;

  const activeBadge = restaurant.badges?.find((b) => !b.revokedAt);

  return (
    <ScrollView style={styles.screen}>
      <Image
        source={{ uri: restaurant.photos[0] ?? 'https://placehold.co/800x480?text=Restaurant' }}
        style={styles.hero}
      />
      <View style={styles.section}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.subtitle}>
          {restaurant.cuisineTypes.join(' · ')} · {'$'.repeat(restaurant.priceRange)} · {restaurant.city}
        </Text>
        <View style={styles.row}>
          <RatingStars rating={restaurant.stats?.averageRating ?? 0} reviewCount={restaurant.stats?.reviewCount} />
          {activeBadge && <BadgePill type={activeBadge.type} />}
        </View>
        <Text style={styles.address}>{restaurant.address}</Text>
        {!!restaurant.description && <Text style={styles.description}>{restaurant.description}</Text>}
      </View>

      <View style={styles.ctaRow}>
        <Link href={`/booking/${restaurant.id}`} asChild>
          <Pressable style={[styles.ctaButton, { backgroundColor: colors.accent }]}>
            <Text style={styles.ctaText}>Book a table</Text>
          </Pressable>
        </Link>
        <Link href={`/bulk-order/${restaurant.id}`} asChild>
          <Pressable style={[styles.ctaButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaText}>Bulk / event order</Text>
          </Pressable>
        </Link>
      </View>

      {!!restaurant.deliveryLinks && Object.keys(restaurant.deliveryLinks).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order delivery</Text>
          <Text style={styles.helperText}>
            Delivery is handled by our partners — this restaurant isn't restricted to your city for delivery.
          </Text>
          <View style={styles.row}>
            {Object.entries(restaurant.deliveryLinks).map(([partner, url]) => (
              <Pressable key={partner} style={styles.deliveryChip} onPress={() => Linking.openURL(url)}>
                <Text style={styles.deliveryChipText}>Order on {partner} ↗</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu</Text>
        {restaurant.menuItems.map((item) => (
          <View key={item.id} style={styles.menuRow}>
            <Text style={styles.menuName}>{item.name}</Text>
            <Text style={styles.menuPrice}>
              {(item.priceCents / 100).toFixed(2)} {item.currency}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {reviews?.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <Text style={styles.reviewer}>{review.user.fullName}</Text>
            <RatingStars rating={review.rating} />
            {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
            {!!review.adminReply && (
              <View style={styles.adminReply}>
                <Text style={styles.adminReplyLabel}>Restaurant reply</Text>
                <Text style={styles.adminReplyText}>{review.adminReply}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { width: '100%', height: 240, backgroundColor: colors.border },
  section: { padding: spacing.md, gap: 6 },
  name: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  address: { color: colors.textSecondary, marginTop: 4 },
  description: { color: colors.textPrimary, marginTop: spacing.sm, lineHeight: 20 },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md },
  ctaButton: { flex: 1, borderRadius: radii.md, paddingVertical: 14, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700' },
  helperText: { color: colors.textSecondary, fontSize: 12 },
  deliveryChip: { backgroundColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  deliveryChipText: { fontSize: 13, color: colors.textPrimary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuName: { color: colors.textPrimary },
  menuPrice: { color: colors.textSecondary },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.sm, gap: 4 },
  reviewer: { fontWeight: '600', color: colors.textPrimary },
  reviewComment: { color: colors.textPrimary },
  adminReply: { backgroundColor: colors.background, borderRadius: radii.sm, padding: spacing.sm, marginTop: 4 },
  adminReplyLabel: { fontSize: 11, fontWeight: '700', color: colors.primary },
  adminReplyText: { color: colors.textPrimary, marginTop: 2 },
});
