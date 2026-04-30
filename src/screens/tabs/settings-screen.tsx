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
    tint: '#F3F4F6',
    iconColor: Colors.text,
    route: '/profile-settings',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    subtitle: 'Review alerts and reminders',
    icon: Bell,
    tint: '#F3F4F6',
    iconColor: Colors.text,
    route: '/notifications',
  },
  {
    key: 'payments',
    title: 'Payment methods',
    subtitle: 'Coming soon for settle up flows',
    icon: CreditCard,
    tint: '#F3F4F6',
    iconColor: Colors.text,
  },
  {
    key: 'privacy',
    title: 'Privacy & security',
    subtitle: 'Sign-in and account protection',
    icon: ShieldCheck,
    tint: '#F3F4F6',
    iconColor: Colors.text,
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

        <View style={styles.profileSection}>
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
        </View>

        <View style={styles.list}>
          {SETTINGS_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === SETTINGS_ITEMS.length - 1;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={item.route ? 0.7 : 1}
                onPress={() => handlePressItem(item.route)}
                disabled={!item.route || isBusy}
                style={[styles.listItem, !isLast && styles.listItemBorder]}
              >
                <View style={styles.optionIcon}>
                  <Icon size={22} color={item.iconColor} />
                </View>
 
                <View style={styles.optionBody}>
                  <Typography.Body style={styles.optionTitle}>{item.title}</Typography.Body>
                  <Typography.Caption style={styles.optionSubtitle}>{item.subtitle}</Typography.Caption>
                </View>
 
                {item.route && <ChevronRight size={18} color={Colors.textSecondary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={handleSignOut} disabled={signingOut}>
          <View style={styles.signOutButton}>
            {signingOut ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <LogOut size={20} color={Colors.white} />
            )}
            <Typography.Body style={styles.signOutButtonText}>
              {signingOut ? 'Signing out…' : 'Log out'}
            </Typography.Body>
          </View>
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
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 0,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  profileSection: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.itemBorder,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.itemBorder,
  },
  avatarText: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontWeight: '800',
    fontSize: 20,
    color: Colors.text,
  },
  profileEmail: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  list: {
    marginTop: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.itemBorder,
  },
  optionIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionBody: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontWeight: '700',
    fontSize: 17,
    color: Colors.text,
  },
  optionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.card,
    marginTop: Spacing.xl,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
