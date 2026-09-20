import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { RestaurantSummary } from '@/api/types';
import { RestaurantCard } from '@/components/RestaurantCard';
import { colors, radii, spacing } from '@/theme/colors';

export default function DiscoverScreen() {
  const [city, setCity] = useState('Bangkok');
  const [query, setQuery] = useState('');

  const { data: topRestaurants } = useQuery({
    queryKey: ['top-restaurants', city],
    queryFn: async () => (await apiClient.get<RestaurantSummary[]>('/restaurants/top', { params: { city } })).data,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ['restaurants', city, query],
    queryFn: async () =>
      (await apiClient.get<RestaurantSummary[]>('/restaurants', { params: { city, q: query || undefined } })).data,
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Where are you eating today?</Text>
        <View style={styles.cityRow}>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="City"
            style={styles.cityInput}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search restaurants, cuisines..."
          style={styles.search}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {!!topRestaurants?.length && (
        <View style={styles.topSection}>
          <Text style={styles.sectionTitle}>Top Restaurants in {city}</Text>
          <FlatList
            data={topRestaurants}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.md }}
            renderItem={({ item }) => (
              <View style={{ width: 260 }}>
                <RestaurantCard restaurant={item} />
              </View>
            )}
          />
        </View>
      )}

      <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.md }]}>All restaurants</Text>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item }) => <RestaurantCard restaurant={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No restaurants found yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, padding: spacing.md, paddingTop: 60, gap: spacing.sm },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '700' },
  cityRow: { flexDirection: 'row' },
  cityInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    width: 160,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  topSection: { paddingTop: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
