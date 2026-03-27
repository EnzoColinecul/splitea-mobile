import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft, Plus, UserPlus, Receipt, ArrowUpCircle, ArrowDownCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { groupsApi } from '@/api/social';
import { expensesApi } from '@/api/expenses';
import { Card, Typography, Button } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { Group, Expense } from '@/types';
import { AddMemberModal } from '@/components/groups/add-member-modal';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMemberVisible, setAddMemberVisible] = useState(false);

  useEffect(() => {
    if (groupId) fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      const [gData, mData, bData, eData] = await Promise.all([
        groupsApi.get(groupId),
        groupsApi.getUsers(groupId),
        expensesApi.getGroupBalances(groupId),
        expensesApi.listUserExpenses() // Filtering locally for now
      ]);
      setGroup(gData);
      setMembers(mData.users || []);
      setBalances(bData || []);
      setExpenses((eData.expenses || []).filter((exp: Expense) => exp.group_id === groupId));
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load group details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    setAddMemberVisible(true);
  };

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
        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Typography.Caption style={styles.summaryLabel}>Group Totals</Typography.Caption>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <ArrowUpCircle size={20} color="#059669" />
              <Typography.Header style={[styles.balanceValue, { color: '#059669' }]}>
                $0
              </Typography.Header>
              <Typography.Caption>To receive</Typography.Caption>
            </View>
            <View style={styles.divider} />
            <View style={styles.balanceItem}>
              <ArrowDownCircle size={20} color="#DC2626" />
              <Typography.Header style={[styles.balanceValue, { color: '#DC2626' }]}>
                $0
              </Typography.Header>
              <Typography.Caption>To pay</Typography.Caption>
            </View>
          </View>
          <Button title="Settle Up" variant="secondary" onPress={() => {}} style={{ marginTop: Spacing.md }} />
        </Card>

        {/* Balances Section */}
        <Typography.SubHeader style={styles.sectionTitle}>WHO OWES WHO</Typography.SubHeader>
        {balances.length === 0 ? (
          <Typography.Caption style={styles.emptyText}>All settled up! 🎉</Typography.Caption>
        ) : (
          balances.map((b, i) => (
            <Card key={i} style={styles.balanceCard}>
              <Typography.Body style={styles.balanceText}>
                <Text style={{ fontWeight: '700' }}>{b.user_id}</Text> owes <Text style={{ fontWeight: '700' }}>{b.other_user_id}</Text>
              </Typography.Body>
              <Typography.Body style={styles.amountText}>${b.balance}</Typography.Body>
            </Card>
          ))
        )}

        {/* Recent Expenses Section */}
        <Typography.SubHeader style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>RECENT EXPENSES</Typography.SubHeader>
        {expenses.length === 0 ? (
          <Typography.Caption style={styles.emptyText}>No expenses yet.</Typography.Caption>
        ) : (
          expenses.map(exp => (
            <TouchableOpacity key={exp.expense_id} activeOpacity={0.7}>
              <Card style={styles.expenseCard}>
                <View style={styles.receiptIcon}>
                  <Receipt size={20} color={Colors.primary} />
                </View>
                <View style={styles.expenseInfo}>
                  <Typography.Body style={styles.expenseDesc}>{exp.title}</Typography.Body>
                  <Typography.Caption>{new Date(exp.expense_date || exp.created_at).toLocaleDateString()}</Typography.Caption>
                </View>
                <Typography.Body style={styles.expenseAmount}>${exp.total_amount}</Typography.Body>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Members Section */}
        <Typography.SubHeader style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>MEMBERS</Typography.SubHeader>
        <View style={styles.memberList}>
          {members.map((member, idx) => {
            const name = typeof member === 'string' ? 'Member' : (member.first_name || 'Member');
            const initial = typeof member === 'string' ? '?' : (member.first_name?.charAt(0).toUpperCase() || '?');
            return (
              <View key={idx} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Typography.Body style={styles.avatarText}>{initial}</Typography.Body>
                </View>
                <Typography.Caption style={styles.memberName} numberOfLines={1}>
                  {name}
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
  
  summaryCard: { padding: Spacing.lg, marginBottom: Spacing.xl, backgroundColor: '#F8FAFC', borderRadius: 24, borderColor: Colors.itemBorder },
  summaryLabel: { textAlign: 'center', marginBottom: Spacing.md, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: Spacing.md },
  balanceItem: { alignItems: 'center', gap: 4 },
  balanceValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  divider: { width: 1, height: 40, backgroundColor: Colors.itemBorder },

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
