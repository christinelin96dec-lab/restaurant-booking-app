import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '@/utils/alert';
import { Link, useRouter } from 'expo-router';
import { colors, radii, spacing } from '@/theme/colors';
import { useAuthStore } from '@/store/authStore';

export default function SignupScreen() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      await signup(email.trim(), password, fullName.trim());
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Could not sign up', err?.response?.data?.message ?? 'Please check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Book tables, gift vouchers, and place bulk orders in one place.</Text>

      <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" style={styles.input} placeholderTextColor={colors.textSecondary} />
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
        placeholder="Password (min 8 characters)"
        secureTextEntry
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
      />

      <Pressable style={styles.submit} onPress={onSubmit} disabled={isSubmitting || !email || !password || !fullName}>
        <Text style={styles.submitText}>{isSubmitting ? 'Creating account...' : 'Sign up'}</Text>
      </Pressable>

      <Link href="/auth/login" asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
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
