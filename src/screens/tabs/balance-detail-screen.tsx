import { expensesApi } from '@/api/expenses';
import { Avatar } from '@/components/common/avatar';
import { Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { FriendBalance, FriendBalanceListResponse } from '@/types';
import { formatCurrency } from '@/utils/expense-display';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Filter = 'net' | 'owed' | 'owing';

const TITLE_MAP: Record<Filter, string> = {
  net: 'Net Balance',
  owed: 'You are Owed',
  owing: 'You Owe',
};

export default function BalanceDetailScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: Filter }>();
  const activeFilter: Filter = filter || 'net';

  const [data, setData] = useState<FriendBalanceListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await expensesApi.getFriendBalances();
      setData(res);
    } catch (e) {
      console.error('Failed to load balances', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const { visible, total } = useMemo(() => {
    if (!data) return { visible: [] as FriendBalance[], total: 0 };
    if (activeFilter === 'owed') {
      const v = data.balances.filter((b) => b.direction === 'owes_me');
      return { visible: v, total: data.total_owed_to_me };
    }
    if (activeFilter === 'owing') {
      const v = data.balances.filter((b) => b.direction === 'i_owe');
      return { visible: v, total: data.total_i_owe };
    }
    return { visible: data.balances, total: data.net_balance };
  }, [data, activeFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>
          {TITLE_MAP[activeFilter]}
        </Typography.SubHeader>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.totalCard}>
          <Typography.Caption style={styles.totalLabel}>
            {activeFilter === 'net'
              ? data && data.net_balance >= 0
                ? 'Net you are owed'
                : 'Net you owe'
              : activeFilter === 'owed'
                ? 'Total to collect'
                : 'Total to pay'}
          </Typography.Caption>
          <Text
            style={[
              styles.totalAmount,
              {
                color:
                  activeFilter === 'owing'
                    ? Colors.danger
                    : activeFilter === 'owed'
                      ? Colors.secondary
                      : (data?.net_balance ?? 0) >= 0
                        ? Colors.secondary
                        : Colors.danger,
              },
            ]}
          >
            {formatCurrency(Math.abs(total))}
          </Text>
        </Card>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <Typography.Body style={{ color: Colors.textSecondary }}>
              No balances to show.
            </Typography.Body>
          </View>
        ) : (
          <Card style={styles.list}>
            {visible.map((b, idx) => {
              const color =
                b.direction === 'owes_me'
                  ? Colors.secondary
                  : b.direction === 'i_owe'
                    ? Colors.danger
                    : Colors.textSecondary;
              const label =
                b.direction === 'owes_me'
                  ? 'owes you'
                  : b.direction === 'i_owe'
                    ? 'you owe'
                    : 'settled';
              return (
                <View key={b.other_user_id}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                      router.push({
                        pathname: '/user-activity',
                        params: { userId: b.other_user_id },
                      })
                    }
                  >
                    <Avatar
                      imageUrl={b.avatar_url}
                      name={`${b.first_name} ${b.last_name}`}
                      size={44}
                    />
                    <View style={styles.rowText}>
                      <Typography.Body style={styles.rowName}>
                        {b.first_name} {b.last_name}
                      </Typography.Body>
                      <Typography.Caption style={[styles.rowSub, { color }]}>
                        {label} {formatCurrency(Math.abs(b.amount))}
                      </Typography.Caption>
                    </View>
                    <ChevronRight size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {idx < visible.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, gap: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs, width: 32 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  totalCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  totalLabel: {
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    fontSize: 12,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '800',
    marginTop: Spacing.sm,
    letterSpacing: -0.6,
  },
  loadingWrap: { paddingVertical: Spacing.xl, alignItems: 'center' },
  empty: { paddingVertical: Spacing.xl, alignItems: 'center' },
  list: { paddingVertical: Spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  rowText: { flex: 1 },
  rowName: { fontWeight: '700', fontSize: 15 },
  rowSub: { marginTop: 2, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.itemBorder, marginHorizontal: Spacing.md },
});
