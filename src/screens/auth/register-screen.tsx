import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { authApi } from '@/api/auth';
import { BusyOverlay, Button, Input, Typography } from '@/components/common/shared';
import { Colors, Spacing } from '@/theme/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isBusy = loading;

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      // After successful registration, usually route back to login
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') }
      ]);
    } catch (error: any) {
      console.error('Register error:', error);
      Alert.alert('Registration Failed', error.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={!isBusy}>
          <View style={styles.headerContainer}>
            <Typography.Header style={styles.title}>Create Account</Typography.Header>
            <Typography.Body style={styles.subtitle}>Join Spliteá and start splitting!</Typography.Body>
          </View>

          <View style={styles.form}>
            <Input
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="John"
              editable={!isBusy}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              editable={!isBusy}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              editable={!isBusy}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              editable={!isBusy}
            />

            <Button
              title={loading ? "Creating account..." : "Register"}
              onPress={handleRegister}
              style={styles.registerBtn}
              disabled={isBusy}
            />

            <View style={styles.footer}>
              <Typography.Body style={styles.footerText}>Already have an account? </Typography.Body>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')} disabled={isBusy}>
                <Typography.Body style={styles.linkText}>Login</Typography.Body>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <BusyOverlay visible={isBusy} label="Creating account..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: { flex: 1 },
  scrollContent: { padding: Spacing.xl, flexGrow: 1, justifyContent: 'center' },
  headerContainer: { marginBottom: Spacing.xl },
  title: { fontSize: 32, color: Colors.primary, marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 16 },
  form: { width: '100%' },
  registerBtn: { marginTop: Spacing.xl },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.textSecondary },
  linkText: { color: Colors.primary, fontWeight: '700' },
});
