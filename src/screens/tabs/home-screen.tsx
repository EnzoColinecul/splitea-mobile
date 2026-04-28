import apiClient from '@/api/api-client';
import { expensesApi } from '@/api/expenses';
import { notificationApi } from '@/api/notifications';
import { Card, Typography } from '@/components/common/shared';
import { Colors, Spacing } from '@/theme/theme';
import { DashboardSummary, User } from '@/types';
import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Bell, Wallet } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeBalanceCard, setActiveBalanceCard] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - (Spacing.xl * 2);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, sRes, eRes, nRes] = await Promise.all([
        apiClient.get('/user/profile'),
        expensesApi.getSummary(),
        expensesApi.listUserExpenses({ limit: 5 }),
        notificationApi.list({ is_read: false, limit: 1 })
      ]);
      setUser(uRes.data);
      setSummary(sRes);
      setExpenses(eRes.expenses || []);
      setNotifCount(nRes.total);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const formatCurrency = (amt: number = 0) => {
    try {
      if (typeof amt !== 'number') return '$0.00';
      return `$${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } catch (e) {
      // Fallback for environments where toLocaleString fails with options
      return `$${amt.toFixed(2)}`;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const netBalance = summary?.net_balance || 0;
  const mainBalance = Math.abs(netBalance);
  const balanceLabel = netBalance >= 0 ? 'You are owed' : 'You owe';
  const balanceColor = netBalance >= 0 ? Colors.secondary : Colors.danger;
  const totalPaid = summary?.total_paid || 0;
  const totalOwed = summary?.total_owed || 0;
  const balanceCards = [
    {
      key: 'net',
      label: 'Net Balance',
      amount: mainBalance,
      color: '#FF7A00', // Primary Orange
      caption: balanceLabel,
      icon: Wallet,
    },
    {
      key: 'owed',
      label: 'You are Owed',
      amount: totalPaid,
      color: '#4CAF50', // Success Green
      caption: 'Collect from friends',
      icon: ArrowDownLeft,
    },
    {
      key: 'owe',
      label: 'You Owe',
      amount: totalOwed,
      color: '#E53935', // Danger Red
      caption: 'Settle soon to stay even',
      icon: ArrowUpRight,
    },
  ];


  const handleBalanceScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + Spacing.md));
    if (nextIndex !== activeBalanceCard) {
      setActiveBalanceCard(nextIndex);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >

        {/* Header */}
        <View style={styles.header}>
          <Typography.Header style={styles.logoText}>Spliteá!</Typography.Header>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Bell size={24} color={Colors.text} />
              {notifCount > 0 && <View style={styles.badge}><Typography.Caption style={styles.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Typography.Caption></View>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Typography.Header style={styles.greetingTitle}>Welcome back, {user?.first_name || 'there'}</Typography.Header>
          <Typography.Body style={styles.greetingSubtitle}>Here's your expense summary.</Typography.Body>
        </View>

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
                  styles.summaryCard,
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
                    style={styles.amountText}
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

        {/* Recent Activity */}
        <View style={styles.recentHeader}>
          <Typography.SubHeader style={styles.recentTitle}>Recent Activity</Typography.SubHeader>
          <TouchableOpacity><Typography.Body style={styles.seeAll}>See all</Typography.Body></TouchableOpacity>
        </View>

        <Card style={styles.activityPanel}>
          {expenses.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Typography.Body style={styles.emptyText}>No recent activity yet.</Typography.Body>
            </View>
          ) : (
            expenses.map((activity, idx) => {
              const amountOwed = activity.splits?.find((s: any) => s.user_id === user?.user_id)?.amount_owed || 0;
              const isPayer = activity.paid_by === user?.user_id;

              return (
                <View key={activity.expense_id || idx}>
                  <View style={styles.activityItem}>
                    <View style={styles.activityInfo}>
                      <Typography.Body style={styles.activityName}>{activity.title}</Typography.Body>
                      <Typography.Caption style={styles.activityDesc}>
                        {isPayer ? 'You paid' : `${activity.payer_name || 'Someone'} paid`}
                      </Typography.Caption>
                    </View>
                    <View style={styles.activityAmountContainer}>
                      {isPayer ? (
                        <Typography.Body style={[styles.activityAmount, { color: Colors.secondary }]}>
                          You are owed {formatCurrency(activity.total_amount - amountOwed)}
                        </Typography.Body>
                      ) : (
                        <Typography.Body style={[styles.activityAmount, { color: Colors.danger }]}>
                          You owe {formatCurrency(amountOwed)}
                        </Typography.Body>
                      )}
                      <Typography.Caption style={styles.activityTime}>{getTimeAgo(activity.created_at)}</Typography.Caption>
                    </View>
                  </View>
                  {idx < expenses.length - 1 ? <View style={styles.activityDivider} /> : null}
                </View>
              );
            })
          )}
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, // Very light slate/blue hint for contrast
  scrollContent: { padding: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 10 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  logoText: { color: Colors.primary, fontSize: 28, fontWeight: '900', marginBottom: 0 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBtn: { padding: Spacing.xs, position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.danger, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  greetingContainer: { marginBottom: Spacing.lg },
  greetingTitle: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  greetingSubtitle: { color: Colors.textSecondary, fontSize: 16 },
  balanceSection: { marginBottom: Spacing.md },
  balanceScrollContent: { paddingRight: Spacing.xl, paddingVertical: Spacing.lg }, // Added vertical padding for shadow room
  summaryCard: {
    height: 170,
    padding: Spacing.xl,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'space-between',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 1.2,
    elevation: 12,
    position: 'relative',
    overflow: 'visible', // Explicitly allow shadow flow
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
  amountText: { color: Colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: Spacing.sm },
  cardFooterText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  balanceDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: Spacing.lg },
  balanceDot: { width: 8, height: 8, borderRadius: 4 },
  balanceDotActive: { width: 20, height: 8, backgroundColor: Colors.text },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  recentTitle: { fontSize: 18, color: Colors.textSecondary, marginBottom: 0 },
  seeAll: { color: Colors.primary, fontWeight: '700' },
  activityPanel: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  activityDivider: { height: 1, backgroundColor: Colors.itemBorder },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', marginRight: Spacing.md, borderWidth: 1, borderColor: Colors.itemBorder },
  activityInfo: { flex: 1 },
  activityName: { fontWeight: '700', fontSize: 16, marginBottom: 2 },
  activityDesc: { color: Colors.textSecondary },
  activityAmountContainer: { alignItems: 'flex-end' },
  activityAmount: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  activityTime: { color: Colors.textSecondary, fontSize: 12 },
  emptyActivity: { padding: Spacing.xl, alignItems: 'center', backgroundColor: '#FFFDFC', borderRadius: 20, borderWidth: 1.5, borderColor: Colors.itemBorder, borderStyle: 'dashed' },
  emptyText: { color: Colors.textSecondary, fontStyle: 'italic' },
});
