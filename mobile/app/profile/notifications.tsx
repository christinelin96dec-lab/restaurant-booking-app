import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/colors';

export default function NotificationsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Booking reminders, voucher offers and badge alerts will list here (Expo Push).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  text: { color: colors.textSecondary },
});
