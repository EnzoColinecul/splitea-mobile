import { paymentsApi } from '@/api/payments';
import { BusyOverlay, Button, Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { StripeAccountStatus } from '@/types';
import { openAuthUrl } from '@/utils/open-auth-url';
import { Stack, useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, ChevronLeft, CreditCard } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StripeConnectScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const data = await paymentsApi.getStripeAccount();
      setAccount(data);
    } catch (error: any) {
      const status = error?.response?.status;
      // 404 = no account yet, 503 = Stripe not configured — both mean "not connected"
      if (status === 404 || status === 503) {
        setAccount({ connected: false, payable: false });
      } else {
        console.error('Failed to load Stripe account', error);
        setAccount({ connected: false, payable: false });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { url } = await paymentsApi.stripeConnect();
      await openAuthUrl(url);
      // Refresh account status whether the user completed or cancelled onboarding
      const refreshed = await paymentsApi.refreshStripeAccount();
      setAccount(refreshed);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 503) {
        Alert.alert('Unavailable', 'Stripe is not configured on this server.');
      } else {
        Alert.alert('Error', 'Could not start Stripe onboarding. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  const renderStatus = () => {
    if (!account) return null;

    if (!account.connected) {
      return (
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconCircle, { backgroundColor: Colors.surfaceMuted }]}>
              <CreditCard size={24} color={Colors.textSecondary} />
            </View>
            <View style={styles.statusInfo}>
              <Typography.Body style={styles.statusTitle}>Not connected</Typography.Body>
              <Typography.Caption>Connect Stripe to receive card payments from friends.</Typography.Caption>
            </View>
          </View>
          <Button title="Connect Stripe" variant="primary" onPress={handleConnect} disabled={connecting} style={styles.ctaButton} />
        </Card>
      );
    }

    if (!account.payable) {
      return (
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconCircle, { backgroundColor: '#FFFBEB' }]}>
              <AlertCircle size={24} color="#F59E0B" />
            </View>
            <View style={styles.statusInfo}>
              <Typography.Body style={styles.statusTitle}>Setup incomplete</Typography.Body>
              <Typography.Caption>Finish your Stripe setup to start receiving payments.</Typography.Caption>
            </View>
          </View>
          <Button title="Finish setup" variant="primary" onPress={handleConnect} disabled={connecting} style={styles.ctaButton} />
        </Card>
      );
    }

    return (
      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIconCircle, { backgroundColor: Colors.successSoft }]}>
            <CheckCircle2 size={24} color={Colors.success} />
          </View>
          <View style={styles.statusInfo}>
            <Typography.Body style={styles.statusTitle}>Connected</Typography.Body>
            <Typography.Caption>Your Stripe account is active. Friends can pay you with a card.</Typography.Caption>
          </View>
        </View>

        <View style={styles.flagList}>
          <FlagItem label="Charges enabled" ok={account.charges_enabled} />
          <FlagItem label="Payouts enabled" ok={account.payouts_enabled} />
          <FlagItem label="Details submitted" ok={account.details_submitted} />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>Payment Methods</Typography.SubHeader>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Typography.Caption style={styles.intro}>
          Connect Stripe to receive card payments from other Splitea users when they settle debts with you.
        </Typography.Caption>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          renderStatus()
        )}
      </ScrollView>

      <BusyOverlay visible={connecting} label="Opening Stripe…" />
    </SafeAreaView>
  );
}

function FlagItem({ label, ok }: { label: string; ok?: boolean }) {
  const active = Boolean(ok);
  return (
    <View style={styles.flagItem}>
      <View style={[styles.flagDot, { backgroundColor: active ? Colors.success : Colors.textSecondary }]} />
      <Typography.Caption style={{ color: active ? Colors.success : Colors.textSecondary, fontWeight: '600' }}>
        {label}
      </Typography.Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0, fontWeight: '700' },
  headerSpacer: { width: 36 },
  scroll: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.lg },
  intro: { textAlign: 'center', color: Colors.textSecondary, lineHeight: 20 },
  center: { paddingTop: Spacing.xl, alignItems: 'center' },
  statusCard: {
    borderRadius: BorderRadius.card,
    gap: Spacing.lg,
    backgroundColor: Colors.white,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: { flex: 1, gap: 4 },
  statusTitle: { fontWeight: '700', fontSize: 16, color: Colors.text },
  ctaButton: { width: '100%' },
  flagList: { borderTopWidth: 1, borderTopColor: Colors.itemBorder, paddingTop: Spacing.md, gap: Spacing.sm },
  flagItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flagDot: { width: 8, height: 8, borderRadius: 4 },
});
