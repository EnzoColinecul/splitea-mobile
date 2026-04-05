import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { Typography, BusyOverlay } from '@/components/common/shared';
import { Colors, Spacing, BorderRadius } from '@/theme/theme';
import { userApi } from '@/api/user';
import { GlobalEvents } from '@/utils/events';
import { useState } from 'react';

const LANGUAGES = [
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
];

export default function LanguagePickerScreen() {
  const router = useRouter();
  const { current, mode } = useLocalSearchParams<{ current: string, mode?: 'select' | 'update' }>();
  const [selected, setSelected] = useState(current || 'es-ES');
  const [loading, setLoading] = useState(false);

  const handleSelect = async (code: string) => {
    setSelected(code);
    if (mode === 'select') {
      GlobalEvents.emitLanguageSelected(code);
      router.back();
      return;
    }

    setLoading(true);
    try {
      await userApi.updateProfile({ language: code });
      GlobalEvents.emitLanguageSelected(code);
      router.back();
    } catch (error) {
      console.error('Failed to update language', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>Select Language</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography.SectionHeader>APP LANGUAGE</Typography.SectionHeader>
        <View style={styles.list}>
          {LANGUAGES.map((item) => {
            const isSelected = selected === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => handleSelect(item.code)}
                activeOpacity={0.7}
              >
                <View style={styles.info}>
                  <View style={styles.flagContainer}>
                    <Typography.Body style={styles.flag}>{item.flag}</Typography.Body>
                  </View>
                  <View>
                    <Typography.Body style={[styles.name, isSelected && styles.textSelected]}>{item.name}</Typography.Body>
                    <Typography.Caption style={isSelected && styles.textSelected}>{item.code}</Typography.Caption>
                  </View>
                </View>
                {isSelected && <Check size={20} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <BusyOverlay visible={loading} label="Updating preference..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  },
  list: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
  },
  itemSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF9F4',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flagContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
  },
  name: {
    fontWeight: '700',
    fontSize: 16,
  },
  textSelected: {
    color: Colors.primary,
  },
});
