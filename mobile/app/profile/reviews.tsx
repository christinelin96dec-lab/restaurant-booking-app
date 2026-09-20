import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/colors';

export default function MyReviewsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Your past reviews (GET /reviews filtered by user) will render here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  text: { color: colors.textSecondary },
});
