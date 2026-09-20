import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/colors';

export default function HelpScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Help & support (FAQ, contact) goes here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  text: { color: colors.textSecondary },
});
