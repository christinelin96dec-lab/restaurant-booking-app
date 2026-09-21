import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { colors, radii, spacing } from '@/theme/colors';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Could not log in', err?.response?.data?.message ?? 'Check your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to book tables, redeem vouchers, and manage your orders.</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
      />

      <Pressable style={styles.submit} onPress={onSubmit} disabled={isSubmitting || !email || !password}>
        <Text style={styles.submitText}>{isSubmitting ? 'Logging in...' : 'Log in'}</Text>
      </Pressable>

      <Link href="/auth/signup" asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.linkText}>New here? Create an account</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center', gap: spacing.sm },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    fontSize: 15,
  },
  submit: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  submitText: { color: '#fff', fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: spacing.md },
  linkText: { color: colors.primary, fontWeight: '600' },
});
