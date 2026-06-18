import { Colors } from '@/theme/theme';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Deep-link target for `spliteamobile://payment/success` (Stripe Checkout success
// bridge). The originating expense-view screen is still on the stack underneath —
// pop back to it so its polling modal takes over.
export default function PaymentSuccessRoute() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
