import { userApi } from '@/api/user';
import { BusyOverlay, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { GlobalEvents } from '@/utils/events';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CURRENCIES = [
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'PYG', name: 'Paraguayan Guarani', symbol: '₲' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
];

export default function CurrencyPickerScreen() {
  const router = useRouter();
  const { current, mode } = useLocalSearchParams<{ current: string, mode?: 'select' | 'update' }>();
  const [selected, setSelected] = useState(current || 'ARS');
  const [loading, setLoading] = useState(false);

  const handleSelect = async (code: string) => {
    setSelected(code);
    if (mode === 'select') {
      GlobalEvents.emitCurrencySelected(code);
      router.back();
      return;
    }

    setLoading(true);
    try {
      await userApi.updateProfile({ preferred_currency: code });
      GlobalEvents.emitCurrencySelected(code);
      router.back();
    } catch (error) {
      console.error('Failed to update currency', error);
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
        <Typography.SubHeader style={styles.headerTitle}>Select Currency</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography.SectionHeader>SUPPORTED CURRENCIES</Typography.SectionHeader>
        <View style={styles.list}>
          {CURRENCIES.map((item) => {
            const isSelected = selected === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => handleSelect(item.code)}
                activeOpacity={0.7}
              >
                <View style={styles.info}>
                  <View style={styles.symbolContainer}>
                    <Typography.Body style={styles.symbol}>{item.symbol}</Typography.Body>
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
  symbolContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbol: {
    fontWeight: '700',
    fontSize: 18,
  },
  name: {
    fontWeight: '700',
    fontSize: 16,
  },
  textSelected: {
    color: Colors.primary,
  },
});
