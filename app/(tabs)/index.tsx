import { ArrowDownLeft, Bell } from 'lucide-react-native';
import React from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Typography } from '../../src/components/Shared';
import { Colors, Spacing } from '../../src/theme/theme';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <Typography.Header style={styles.logoText}>Spliteá!</Typography.Header>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Bell size={24} color={Colors.text} />
              <View style={styles.badge}><Typography.Caption style={styles.badgeText}>1</Typography.Caption></View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Typography.Header style={styles.greetingTitle}>Welcome back, Juan</Typography.Header>
          <Typography.Body style={styles.greetingSubtitle}>Here's your expense summary.</Typography.Body>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <ArrowDownLeft size={16} color={Colors.secondary} />
            </View>
            <Typography.Body style={styles.cardHeaderText}>You are owed</Typography.Body>
          </View>
          <Typography.Header style={styles.amountText}>$2,450.00</Typography.Header>
          <Typography.Caption style={styles.cardFooterText}>From 4 friends</Typography.Caption>
        </Card>

        {/* Recent Activity */}
        <View style={styles.recentHeader}>
          <Typography.SubHeader style={styles.recentTitle}>Recent Activity</Typography.SubHeader>
          <TouchableOpacity><Typography.Body style={styles.seeAll}>See all</Typography.Body></TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {/* Item 1 */}
          <View style={styles.activityItem}>
            <View style={styles.avatarPlaceholder} />
            <View style={styles.activityInfo}>
              <Typography.Body style={styles.activityName}>Grocery run</Typography.Body>
              <Typography.Caption style={styles.activityDesc}>Martin paid ...</Typography.Caption>
            </View>
            <View style={styles.activityAmountContainer}>
              <Typography.Body style={[styles.activityAmount, { color: Colors.danger }]}>You owe $28.47</Typography.Body>
              <Typography.Caption style={styles.activityTime}>2h ago</Typography.Caption>
            </View>
          </View>

          {/* Item 2 */}
          <View style={styles.activityItem}>
            <View style={styles.avatarPlaceholder} />
            <View style={styles.activityInfo}>
              <Typography.Body style={styles.activityName}>Payment received</Typography.Body>
              <Typography.Caption style={styles.activityDesc}>Lucia settled up</Typography.Caption>
            </View>
            <View style={styles.activityAmountContainer}>
              <Typography.Body style={[styles.activityAmount, { color: Colors.secondary }]}>+$120.00</Typography.Body>
              <Typography.Caption style={styles.activityTime}>5h ago</Typography.Caption>
            </View>
          </View>

          {/* Item 3 */}
          <View style={styles.activityItem}>
            <View style={styles.avatarPlaceholder} />
            <View style={styles.activityInfo}>
              <Typography.Body style={styles.activityName}>Electricity...</Typography.Body>
              <Typography.Caption style={styles.activityDesc}>Split equally...</Typography.Caption>
            </View>
            <View style={styles.activityAmountContainer}>
              <Typography.Body style={[styles.activityAmount, { color: Colors.danger }]}>You owe $42.30</Typography.Body>
              <Typography.Caption style={styles.activityTime}>1d ago</Typography.Caption>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  summaryCard: { backgroundColor: '#F8FAFC', padding: Spacing.xl, marginBottom: Spacing.xl, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.itemBorder, shadowOpacity: 0 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  cardHeaderText: { color: Colors.textSecondary, fontWeight: '600' },
  amountText: { color: Colors.primary, fontSize: 40, fontWeight: '900', marginBottom: 8 },
  cardFooterText: { color: Colors.textSecondary, fontSize: 15 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  recentTitle: { fontSize: 18, color: Colors.textSecondary, marginBottom: 0 },
  seeAll: { color: Colors.primary, fontWeight: '700' },
  activityList: { gap: Spacing.lg },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.white, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.itemBorder },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', marginRight: Spacing.md, borderWidth: 1, borderColor: Colors.itemBorder },
  activityInfo: { flex: 1 },
  activityName: { fontWeight: '700', fontSize: 16, marginBottom: 2 },
  activityDesc: { color: Colors.textSecondary },
  activityAmountContainer: { alignItems: 'flex-end' },
  activityAmount: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
  activityTime: { color: Colors.textSecondary, fontSize: 12 },
});
