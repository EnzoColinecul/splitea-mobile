import apiClient from '@/api/api-client';
import { expensesApi } from '@/api/expenses';
import { paymentsApi } from '@/api/payments';
import { groupsApi } from '@/api/social';
import { BusyOverlay, Button, Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { EligibilityProvider, Expense, Group, GroupBalance, User } from '@/types';
import {
    buildMemberLookup,
    deriveGroupBalancesFromExpenses,
    formatCurrency,
    getBalanceDirectionForUser,
    getDisplayName,
} from '@/utils/expense-display';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, CreditCard, Info, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
  const [stripeConnected, setStripeConnected] = useState(false);
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, EligibilityProvider | null>>({});
  const [reasonVisible, setReasonVisible] = useState(false);
  const [stripeReason, setStripeReason] = useState<string | null>(null);
  const reasonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pickerExpenses, setPickerExpenses] = useState<Expense[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const showReason = (message: string | null) => {
    if (reasonTimer.current) clearTimeout(reasonTimer.current);
    setStripeReason(message);
    setReasonVisible(true);
    reasonTimer.current = setTimeout(() => setReasonVisible(false), 3000);
  };

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
        expensesApi.getGroupExpenses(groupId),
      ]);

      const profile = profileRes.data;
      const fetchedExpenses = expensesRes.expenses || [];
      setCurrentUser(profile);
      setGroup(groupRes);
      setMembers(usersRes.users || []);
      setBalances(balancesRes || []);
      setExpenses(fetchedExpenses);

      // Non-blocking — check eligibility per counterparty so we can show
      // the disabled button + reason before navigating into the expense view
      const derivedBalances = deriveGroupBalancesFromExpenses(fetchedExpenses);
      const balancesToCheck = (derivedBalances.length > 0 ? derivedBalances : balancesRes || []);
      balancesToCheck.forEach((bal) => {
        const direction = getBalanceDirectionForUser(bal, profile.user_id);
        if (!direction || direction.type !== 'pay') return;
        const firstSplit = fetchedExpenses
          .filter((exp) => exp.paid_by === direction.counterpartyId)
          .map((exp) => exp.splits?.find((s) => s.user_id === profile.user_id && s.is_paid !== 'true'))
          .find((s): s is NonNullable<typeof s> => Boolean(s));
        if (!firstSplit) return;
        paymentsApi.getEligibility(firstSplit.expense_split_id)
          .then((data) => {
            const stripe = data.providers.find((p) => p.provider === 'stripe') ?? null;
            setEligibilityMap((prev) => ({ ...prev, [direction.counterpartyId]: stripe }));
          })
          .catch(() => {});
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not load settle up details.');
    } finally {
      setLoading(false);
    }

    // Non-blocking — don't need to await, button just won't show if this fails
    paymentsApi.getStripeAccount()
      .then(acct => setStripeConnected(acct.connected))
      .catch(() => {});
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

  const handlePayViaStripe = (counterpartyId: string) => {
    if (!currentUser) return;

    // Find expenses where the counterparty paid and we have an unpaid split
    const payable = expenses.filter(
      (exp) =>
        exp.paid_by === counterpartyId &&
        exp.splits?.some((s) => s.user_id === currentUser.user_id && s.is_paid !== 'true')
    );

    if (payable.length === 0) {
      Alert.alert('Nothing to pay', 'No payable expense splits found for this balance.');
      return;
    }

    if (payable.length === 1) {
      router.push({ pathname: '/expense/view', params: { expense: JSON.stringify(payable[0]) } } as never);
      return;
    }

    setPickerExpenses(payable);
    setPickerVisible(true);
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
            const showStripeButton = !isReceiving && stripeConnected;
            const stripeEligible = eligibilityMap[balance.counterpartyId];

            return (
              <Card key={`${balance.user_id}-${balance.other_user_id}`} style={styles.balanceCardPremium}>
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
                    style={styles.footerButton}
                  />
                  {showStripeButton && (
                    stripeEligible?.enabled === false ? (
                      <View style={[styles.stripeButton, styles.stripeButtonDisabledContainer]}>
                        <View style={[styles.stripeButtonContent, styles.stripeButtonDisabled]}>
                          <CreditCard size={16} color={Colors.primary} strokeWidth={2} />
                          <Typography.Body style={styles.stripeButtonText}>Pay via Stripe</Typography.Body>
                        </View>
                        <TouchableOpacity
                          style={styles.infoBtn}
                          onPress={() => showReason(stripeEligible.message ?? stripeEligible.reason ?? null)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Info size={18} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.stripeButton, Boolean(settlingCounterpartyId) && styles.stripeButtonDisabled]}
                        onPress={() => handlePayViaStripe(balance.counterpartyId)}
                        disabled={Boolean(settlingCounterpartyId)}
                        activeOpacity={0.75}
                      >
                        <CreditCard size={16} color={Colors.primary} strokeWidth={2} />
                        <Typography.Body style={styles.stripeButtonText}>Pay via Stripe</Typography.Body>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Expense picker — shown when multiple expenses are payable for one balance */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Typography.SubHeader style={styles.pickerTitle}>Choose an expense to pay</Typography.SubHeader>
              <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {pickerExpenses.map((exp, idx) => {
              const split = exp.splits?.find(
                (s) => s.user_id === currentUser?.user_id && s.is_paid !== 'true'
              );
              const isLast = idx === pickerExpenses.length - 1;
              return (
                <TouchableOpacity
                  key={exp.expense_id}
                  style={[styles.pickerItem, !isLast && styles.pickerItemBorder]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setPickerVisible(false);
                    router.push({ pathname: '/expense/view', params: { expense: JSON.stringify(exp) } } as never);
                  }}
                >
                  <View style={styles.pickerItemInfo}>
                    <Typography.Body style={styles.pickerItemTitle}>{exp.title}</Typography.Body>
                    <Typography.Caption>
                      {new Date(exp.expense_date || exp.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </Typography.Caption>
                  </View>
                  <Typography.Body style={styles.pickerItemAmount}>
                    {formatCurrency(Number(split?.amount_owed) || 0)}
                  </Typography.Body>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <BusyOverlay visible={Boolean(settlingCounterpartyId)} label="Updating balance..." />

      {reasonVisible && (
        <TouchableOpacity
          style={styles.popoverBackdrop}
          activeOpacity={1}
          onPress={() => setReasonVisible(false)}
        >
          <View style={styles.popover}>
            <Info size={16} color={Colors.primary} strokeWidth={2} />
            <Typography.Caption style={styles.popoverText}>
              {stripeReason ?? "This person hasn't connected Stripe yet, so card payments aren't available."}
            </Typography.Caption>
          </View>
        </TouchableOpacity>
      )}
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
    alignItems: 'center',
  },
  cardHeaderText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  amountContainer: { marginVertical: Spacing.xs, gap: 4 },
  amountTextLarge: { color: Colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 0 },
  balanceSubtitle: { color: Colors.textSecondary, fontSize: 14 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: Spacing.md, gap: Spacing.sm },
  footerButton: { width: '100%' },
  stripeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.round,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    width: '100%',
  },
  stripeButtonDisabledContainer: { justifyContent: 'space-between' },
  stripeButtonContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, justifyContent: 'center' },
  stripeButtonDisabled: { opacity: 0.45 },
  stripeButtonText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  infoBtn: { padding: Spacing.xs },
  popoverBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  popover: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.text,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  popoverText: { color: Colors.white, lineHeight: 18, flex: 1 },

  // Expense picker modal
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 48,
    paddingHorizontal: Spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  pickerTitle: { fontSize: 17, marginBottom: 0, color: Colors.text },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  pickerItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.itemBorder },
  pickerItemInfo: { flex: 1, gap: 2 },
  pickerItemTitle: { fontWeight: '700', fontSize: 15, color: Colors.text },
  pickerItemAmount: { fontWeight: '700', color: Colors.primary, fontSize: 16 },
});
