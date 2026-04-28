import apiClient from '@/api/api-client';
import { expensesApi } from '@/api/expenses';
import { groupsApi } from '@/api/social';
import { BusyOverlay, Button, Card, Typography } from '@/components/common/shared';
import { Colors, Spacing } from '@/theme/theme';
import { Expense, Group, GroupBalance, User } from '@/types';
import {
    buildMemberLookup,
    deriveGroupBalancesFromExpenses,
    formatCurrency,
    getBalanceDirectionForUser,
    getDisplayName,
} from '@/utils/expense-display';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettleUpScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settlingCounterpartyId, setSettlingCounterpartyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    try {
      const [profileRes, groupRes, usersRes, balancesRes, expensesRes] = await Promise.all([
        apiClient.get<User>('/user/profile'),
        groupsApi.get(groupId),
        groupsApi.getUsers(groupId),
        expensesApi.getGroupBalances(groupId),
        expensesApi.listUserExpenses(),
      ]);

      setCurrentUser(profileRes.data);
      setGroup(groupRes);
      setMembers(usersRes.users || []);
      setBalances(balancesRes || []);
      setExpenses((expensesRes.expenses || []).filter((expense: Expense) => expense.group_id === groupId));
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not load settle up details.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const memberLookup = useMemo(() => buildMemberLookup(members, currentUser), [members, currentUser]);
  const resolvedBalances = useMemo(() => {
    const derivedBalances = deriveGroupBalancesFromExpenses(expenses);
    return derivedBalances.length > 0 ? derivedBalances : balances;
  }, [balances, expenses]);

  const actionableBalances = useMemo(() => {
    if (!currentUser) return [];

    return resolvedBalances
      .map((balance) => {
        const direction = getBalanceDirectionForUser(balance, currentUser.user_id);
        if (!direction) return null;

        return {
          ...balance,
          amount: direction.amount,
          counterpartyId: direction.counterpartyId,
          type: direction.type,
        };
      })
      .filter((balance): balance is NonNullable<typeof balance> => Boolean(balance))
      .sort((left, right) => right.amount - left.amount);
  }, [resolvedBalances, currentUser]);

  const handleSettle = async (counterpartyId: string) => {
    if (!groupId) return;

    try {
      setSettlingCounterpartyId(counterpartyId);
      await expensesApi.settleUp(counterpartyId, groupId);
      await fetchData();
      Alert.alert('Settled', 'The balance was updated successfully.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not settle this balance right now.');
    } finally {
      setSettlingCounterpartyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>{group?.name || 'Settle Up'}</Typography.SubHeader>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Typography.Caption style={styles.screenIntro}>
          Review the balances that involve you and settle them one person at a time.
        </Typography.Caption>

        {actionableBalances.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Typography.SubHeader style={styles.emptyTitle}>All settled up</Typography.SubHeader>
            <Typography.Caption style={styles.emptyText}>
              You do not have any outstanding balances in this group.
            </Typography.Caption>
          </Card>
        ) : (
          actionableBalances.map((balance) => {
            const isReceiving = balance.type === 'receive';
            const counterpartyName = getDisplayName(balance.counterpartyId, memberLookup);
            const title = isReceiving ? `${counterpartyName} owes you` : `You owe ${counterpartyName}`;
            const subtitle = isReceiving
              ? 'Settle when they have paid you back.'
              : 'Use this once you have paid them back.';
            const isBusy = settlingCounterpartyId === balance.counterpartyId;

            return (
              <Card key={`${balance.user_id}-${balance.other_user_id}`} style={styles.balanceCardPremium}>
                {/* Accent Pill */}
                <View style={[styles.accentPill, { backgroundColor: isReceiving ? '#4CAF50' : '#E53935' }]} />

                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircleMinimal, { backgroundColor: isReceiving ? '#4CAF5015' : '#E5393515' }]}>
                    {isReceiving ? (
                      <ArrowUpCircle size={20} color="#4CAF50" strokeWidth={2.5} />
                    ) : (
                      <ArrowDownCircle size={20} color="#E53935" strokeWidth={2.5} />
                    )}
                  </View>
                  <Typography.Body style={styles.cardHeaderText}>{title}</Typography.Body>
                </View>

                <View style={styles.amountContainer}>
                  <Typography.Header style={styles.amountTextLarge}>
                    {formatCurrency(balance.amount)}
                  </Typography.Header>
                  <Typography.Caption style={styles.balanceSubtitle}>{subtitle}</Typography.Caption>
                </View>

                <View style={styles.cardFooter}>
                  <Button
                    title={isBusy ? 'Settling...' : 'Mark Settled'}
                    variant={isReceiving ? 'secondary' : 'primary'}
                    disabled={Boolean(settlingCounterpartyId)}
                    onPress={() => handleSettle(balance.counterpartyId)}
                    style={styles.settleButton}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
      <BusyOverlay visible={Boolean(settlingCounterpartyId)} label="Updating balance..." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  scroll: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.md },
  screenIntro: { textAlign: 'center', color: Colors.textSecondary, marginBottom: Spacing.xs },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { marginBottom: 0, color: Colors.text },
  emptyText: { textAlign: 'center' },
  balanceCardPremium: {
    padding: Spacing.xl,
    borderRadius: 24,
    backgroundColor: Colors.white,
    gap: Spacing.md,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
    overflow: 'visible',
  },
  accentPill: {
    position: 'absolute',
    left: 0,
    top: Spacing.xl,
    bottom: Spacing.xl,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconCircleMinimal: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardHeaderText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  amountContainer: { marginVertical: Spacing.xs, gap: 4 },
  amountTextLarge: { color: Colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 0 },
  balanceSubtitle: { color: Colors.textSecondary, fontSize: 14 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: Spacing.md },
  settleButton: { width: '100%' },
});
