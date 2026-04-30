import { BusyOverlay, Button, Input, Typography } from '@/components/common/shared';
import { Colors, Spacing } from '@/theme/theme';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authApi } from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('enzocolinecul1997@gmail.com');
  const [password, setPassword] = useState('Enzo@1234');
  const [loading, setLoading] = useState(false);
  const isBusy = loading;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const data = await authApi.login(formData);
      await signIn(data.access_token);
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.response?.data?.detail || 'Something went wrong');
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
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/images/splitea-icon-transparent.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Typography.Body style={styles.tagline}>Divide gastos, multiplica amigos.</Typography.Body>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.form}>
            <Typography.SubHeader style={styles.title}>Login</Typography.SubHeader>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="enzocolinecul1997@gmail.com"
              editable={!isBusy}
            />
            <View style={{ height: Spacing.sm }} />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              editable={!isBusy}
            />

            <TouchableOpacity style={styles.forgotPassword} disabled={isBusy}>
              <Typography.Body style={styles.forgotText}>Forgot password?</Typography.Body>
            </TouchableOpacity>

            <Button
              title={loading ? "Logging in..." : "Login"}
              onPress={handleLogin}
              style={styles.loginBtn}
              disabled={isBusy}
            />

            <View style={styles.footer}>
              <Typography.Body style={styles.footerText}>Don't have an account? </Typography.Body>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={isBusy}>
                <Typography.Body style={styles.linkText}>Register</Typography.Body>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <BusyOverlay visible={isBusy} label="Logging in..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: { flex: 1 },
  logoContainer: {
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 60
  },
  logo: { width: 280, height: 160 , marginBottom: 0 },
  tagline: { color: Colors.textSecondary, fontSize: 16, fontWeight: '500' },
  formContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  form: { width: '100%' },
  title: { fontSize: 24, marginBottom: Spacing.xl, color: Colors.text, fontWeight: '700' },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 4, marginBottom: Spacing.xl },
  forgotText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
  loginBtn: { marginTop: Spacing.xs, height: 56 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.textSecondary, fontWeight: '500' },
  linkText: { color: Colors.primary, fontWeight: '800' },
});
