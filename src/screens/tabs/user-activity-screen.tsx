import { expensesApi } from '@/api/expenses';
import { paymentsApi } from '@/api/payments';
import { friendsApi } from '@/api/social';
import { userApi } from '@/api/user';
import { Avatar } from '@/components/common/avatar';
import { Button, Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { ActivityItem, Expense, Friend, UserActivityResponse, User } from '@/types';
import { formatCurrency } from '@/utils/expense-display';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronLeft, CreditCard, Info, X } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
};

export default function UserActivityScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [data, setData] = useState<UserActivityResponse | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [friend, setFriend] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeEligible, setStripeEligible] = useState<boolean | null>(null);
  const [stripeReason, setStripeReason] = useState<string | null>(null);
  const [reasonVisible, setReasonVisible] = useState(false);
  const reasonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showReason = () => {
    if (reasonTimer.current) clearTimeout(reasonTimer.current);
    setReasonVisible(true);
    reasonTimer.current = setTimeout(() => setReasonVisible(false), 3000);
  };
  const [userExpenses, setUserExpenses] = useState<Expense[]>([]);
  const [pickerExpenses, setPickerExpenses] = useState<Expense[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setReasonVisible(false);
    try {
      const [profile, friends, activity, expenses] = await Promise.all([
        userApi.getProfile(),
        friendsApi.list(),
        expensesApi.getUserActivity(userId, { limit: 100 }),
        expensesApi.listUserExpenses(),
      ]);
      setMe(profile);
      setFriend(friends.find((f) => f.user_id === userId) || null);
      setData(activity);
      setUserExpenses(expenses.expenses || []);

      // Check whether the counterparty can receive a Stripe payment, so we can
      // surface the reason here instead of one screen later. Non-blocking.
      const firstPayableSplit = (expenses.expenses || [])
        .filter((exp) => exp.paid_by === userId)
        .map((exp) => exp.splits?.find((s) => s.user_id === profile.user_id && s.is_paid !== 'true'))
        .find((split): split is NonNullable<typeof split> => Boolean(split));

      if (firstPayableSplit) {
        paymentsApi.getEligibility(firstPayableSplit.expense_split_id)
          .then((data) => {
            const stripe = data.providers.find((p) => p.provider === 'stripe');
            setStripeEligible(stripe?.enabled ?? false);
            setStripeReason(stripe?.message ?? stripe?.reason ?? null);
          })
          .catch(() => {});
      } else {
        setStripeEligible(null);
        setStripeReason(null);
      }
    } catch (e) {
      console.error('Failed to load activity', e);
    } finally {
      setLoading(false);
    }

    // Non-blocking — button just won't show if this fails
    paymentsApi.getStripeAccount()
      .then((acct) => setStripeConnected(acct.connected))
      .catch(() => {});
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const handleSettle = async () => {
    if (!userId) return;
    try {
      setSettling(true);
      await expensesApi.settleUp(userId);
      await fetchData();
      Alert.alert('Settled', 'Your balance with this user has been settled.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not settle up.');
    } finally {
      setSettling(false);
    }
  };

  const handlePayViaStripe = () => {
    if (!userId || !me) return;

    const payable = userExpenses.filter(
      (exp) =>
        exp.paid_by === userId &&
        exp.splits?.some((s) => s.user_id === me.user_id && s.is_paid !== 'true')
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

  if (loading || !data) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const friendName = friend ? `${friend.first_name} ${friend.last_name}` : 'User';
  const net = data.net_balance;
  const netColor = net > 0 ? Colors.secondary : net < 0 ? Colors.danger : Colors.textSecondary;
  const netLabel = net > 0 ? 'owes you' : net < 0 ? 'you owe' : 'settled';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>Activity</Typography.SubHeader>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.profileCard}>
          <Avatar
            imageUrl={friend?.avatar_url}
            name={friendName}
            size={72}
          />
          <Typography.Header style={styles.profileName}>{friendName}</Typography.Header>
          <Text style={[styles.netAmount, { color: netColor }]}>
            {netLabel === 'settled'
              ? 'All settled'
              : `${netLabel} ${formatCurrency(Math.abs(net))}`}
          </Text>
          {Math.abs(net) > 0.005 && (
            <Button
              title={settling ? 'Settling…' : 'Settle up'}
              onPress={handleSettle}
              variant="primary"
              style={styles.settleBtn}
              disabled={settling}
            />
          )}
          {net < -0.005 && stripeConnected && (
            stripeEligible === false ? (
              <View style={styles.stripeButton}>
                <View style={[styles.stripeButtonContent, styles.stripeButtonDisabled]}>
                  <CreditCard size={16} color={Colors.primary} strokeWidth={2} />
                  <Typography.Body style={styles.stripeButtonText}>Pay via Stripe</Typography.Body>
                </View>
                <TouchableOpacity
                  style={styles.infoBtn}
                  onPress={showReason}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Info size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.stripeButton, settling && styles.stripeButtonDisabled]}
                onPress={handlePayViaStripe}
                disabled={settling}
                activeOpacity={0.75}
              >
                <CreditCard size={16} color={Colors.primary} strokeWidth={2} />
                <Typography.Body style={styles.stripeButtonText}>Pay via Stripe</Typography.Body>
              </TouchableOpacity>
            )
          )}
        </Card>

        <Typography.SubHeader style={styles.sectionTitle}>Activity</Typography.SubHeader>

        {data.items.length === 0 ? (
          <Card style={styles.empty}>
            <Typography.Body style={{ color: Colors.textSecondary }}>
              No shared expenses yet.
            </Typography.Body>
          </Card>
        ) : (
          <Card style={styles.list}>
            {data.items.map((item, idx) => (
              <View key={item.id}>
                <ActivityRow item={item} meId={me?.user_id || ''} />
                {idx < data.items.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

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
                (s) => s.user_id === me?.user_id && s.is_paid !== 'true'
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

function ActivityRow({ item, meId }: { item: ActivityItem; meId: string }) {
  const isSettleUp = item.type === 'settle_up';
  const isStripe = isSettleUp && item.payment_method === 'stripe';
  const iPaid = item.paid_by === meId;
  const shareOther = item.amount - item.your_share;
  const Icon = isSettleUp ? (isStripe ? CreditCard : CheckCircle2) : iPaid ? ArrowDownLeft : ArrowUpRight;
  const color = isSettleUp
    ? Colors.textSecondary
    : iPaid
      ? Colors.secondary
      : Colors.danger;
  const settleVerb = isStripe ? 'paid with card' : 'settled up';
  const subline = isSettleUp
    ? iPaid
      ? `You ${settleVerb}`
      : `They ${settleVerb}`
    : iPaid
      ? `You paid · they owe ${formatCurrency(shareOther)}`
      : `They paid · you owe ${formatCurrency(item.your_share)}`;

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
        <Icon size={18} color={color} strokeWidth={2.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Typography.Body style={styles.rowTitle}>{item.title || 'Expense'}</Typography.Body>
        <Typography.Caption style={styles.rowSub}>
          {subline}
          {item.group_name ? ` · ${item.group_name}` : ' · Individual'}
        </Typography.Caption>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Typography.Body style={[styles.rowAmount, { color }]}>
          {formatCurrency(item.amount)}
        </Typography.Body>
        <Typography.Caption style={styles.rowDate}>{formatDate(item.expense_date)}</Typography.Caption>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, gap: Spacing.lg },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs, width: 32 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  profileCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  profileName: { fontSize: 22, fontWeight: '800', marginTop: Spacing.md },
  netAmount: { fontSize: 24, fontWeight: '700', marginTop: Spacing.sm },
  settleBtn: { marginTop: Spacing.md, alignSelf: 'stretch' },
  sectionTitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.6 },
  empty: { padding: Spacing.lg, alignItems: 'center' },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontWeight: '700', fontSize: 15 },
  rowSub: { color: Colors.textSecondary, marginTop: 2, fontSize: 12 },
  rowAmount: { fontWeight: '700', fontSize: 14 },
  rowDate: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.itemBorder, marginHorizontal: Spacing.md },

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
    marginTop: Spacing.sm,
  },
  stripeButtonContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, justifyContent: 'center' },
  stripeButtonDisabled: { opacity: 0.45 },
  stripeButtonText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  infoBtn: { padding: Spacing.xs },
  popoverBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
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
