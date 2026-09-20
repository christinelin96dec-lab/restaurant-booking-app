import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { colors, radii, spacing } from '@/theme/colors';

const MENU_ITEMS = [
  { label: 'Edit profile', route: '/profile/edit' },
  { label: 'My reviews', route: '/profile/reviews' },
  { label: 'Restaurant admin dashboard', route: '/admin/dashboard' },
  { label: 'Notifications', route: '/profile/notifications' },
  { label: 'Help & support', route: '/profile/help' },
];

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.name}>Your Name</Text>
        <Text style={styles.email}>you@example.com</Text>
      </View>
      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <Link key={item.route} href={item.route as any} asChild>
            <Pressable style={styles.menuItem}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  header: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border, marginBottom: spacing.sm },
  name: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  email: { color: colors.textSecondary, marginTop: 2 },
  menu: { paddingHorizontal: spacing.md, gap: spacing.sm },
  menuItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuLabel: { fontSize: 15, color: colors.textPrimary },
  chevron: { color: colors.textSecondary, fontSize: 18 },
});
