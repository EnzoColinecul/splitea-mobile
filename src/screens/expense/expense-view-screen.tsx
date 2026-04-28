import apiClient from '@/api/api-client';
import { expensesApi } from '@/api/expenses';
import { groupsApi } from '@/api/social';
import { Card, Typography } from '@/components/common/shared';
import { Colors, Spacing } from '@/theme/theme';
import { Expense, User } from '@/types';
import { buildMemberLookup, formatCurrency, getDisplayName, getExpenseParticipantAmount } from '@/utils/expense-display';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Users } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ReceiptZigzag = ({ color = Colors.white, position = 'bottom' }: { color?: string, position?: 'top' | 'bottom' }) => {
  const toothWidth = 20;
  const count = Math.ceil(SCREEN_WIDTH / toothWidth) + 1;
  return (
    <View style={[styles.zigzagContainer, position === 'top' ? styles.zigzagTop : styles.zigzagBottom]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.zigzagTooth,
            { backgroundColor: color, left: i * toothWidth - toothWidth / 2 },
            position === 'top' ? { bottom: -10 } : { top: -10 },
          ]}
        />
      ))}
    </View>
  );
};

const BarcodeFooter = () => (
  <View style={styles.barcodeContainer}>
    {[1, 2, 4, 2, 1, 3, 2, 4, 1, 2, 1, 4, 2, 3].map((w, i) => (
      <View key={i} style={[styles.barcodeBar, { width: w }]} />
    ))}
  </View>
);

const Perforation = () => (
  <View style={styles.perforationRow}>
    {Array.from({ length: 40 }).map((_, i) => (
      <View key={i} style={styles.perforationDot} />
    ))}
  </View>
);

