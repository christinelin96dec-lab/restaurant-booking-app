import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
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
    <FlatList
      style={styles.screen}
      data={results}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => <RestaurantCard restaurant={item} />}
      ListHeaderComponent={
        <>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
            <Text style={styles.eyebrow}>DISCOVER &amp; BOOK</Text>
            <Text style={styles.greeting}>Where are you eating today?</Text>

            <View style={styles.searchCard}>
              <View style={styles.cityRow}>
                <Text style={styles.pin}>📍</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Which city?"
                  style={styles.cityInput}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.searchRow}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search restaurants, cuisines..."
                  style={styles.searchInput}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          </LinearGradient>

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
                  <View style={{ width: 270 }}>
                    <RestaurantCard restaurant={item} />
                  </View>
                )}
              />
            </View>
          )}

          <View style={styles.allHeaderRow}>
            <Text style={styles.sectionTitle}>All restaurants</Text>
            {!isLoading && <Text style={styles.resultCount}>{results?.length ?? 0} found</Text>}
          </View>
          {isLoading && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />}
        </>
      }
      ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No restaurants found yet.</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: spacing.lg },
  header: { padding: spacing.md, paddingTop: 60, paddingBottom: spacing.lg, gap: spacing.xs },
  eyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  greeting: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: spacing.sm },
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  pin: { fontSize: 15 },
  cityInput: { flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: 15, paddingVertical: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14, paddingVertical: 8 },
  topSection: { paddingTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  allHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  resultCount: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
