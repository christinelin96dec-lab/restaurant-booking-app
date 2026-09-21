import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { colors, radii, spacing } from '@/theme/colors';

interface TableItem {
  id: string;
  name: string;
  type: 'TABLE' | 'PRIVATE_ROOM' | 'WHOLE_VENUE';
  capacity: number;
  isActive: boolean;
}

const TABLE_TYPES: TableItem['type'][] = ['TABLE', 'PRIVATE_ROOM', 'WHOLE_VENUE'];

export default function TablesManagerScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const queryClient = useQueryClient();

  const { data: tables } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async () => (await apiClient.get<{ tables: TableItem[] }>(`/restaurants/${restaurantId}`)).data.tables,
  });

  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [type, setType] = useState<TableItem['type']>('TABLE');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });

  const createMutation = useMutation({
    mutationFn: async () => apiClient.post(`/restaurants/${restaurantId}/tables`, { name, type, capacity: Number(capacity) }),
    onSuccess: () => {
      setName('');
      setCapacity('');
      invalidate();
    },
    onError: (err: any) => Alert.alert('Could not add table', err?.response?.data?.message ?? 'Please try again.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (tableId: string) => apiClient.delete(`/restaurants/${restaurantId}/tables/${tableId}`),
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: async (tableId: string) => apiClient.patch(`/restaurants/${restaurantId}/tables/${tableId}`, { isActive: true }),
    onSuccess: invalidate,
  });

  return (
    <View style={styles.screen}>
      <View style={styles.form}>
        <Text style={styles.label}>Add a table, room, or venue buyout</Text>
        <View style={styles.typeRow}>
          {TABLE_TYPES.map((t) => (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.typePill, type === t && styles.typePillActive]}>
              <Text style={[styles.typePillText, type === t && styles.typePillTextActive]}>{t.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={name} onChangeText={setName} placeholder="Name (e.g. Table 4, The Lotus Room)" style={styles.input} placeholderTextColor={colors.textSecondary} />
        <TextInput value={capacity} onChangeText={setCapacity} placeholder="Capacity" keyboardType="number-pad" style={styles.input} placeholderTextColor={colors.textSecondary} />
        <Pressable
          style={styles.addButton}
          onPress={() => createMutation.mutate()}
          disabled={createMutation.isPending || !name || !capacity}
        >
          <Text style={styles.addButtonText}>{createMutation.isPending ? 'Adding...' : 'Add'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={tables}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, !item.isActive && styles.itemCardInactive]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.type.replace('_', ' ')} · seats {item.capacity} {!item.isActive && '· deactivated'}
              </Text>
            </View>
            {item.isActive ? (
              <Pressable onPress={() => deactivateMutation.mutate(item.id)}>
                <Text style={styles.deleteLink}>Deactivate</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => reactivateMutation.mutate(item.id)}>
                <Text style={styles.toggleLink}>Reactivate</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No tables yet — add your first one above.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  form: { backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontWeight: '700', color: colors.textPrimary },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typePill: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  typePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typePillText: { color: colors.textPrimary, fontSize: 12 },
  typePillTextActive: { color: '#fff', fontWeight: '600' },
  input: { backgroundColor: colors.background, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  addButton: { backgroundColor: colors.primary, borderRadius: radii.sm, padding: spacing.sm, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600' },
  itemCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemCardInactive: { opacity: 0.5 },
  itemName: { fontWeight: '700', color: colors.textPrimary },
  itemMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  toggleLink: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  deleteLink: { color: colors.danger, fontWeight: '600', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
