import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';

export default function FriendsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography.Header style={styles.title}>Friends</Typography.Header>
        <TouchableOpacity style={styles.addBtn}>
          <Typography.Body style={styles.addBtnText}>Invite</Typography.Body>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography.SubHeader style={styles.sectionTitle}>RECENT FRIENDS</Typography.SubHeader>
        <View style={styles.list}>
          <Card style={styles.friendCard}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#F0FDF4' }]}>
              <Typography.Body style={{ color: '#15803D', fontWeight: 'bold' }}>E</Typography.Body>
            </View>
            <View style={styles.friendInfo}>
              <Typography.Body style={styles.friendName}>Enzo lefleur</Typography.Body>
              <Typography.Caption>Settled up recently</Typography.Caption>
            </View>
          </Card>
          <Card style={styles.friendCard}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#F0F9FF' }]}>
              <Typography.Body style={{ color: '#0369A1', fontWeight: 'bold' }}>Y</Typography.Body>
            </View>
            <View style={styles.friendInfo}>
              <Typography.Body style={styles.friendName}>Yave helesco</Typography.Body>
              <Typography.Caption>Settled up recently</Typography.Caption>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 0 },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.round },
  addBtnText: { color: Colors.white, fontWeight: '700' },
  scroll: { padding: Spacing.lg },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1.2, marginBottom: Spacing.md },
  list: { gap: Spacing.md },
  friendCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, borderWidth: 1, borderColor: Colors.itemBorder },
  friendInfo: { flex: 1 },
  friendName: { fontWeight: '700', fontSize: 16 }
});
