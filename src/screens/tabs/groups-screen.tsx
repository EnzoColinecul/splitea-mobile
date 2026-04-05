import { ChevronRight, Plus, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { groupsApi } from '@/api/social';
import { Button, Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { Group } from '@/types';

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

  const renderGroupItem = ({ item, index }: { item: Group; index: number }) => {
    const isLast = index === groups.length - 1;
    return (
      <TouchableOpacity 
        activeOpacity={0.75} 
        onPress={() => router.push({ pathname: '/group-detail' as never, params: { groupId: item.group_id } } as never)}
        style={[styles.listItem, !isLast && styles.listItemBorder]}
      >
        <View style={styles.groupInfo}>
          <View style={styles.avatar}>
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
          <ChevronRight size={16} color={Colors.textSecondary} style={{ marginLeft: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography.Header style={styles.title}>Groups</Typography.Header>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-group' as never)}>
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
              <Button title="Create your first group" onPress={() => router.push('/create-group' as never)} style={{ marginTop: Spacing.lg }} />
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
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.itemBorder,
  },
  groupInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#EEF2FF', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.itemBorder
  },
  avatarText: { fontWeight: '800', fontSize: 22, color: Colors.primary },
  textContainer: { flex: 1, gap: 2 },
  groupName: { fontWeight: '800', fontSize: 18, color: Colors.text },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCount: { fontSize: 13, color: Colors.textSecondary },
  balanceContainer: { flexDirection: 'row', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 100, color: Colors.textSecondary },
});
