import apiClient from '@/api/api-client';
import { expensesApi } from '@/api/expenses';
import { groupsApi } from '@/api/social';
import { Button, Card, Typography } from '@/components/common/shared';
import { AddMemberModal } from '@/components/groups/add-member-modal';
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
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, Plus, Receipt, UserPlus } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [activeBalanceCard, setActiveBalanceCard] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - (Spacing.xl * 2);

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [profileRes, gData, mData, bData, eData] = await Promise.all([
        apiClient.get<User>('/user/profile'),
        groupsApi.get(groupId),
        groupsApi.getUsers(groupId),
        expensesApi.getGroupBalances(groupId),
        expensesApi.listUserExpenses(),
      ]);
      setCurrentUser(profileRes.data);
      setGroup(gData);
      setMembers(mData.users || []);
      setBalances(bData || []);
      setExpenses(
        (eData.expenses || [])
          .filter((exp: Expense) => exp.group_id === groupId)
          .sort((left: Expense, right: Expense) => {
            const rightTime = new Date(right.expense_date || right.created_at).getTime();
            const leftTime = new Date(left.expense_date || left.created_at).getTime();
            return rightTime - leftTime;
          })
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load group details.');
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

  const handleAddMember = async () => {
    setAddMemberVisible(true);
  };

  const memberLookup = useMemo(() => buildMemberLookup(members, currentUser), [members, currentUser]);

  const visibleBalances = useMemo(() => {
    const derivedBalances = deriveGroupBalancesFromExpenses(expenses);
    const sourceBalances = derivedBalances.length > 0 ? derivedBalances : balances;

    return sourceBalances
      .filter((balance) => Number(balance.balance) > 0)
      .sort((left, right) => Number(right.balance) - Number(left.balance));
  }, [balances, expenses]);

  const summary = useMemo(() => {
    if (!currentUser) {
      return { toReceive: 0, toPay: 0 };
    }

    return visibleBalances.reduce(
      (totals, balance) => {
        const direction = getBalanceDirectionForUser(balance, currentUser.user_id);
        if (!direction) return totals;
        if (direction.type === 'receive') totals.toReceive += direction.amount;
        if (direction.type === 'pay') totals.toPay += direction.amount;
        return totals;
      },
      { toReceive: 0, toPay: 0 }
    );
  }, [currentUser, visibleBalances]);

  const handleBalanceScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + Spacing.md));
    if (nextIndex !== activeBalanceCard) {
      setActiveBalanceCard(nextIndex);
    }
  };

  const balanceCards = [
    {
      key: 'receive',
      label: 'To Receive',
      amount: summary.toReceive,
      color: '#4CAF50', // Success Green
      caption: 'Total you are owed in this group',
      icon: ArrowUpCircle,
    },
    {
      key: 'pay',
      label: 'To Pay',
      amount: summary.toPay,
      color: '#E53935', // Danger Red
      caption: 'Total you owe to group members',
      icon: ArrowDownCircle,
    },
  ];

  if (loading || !group) {
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
        <Typography.SubHeader style={styles.headerTitle}>{group.name}</Typography.SubHeader>
        <TouchableOpacity onPress={handleAddMember} style={styles.headerAction}>
          <UserPlus size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.balanceSection}>
          <ScrollView
            horizontal
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + Spacing.md}
            snapToAlignment="start"
            contentContainerStyle={styles.balanceScrollContent}
            onMomentumScrollEnd={handleBalanceScroll}
          >
            {balanceCards.map((card, index) => (
              <Card
                key={card.key}
                style={[
                  styles.summaryCardPremium,
                  { width: cardWidth, marginRight: index === balanceCards.length - 1 ? 0 : Spacing.md },
                ]}
              >
                {/* Accent Pill */}
                <View style={[styles.accentPill, { backgroundColor: card.color }]} />

                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircleMinimal, { backgroundColor: `${card.color}15` }]}>
                    <card.icon size={20} color={card.color} strokeWidth={2.5} />
                  </View>
                  <Typography.Body style={styles.cardHeaderText}>{card.label}</Typography.Body>
                </View>

                <View style={styles.amountContainer}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    numberOfLines={1}
                    style={styles.amountTextLarge}
                  >
                    {formatCurrency(card.amount)}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Typography.Caption style={styles.cardFooterText}>{card.caption}</Typography.Caption>
                </View>
              </Card>
            ))}
          </ScrollView>

          <View style={styles.balanceDots}>
            {balanceCards.map((card, index) => (
              <View
                key={card.key}
                style={[
                  styles.balanceDot,
                  index === activeBalanceCard ? styles.balanceDotActive : { backgroundColor: '#E2E8F0' }
                ]}
              />
            ))}
          </View>
        </View>

        <Button
          title="Settle Up"
          variant="secondary"
          onPress={() => router.push({ pathname: '/settle-up', params: { groupId } })}
          style={{ marginBottom: Spacing.xl }}
        />

        {/* Balances Section */}
        <Typography.SubHeader style={styles.sectionTitle}>WHO OWES WHO</Typography.SubHeader>
        {visibleBalances.length === 0 ? (
          <Typography.Caption style={styles.emptyText}>All settled up! 🎉</Typography.Caption>
        ) : (
          visibleBalances.map((balance) => (
            <Card key={`${balance.user_id}-${balance.other_user_id}`} style={styles.balanceCard}>
              <Typography.Body style={styles.balanceText}>
                <Text style={styles.balanceActor}>{getDisplayName(balance.user_id, memberLookup)}</Text>
                {' '}owes{' '}
                <Text style={styles.balanceActor}>{getDisplayName(balance.other_user_id, memberLookup)}</Text>
              </Typography.Body>
              <Typography.Body style={styles.amountText}>{formatCurrency(Number(balance.balance) || 0)}</Typography.Body>
            </Card>
          ))
        )}

        {/* Recent Expenses Section */}
        <Typography.SubHeader style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>RECENT EXPENSES</Typography.SubHeader>
        {expenses.length === 0 ? (
          <Typography.Caption style={styles.emptyText}>No expenses yet.</Typography.Caption>
        ) : (
          expenses.map(exp => (
            <TouchableOpacity
              key={exp.expense_id}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/expense/view',
                  params: {
                    expenseId: exp.expense_id,
                    expense: JSON.stringify(exp),
                  },
                })
              }
            >
              <Card style={styles.expenseCard}>
                <View style={styles.receiptIcon}>
                  <Receipt size={20} color={Colors.primary} />
                </View>
                <View style={styles.expenseInfo}>
                  <Typography.Body style={styles.expenseDesc}>{exp.title}</Typography.Body>
                  <Typography.Caption>{new Date(exp.expense_date || exp.created_at).toLocaleDateString()}</Typography.Caption>
                </View>
                <Typography.Body style={styles.expenseAmount}>{formatCurrency(Number(exp.total_amount) || 0)}</Typography.Body>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Members Section */}
        <Typography.SubHeader style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>MEMBERS</Typography.SubHeader>
        <View style={styles.memberList}>
          {members.map((member, idx) => {
            const resolvedUserId = member?.user_id || member?.id;
            const displayName = resolvedUserId ? getDisplayName(resolvedUserId, memberLookup) : 'Member';
            const initial = displayName.charAt(0).toUpperCase() || '?';
            return (
              <View key={resolvedUserId || idx} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Typography.Body style={styles.avatarText}>{initial}</Typography.Body>
                </View>
                <Typography.Caption style={styles.memberName} numberOfLines={1}>
                  {displayName}
                </Typography.Caption>
              </View>
            );
          })}
          <TouchableOpacity style={styles.addMemberBtn} onPress={() => setAddMemberVisible(true)}>
            <Plus size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddMemberModal
        visible={addMemberVisible}
        onClose={() => setAddMemberVisible(false)}
        groupId={groupId || ''}
        currentMemberIds={members.map(m => m.user_id || m)}
        onSuccess={fetchData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.lg, 
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background
  },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0, fontWeight: '700' },
  backBtn: { padding: Spacing.xs },
  headerAction: { padding: Spacing.xs },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: 50 },
  
  summaryCardPremium: {
    height: 170,
    padding: Spacing.xl,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'space-between',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
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
  cardHeaderText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  amountContainer: { marginVertical: Spacing.xs },
  amountTextLarge: { color: Colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: Spacing.sm },
  cardFooterText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  balanceSection: { marginBottom: Spacing.md, marginHorizontal: -Spacing.lg }, // Negative margin to bleed to edges
  balanceScrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }, // Restore padding and room for shadow
  balanceDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: Spacing.lg },
  balanceDot: { width: 8, height: 8, borderRadius: 4 },
  balanceDotActive: { width: 20, height: 8, backgroundColor: Colors.text },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginBottom: Spacing.md },
  emptyText: { textAlign: 'center', marginTop: Spacing.md, color: Colors.textSecondary },
  
  balanceCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.lg, 
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderColor: Colors.itemBorder,
  },
  balanceText: { fontSize: 14, color: Colors.text },
  balanceActor: { fontWeight: '700' },
  amountText: { fontWeight: '700', fontSize: 16, color: Colors.primary },

  expenseCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.md, 
    marginBottom: Spacing.sm,
    borderRadius: 24,
    borderColor: Colors.itemBorder,
  },
  receiptIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontWeight: '600', fontSize: 15, marginBottom: 2 },
  expenseAmount: { fontWeight: '700', fontSize: 16 },

  memberList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  memberItem: { alignItems: 'center', width: 60 },
  memberAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText: { fontWeight: '700', color: Colors.primary },
  memberName: { textAlign: 'center', fontSize: 11 },
  addMemberBtn: { width: 50, height: 50, borderRadius: 25, borderStyle: 'dashed', borderWidth: 1.5, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
});
