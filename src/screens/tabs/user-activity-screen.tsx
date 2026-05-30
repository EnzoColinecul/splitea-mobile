import apiClient from '@/api/api-client';
import { expensesApi } from '@/api/expenses';
import { friendsApi } from '@/api/social';
import { Avatar } from '@/components/common/avatar';
import { Button, Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { ActivityItem, Friend, UserActivityResponse, User } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatCurrency = (amt: number, currency: string = 'USD') => {
  const sign = amt < 0 ? '-' : '';
  return `${sign}$${Math.abs(amt).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

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

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [profileRes, friends, activity] = await Promise.all([
        apiClient.get<User>('/user/profile'),
        friendsApi.list(),
        expensesApi.getUserActivity(userId, { limit: 100 }),
      ]);
      setMe(profileRes.data);
      setFriend(friends.find((f) => f.user_id === userId) || null);
      setData(activity);
    } catch (e) {
      console.error('Failed to load activity', e);
    } finally {
      setLoading(false);
    }
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
    </SafeAreaView>
  );
}

function ActivityRow({ item, meId }: { item: ActivityItem; meId: string }) {
  const isSettleUp = item.type === 'settle_up';
  const iPaid = item.paid_by === meId;
  const shareOther = item.amount - item.your_share;
  const Icon = isSettleUp ? CheckCircle2 : iPaid ? ArrowDownLeft : ArrowUpRight;
  const color = isSettleUp
    ? Colors.textSecondary
    : iPaid
      ? Colors.secondary
      : Colors.danger;
  const subline = isSettleUp
    ? iPaid
      ? 'You settled up'
      : 'They settled up'
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
});
