import { userApi } from '@/api/user';
import { BusyOverlay, Card, Typography } from '@/components/common/shared';
import { useAuth } from '@/hooks/useAuth';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { User } from '@/types';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, CreditCard, LogOut, ShieldCheck, UserCircle2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type SettingsItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: typeof UserCircle2;
  tint: string;
  iconColor: string;
  route?: string;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    key: 'profile',
    title: 'Profile settings',
    subtitle: 'Manage your name and account details',
    icon: UserCircle2,
    tint: '#FFF2E6',
    iconColor: Colors.primary,
    route: '/profile',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    subtitle: 'Review alerts and reminders',
    icon: Bell,
    tint: '#EEF6FF',
    iconColor: '#2563EB',
    route: '/notifications',
  },
  {
    key: 'payments',
    title: 'Payment methods',
    subtitle: 'Coming soon for settle up flows',
    icon: CreditCard,
    tint: '#F4FAEC',
    iconColor: Colors.secondary,
  },
  {
    key: 'privacy',
    title: 'Privacy & security',
    subtitle: 'Sign-in and account protection',
    icon: ShieldCheck,
    tint: '#FFF7ED',
    iconColor: Colors.primaryDark,
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const isBusy = signingOut;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await userApi.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load settings profile', error);
    } finally {
      setLoading(false);
    }
  };

  const initials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.trim() || 'S';

  const handlePressItem = (route?: string) => {
    if (isBusy || !route) return;
    router.push(route as never);
  };

  const handleSignOut = () => {
    Alert.alert('Log out', 'Do you want to sign out of Splitea on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await signOut();
          } catch (error) {
            console.error('Failed to sign out', error);
            Alert.alert('Sign out failed', 'Something went wrong while signing out.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scrollContent} scrollEnabled={!isBusy}>
        <View style={styles.headerRow}>
          <Typography.Header style={styles.title}>Settings</Typography.Header>
          <Typography.Caption style={styles.subtitle}>Account, notifications, and app preferences.</Typography.Caption>
        </View>

        <Card style={styles.profileCard}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Typography.Caption style={styles.loadingText}>Loading your account…</Typography.Caption>
            </View>
          ) : (
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Typography.Body style={styles.avatarText}>{initials}</Typography.Body>
              </View>

              <View style={styles.profileInfo}>
                <Typography.Body style={styles.profileName}>
                  {user ? `${user.first_name} ${user.last_name}` : 'Your account'}
                </Typography.Body>
                <Typography.Caption style={styles.profileEmail}>{user?.email || 'Signed in to Splitea'}</Typography.Caption>
              </View>
            </View>
          )}
        </Card>

        <View style={styles.list}>
          {SETTINGS_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={item.route ? 0.8 : 1}
                onPress={() => handlePressItem(item.route)}
                disabled={!item.route || isBusy}
              >
                <Card style={styles.optionCard}>
                  <View style={[styles.optionIcon, { backgroundColor: item.tint }]}>
                    <Icon size={20} color={item.iconColor} />
                  </View>

                  <View style={styles.optionBody}>
                    <Typography.Body style={styles.optionTitle}>{item.title}</Typography.Body>
                    <Typography.Caption style={styles.optionSubtitle}>{item.subtitle}</Typography.Caption>
                  </View>

                  <ChevronRight size={18} color={item.route ? Colors.textSecondary : '#D1D5DB'} />
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={handleSignOut} disabled={signingOut}>
          <Card style={styles.signOutCard}>
            <View style={styles.signOutIcon}>
              {signingOut ? (
                <ActivityIndicator size="small" color={Colors.danger} />
              ) : (
                <LogOut size={20} color={Colors.danger} />
              )}
            </View>

            <View style={styles.optionBody}>
              <Typography.Body style={styles.signOutTitle}>{signingOut ? 'Signing out…' : 'Log out'}</Typography.Body>
              <Typography.Caption style={styles.signOutSubtitle}>You will need to sign in again on this device.</Typography.Caption>
            </View>
          </Card>
        </TouchableOpacity>
      </ScrollView>
      <BusyOverlay visible={isBusy} label="Signing out..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.xl,
    gap: Spacing.lg,
    backgroundColor: Colors.background,
  },
  headerRow: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 0,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  profileCard: {
    padding: Spacing.lg,
    backgroundColor: '#FFF9F4',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.textSecondary,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF2E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontWeight: '800',
    fontSize: 18,
    color: Colors.text,
  },
  profileEmail: {
    color: Colors.textSecondary,
  },
  list: {
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionBody: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.text,
  },
  optionSubtitle: {
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  signOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderColor: '#F4D4CF',
    backgroundColor: '#FFF8F7',
  },
  signOutIcon: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#FDECEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.danger,
  },
  signOutSubtitle: {
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
