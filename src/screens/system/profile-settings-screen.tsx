import { userApi } from '@/api/user';
import { BusyOverlay, Button, Input, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { User } from '@/types';
import { GlobalEvents } from '@/utils/events';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, CreditCard, Globe } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, DeviceEventEmitter, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadProfile();

    const subC = DeviceEventEmitter.addListener(GlobalEvents.CURRENCY_SELECTED, (code: string) => {
      setUser(prev => prev ? { ...prev, preferred_currency: code } : null);
    });

    const subL = DeviceEventEmitter.addListener(GlobalEvents.LANGUAGE_SELECTED, (code: string) => {
      setUser(prev => prev ? { ...prev, language: code } : null);
    });

    return () => {
      subC.remove();
      subL.remove();
    };
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await userApi.getProfile();
      setUser(profile);
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
    } catch (error) {
      console.error('Failed to load profile', error);
      Alert.alert('Error', 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required Fields', 'First name and last name are required.');
      return;
    }

    setUpdating(true);
    try {
      const updated = await userApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
      });
      setUser(updated);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('Failed to update profile', error);
      Alert.alert('Update Failed', 'Something went wrong while updating your profile.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={updating}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>Profile Settings</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Typography.SectionHeader>PERSONAL INFORMATION</Typography.SectionHeader>
        <View style={styles.section}>
          <Input
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Your first name"
            editable={!updating}
          />
          <Input
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Your last name"
            editable={!updating}
          />
          <Input
            label="Email Address"
            value={user?.email || ''}
            onChangeText={() => {}}
            editable={false}
          />
        </View>

        <Button
          title={updating ? "Saving Changes..." : "Save Profile Details"}
          onPress={handleUpdateProfile}
          disabled={updating || (firstName === user?.first_name && lastName === user?.last_name)}
          style={styles.saveBtn}
        />

        <Typography.SectionHeader style={{ marginTop: Spacing.xl }}>APP PREFERENCES</Typography.SectionHeader>
        <View style={styles.preferencesCard}>
          <TouchableOpacity
            style={styles.preferenceItem}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/currency-picker', params: { current: user?.preferred_currency, mode: 'update' } })}
            disabled={updating}
          >
            <View style={styles.preferenceIcon}>
              <CreditCard size={20} color={Colors.text} />
            </View>
            <View style={styles.preferenceInfo}>
              <Typography.Body style={styles.preferenceTitle}>Preferred Currency</Typography.Body>
              <Typography.Caption>{user?.preferred_currency || 'ARS'}</Typography.Caption>
            </View>
            <ChevronRight size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.preferenceItem}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/language-picker', params: { current: user?.language, mode: 'update' } })}
            disabled={updating}
          >
            <View style={styles.preferenceIcon}>
              <Globe size={20} color={Colors.text} />
            </View>
            <View style={styles.preferenceInfo}>
              <Typography.Body style={styles.preferenceTitle}>Language</Typography.Body>
              <Typography.Caption>{user?.language === 'es-ES' ? 'Spanish' : 'English'}</Typography.Caption>
            </View>
            <ChevronRight size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Typography.Caption style={styles.infoText}>
            These preferences will be used as default values when you create new expenses or interact with the app.
          </Typography.Caption>
        </View>
      </ScrollView>
      <BusyOverlay visible={updating} label="Saving..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 0,
    fontWeight: '700',
  },
  scroll: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  },
  section: {
    marginBottom: Spacing.md,
  },
  disabledLabel: {
    color: Colors.textSecondary,
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
  preferencesCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    overflow: 'hidden',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceInfo: {
    flex: 1,
  },
  preferenceTitle: {
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.itemBorder,
    marginHorizontal: Spacing.lg,
  },
  infoBox: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.itemBorder,
  },
  infoText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
