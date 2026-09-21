import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

interface RestaurantDetail {
  id: string;
  description?: string;
  address: string;
  priceRange: number;
  cuisineTypes: string[];
  amenities: string[];
}

export default function EditRestaurantScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const router = useRouter();

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => (await apiClient.get<RestaurantDetail>(`/restaurants/${restaurantId}`)).data,
  });

  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [priceRange, setPriceRange] = useState('3');
  const [cuisineTypes, setCuisineTypes] = useState('');
  const [amenities, setAmenities] = useState('');

  useEffect(() => {
    if (!restaurant) return;
    setDescription(restaurant.description ?? '');
    setAddress(restaurant.address);
    setPriceRange(String(restaurant.priceRange));
    setCuisineTypes(restaurant.cuisineTypes.join(', '));
    setAmenities(restaurant.amenities.join(', '));
  }, [restaurant]);

  const mutation = useMutation({
    mutationFn: async () =>
      apiClient.patch(`/restaurants/${restaurantId}`, {
        description,
        address,
        priceRange: Number(priceRange),
        cuisineTypes: cuisineTypes.split(',').map((s) => s.trim()).filter(Boolean),
        amenities: amenities.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      Alert.alert('Saved', 'Your restaurant profile has been updated.');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Could not save', err?.response?.data?.message ?? 'Please try again.');
    },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
      />

      <Text style={styles.label}>Address</Text>
      <TextInput value={address} onChangeText={setAddress} style={styles.input} />

      <Text style={styles.label}>Price range (1-4, {'$'} to {'$$$$'})</Text>
      <TextInput value={priceRange} onChangeText={setPriceRange} keyboardType="number-pad" style={styles.input} />

      <Text style={styles.label}>Cuisine types (comma-separated)</Text>
      <TextInput value={cuisineTypes} onChangeText={setCuisineTypes} style={styles.input} placeholder="Thai, Seafood" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.label}>Amenities (comma-separated)</Text>
      <TextInput value={amenities} onChangeText={setAmenities} style={styles.input} placeholder="Private dining, Riverside view" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.helper}>
        Name and city changes go through platform review — contact support to update those.
      </Text>

      <Pressable style={styles.submit} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        <Text style={styles.submitText}>{mutation.isPending ? 'Saving...' : 'Save changes'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  label: { fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
  input: { backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  helper: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm },
  submit: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  submitText: { color: '#fff', fontWeight: '700' },
});
