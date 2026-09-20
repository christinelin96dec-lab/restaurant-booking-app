import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/colors';

export default function EditProfileScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Edit profile form goes here (name, phone, city, avatar).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  text: { color: colors.textSecondary },
});
