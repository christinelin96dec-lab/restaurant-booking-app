import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';
import type { MenuItem } from '@/api/types';

export default function MenuManagerScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const queryClient = useQueryClient();

  const { data: menuItems } = useQuery({
    queryKey: ['menu-items', restaurantId],
    queryFn: async () => (await apiClient.get<{ menuItems: MenuItem[] }>(`/restaurants/${restaurantId}`)).data.menuItems,
  });

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] });

  const createMutation = useMutation({
    mutationFn: async () =>
      apiClient.post(`/restaurants/${restaurantId}/menu-items`, {
        name,
        category,
        priceCents: Math.round(Number(price) * 100),
      }),
    onSuccess: () => {
      setName('');
      setCategory('');
      setPrice('');
      invalidate();
    },
    onError: (err: any) => Alert.alert('Could not add item', err?.response?.data?.message ?? 'Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => apiClient.delete(`/restaurants/${restaurantId}/menu-items/${itemId}`),
    onSuccess: invalidate,
  });

  const toggleAvailableMutation = useMutation({
    mutationFn: async ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      apiClient.patch(`/restaurants/${restaurantId}/menu-items/${itemId}`, { isAvailable }),
    onSuccess: invalidate,
  });

  return (
    <View style={styles.screen}>
      <View style={styles.form}>
        <Text style={styles.label}>Add a menu item</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Name" style={styles.input} placeholderTextColor={colors.textSecondary} />
        <TextInput value={category} onChangeText={setCategory} placeholder="Category (e.g. Curries)" style={styles.input} placeholderTextColor={colors.textSecondary} />
        <TextInput value={price} onChangeText={setPrice} placeholder="Price ($)" keyboardType="decimal-pad" style={styles.input} placeholderTextColor={colors.textSecondary} />
        <Pressable
          style={styles.addButton}
          onPress={() => createMutation.mutate()}
          disabled={createMutation.isPending || !name || !category || !price}
        >
          <Text style={styles.addButtonText}>{createMutation.isPending ? 'Adding...' : 'Add item'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.category} · {(item.priceCents / 100).toFixed(2)} {item.currency}
              </Text>
            </View>
            <Pressable
              onPress={() => toggleAvailableMutation.mutate({ itemId: item.id, isAvailable: !item.isAvailable })}
            >
              <Text style={styles.toggleLink}>{item.isAvailable === false ? 'Show' : 'Hide'}</Text>
            </Pressable>
            <Pressable onPress={() => deleteMutation.mutate(item.id)}>
              <Text style={styles.deleteLink}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No menu items yet — add your first one above.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  form: { backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontWeight: '700', color: colors.textPrimary },
  input: { backgroundColor: colors.background, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  addButton: { backgroundColor: colors.primary, borderRadius: radii.sm, padding: spacing.sm, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600' },
  itemCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { fontWeight: '700', color: colors.textPrimary },
  itemMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  toggleLink: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  deleteLink: { color: colors.danger, fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
