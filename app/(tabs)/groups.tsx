import { Plus, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { groupsApi } from '../../src/api/social';
import { Button, Card, Typography } from '../../src/components/Shared';
import { BorderRadius, Colors, Spacing } from '../../src/theme/theme';
import { Group } from '../../src/types';

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroups();
  }, []);

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={() => router.push({ pathname: '/group-detail', params: { groupId: item.group_id } })}
    >
      <Card style={styles.groupCard}>
        <View style={styles.groupInfo}>
          <View style={[styles.avatar, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.textContainer}>
            <Typography.Body style={styles.groupName}>{item.name}</Typography.Body>
            <View style={styles.memberRow}>
              <Users size={14} color={Colors.textSecondary} />
              <Typography.Caption style={styles.memberCount}>
                {item.members_count || 0} members
              </Typography.Caption>
            </View>
          </View>
        </View>
        <View style={styles.balanceContainer}>
          <Typography.Caption style={styles.balanceLabel}>Balanced</Typography.Caption>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography.Header style={styles.title}>Groups</Typography.Header>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-group')}>
          <Plus size={18} color={Colors.white} style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.group_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Typography.Body style={styles.emptyText}>You haven't joined any groups yet.</Typography.Body>
              <Button title="Create your first group" onPress={() => router.push('/create-group')} style={{ marginTop: Spacing.lg }} />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.lg, 
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background
  },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text },
  createBtn: { 
    backgroundColor: Colors.primary, 
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.round,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  createBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  list: { padding: Spacing.lg },
  groupCard: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  groupInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder
  },
  avatarText: { fontWeight: '700', fontSize: 20, color: Colors.primary },
  textContainer: { flex: 1 },
  groupName: { fontWeight: '700', fontSize: 17, color: Colors.text, marginBottom: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCount: { fontSize: 13, color: Colors.textSecondary },
  balanceContainer: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 100, color: Colors.textSecondary },
});