export default function ExpenseViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ expenseId?: string; expense?: string }>();
  const initialExpense = useMemo(() => {
    if (!params.expense) return null;

    try {
      return JSON.parse(params.expense) as Expense;
    } catch (error) {
      return null;
    }
  }, [params.expense]);

  const [expense, setExpense] = useState<Expense | null>(initialExpense);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadExpense = async () => {
      try {
        const profilePromise = apiClient.get<User>('/user/profile');
        const expensePromise = initialExpense
          ? Promise.resolve(initialExpense)
          : expensesApi.listUserExpenses().then((response) =>
              (response.expenses || []).find((item) => item.expense_id === params.expenseId) || null
            );

        const [profileRes, resolvedExpense] = await Promise.all([profilePromise, expensePromise]);

        if (cancelled) return;

        setCurrentUser(profileRes.data);

        if (!resolvedExpense) {
          Alert.alert('Expense not found', 'We could not load this expense.');
          router.back();
          return;
        }

        setExpense(resolvedExpense);

        if (resolvedExpense.group_id) {
          const groupUsersRes = await groupsApi.getUsers(resolvedExpense.group_id);
          if (!cancelled) {
            setMembers(groupUsersRes.users || []);
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          Alert.alert('Error', 'Could not load expense details.');
          router.back();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadExpense();

    return () => {
      cancelled = true;
    };
  }, [initialExpense, params.expenseId, router]);

  const memberLookup = useMemo(() => buildMemberLookup(members, currentUser), [members, currentUser]);
  const paidByName = expense ? getDisplayName(expense.paid_by, memberLookup) : 'Member';

  if (loading || !expense) {
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
        <Typography.SubHeader style={styles.headerTitle}>Expense Details</Typography.SubHeader>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header Hero Card (Receipt Shape) */}
        <View style={styles.receiptWrapper}>
          <ReceiptZigzag position="top" />
          
          <View style={styles.heroCardPremium}>
            <View style={styles.receiptHeader}>
              <Typography.Caption style={styles.receiptLabel}>RECEIPT</Typography.Caption>
              <Typography.Caption style={styles.receiptStars}>***</Typography.Caption>
            </View>

            <View style={styles.heroTitleContainerCenter}>
              <Typography.SubHeader style={styles.expenseTitleReceipt}>{expense.title}</Typography.SubHeader>
              <Typography.Caption style={styles.expenseDateReceipt}>
                {new Date(expense.expense_date || expense.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </Typography.Caption>
            </View>

            <Perforation />

            <View style={styles.amountContainerReceipt}>
              <Typography.Caption style={styles.totalLabel}>TOTAL:</Typography.Caption>
              <Typography.Header style={styles.amountTextReceipt}>
                {formatCurrency(Number(expense.total_amount) || 0)}
              </Typography.Header>
            </View>

            <Perforation />

            <View style={styles.metaGridReceipt}>
              <View style={styles.metaItemReceipt}>
                <Typography.Caption style={styles.metaLabelReceipt}>PAID BY</Typography.Caption>
                <Typography.Body style={styles.metaValueReceipt} numberOfLines={1}>{paidByName}</Typography.Body>
              </View>
              <View style={styles.metaItemReceipt}>
                <Typography.Caption style={styles.metaLabelReceipt}>CURRENCY</Typography.Caption>
                <Typography.Body style={styles.metaValueReceipt}>{expense.currency || 'ARS'}</Typography.Body>
              </View>
              <View style={styles.metaItemReceipt}>
                <Typography.Caption style={styles.metaLabelReceipt}>SPLIT TYPE</Typography.Caption>
                <Typography.Body style={styles.metaValueReceipt}>{expense.split_type?.replace('_', ' ') || 'Equally'}</Typography.Body>
              </View>
              <View style={styles.metaItemReceipt}>
                <Typography.Caption style={styles.metaLabelReceipt}>YOUR SHARE</Typography.Caption>
                <Typography.Body style={[styles.metaValueReceipt, { color: Colors.secondary }]}>
                  {currentUser ? formatCurrency(getExpenseParticipantAmount(expense, currentUser.user_id)) : formatCurrency(0)}
                </Typography.Body>
              </View>
            </View>

            <Typography.Caption style={styles.receiptStarsBottom}>***</Typography.Caption>
            <BarcodeFooter />
          </View>
          
          <ReceiptZigzag position="bottom" />
        </View>

        {expense.description ? (
          <Card style={styles.sectionCardPremium}>
            <Typography.SectionHeader style={styles.premiumSectionHeader}>Description</Typography.SectionHeader>
            <Typography.Body style={{ marginTop: Spacing.xs }}>{expense.description}</Typography.Body>
          </Card>
        ) : null}

        <Card style={styles.sectionCardPremium}>
          <View style={styles.sectionHeaderRow}>
            <Typography.SectionHeader style={styles.premiumSectionHeader}>Split Details</Typography.SectionHeader>
            <Users size={18} color={Colors.primary} />
          </View>

          <View style={styles.splitList}>
            {expense.splits?.map((split, idx) => {
              const displayName = getDisplayName(split.user_id, memberLookup);
              const initial = displayName.charAt(0).toUpperCase() || '?';
              const isPayer = split.user_id === expense.paid_by;

              return (
                <View key={split.expense_split_id}>
                  <View style={styles.splitRowModern}>
                    <View style={styles.splitAvatar}>
                      <Typography.Body style={styles.avatarText}>{initial}</Typography.Body>
                    </View>
                    <View style={styles.splitInfo}>
                      <Typography.Body style={styles.splitNameText}>{displayName}</Typography.Body>
                      <Typography.Caption numberOfLines={1}>
                        {isPayer ? 'Paid for the entire expense' : 'Owes part of the split'}
                      </Typography.Caption>
                    </View>
                    <Typography.Body style={styles.splitAmountText}>
                      {formatCurrency(Number(split.amount_owed) || 0)}
                    </Typography.Body>
                  </View>
                  {idx < (expense.splits?.length || 0) - 1 ? <View style={styles.listDivider} /> : null}
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCardPremium}>
          <Typography.SectionHeader style={styles.premiumSectionHeader}>Receipt</Typography.SectionHeader>
          <Typography.Caption style={{ marginTop: Spacing.xs }}>
            {expense.receipt_url ? 'Receipt captured for this expense.' : 'No receipt attached.'}
          </Typography.Caption>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0, fontWeight: '700' },
  headerSpacer: { width: 36 },
  scroll: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.lg },
  
  receiptWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: Colors.white,
    overflow: 'visible',
    marginHorizontal: Spacing.sm,
  },
  heroCardPremium: {
    padding: Spacing.xl,
    backgroundColor: 'transparent',
    borderWidth: 0,
    gap: Spacing.lg,
    position: 'relative',
    overflow: 'visible',
  },
  zigzagContainer: {
    height: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  zigzagTop: { marginBottom: -6 },
  zigzagBottom: { marginTop: -6 },
  zigzagTooth: {
    width: 20,
    height: 20,
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
  },
  receiptHeader: { alignItems: 'center', marginBottom: -Spacing.sm },
  receiptLabel: { fontWeight: '800', letterSpacing: 4, color: '#94A3B8', fontSize: 13 },
  receiptStars: { letterSpacing: 2, color: '#CBD5E1', marginTop: 2 },
  receiptStarsBottom: { textAlign: 'center', letterSpacing: 8, color: '#CBD5E1', marginVertical: Spacing.sm },
  heroTitleContainerCenter: { alignItems: 'center', gap: 2 },
  expenseTitleReceipt: { textAlign: 'center', fontWeight: '900', color: Colors.text, fontSize: 24, textTransform: 'capitalize' },
  expenseDateReceipt: { textAlign: 'center', color: Colors.textSecondary },
  
  amountContainerReceipt: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  totalLabel: { fontWeight: '700', fontSize: 16, color: Colors.textSecondary },
  amountTextReceipt: { fontSize: 48, fontWeight: '900', color: Colors.text, marginBottom: 0 },

  perforationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 1,
    overflow: 'hidden',
  },
  perforationDot: {
    width: 5,
    height: 1.5,
    backgroundColor: '#F1F5F9',
    borderRadius: 1,
  },

  metaGridReceipt: { gap: Spacing.md },
  metaItemReceipt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabelReceipt: { fontWeight: '700', fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.5 },
  metaValueReceipt: { fontWeight: '800', color: Colors.text, fontSize: 16 },

  barcodeContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'flex-end', 
    height: 32, 
    gap: 1.5,
    opacity: 0.8,
  },
  barcodeBar: { backgroundColor: '#1E293B', height: '100%', borderRadius: 0.5 },
  metaLabelText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  metaValueText: { fontWeight: '700', color: Colors.text, fontSize: 15 },

  sectionCardPremium: { padding: Spacing.xl, borderRadius: 24, backgroundColor: Colors.white, gap: Spacing.md, borderWidth: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  premiumSectionHeader: { marginBottom: 0, fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  splitList: { gap: 0 },
  splitRowModern: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  splitAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '700', color: Colors.primary },
  splitInfo: { flex: 1 },
  splitNameText: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
  splitAmountText: { fontWeight: '700', color: Colors.secondary, fontSize: 16 },
  listDivider: { height: 1, backgroundColor: '#F1F5F9' },
});
