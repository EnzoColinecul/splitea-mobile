import { groupsApi } from '@/api/social';
import { Avatar } from '@/components/common/avatar';
import { Button, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { Group } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ChevronRight, Pencil, Pin, PinOff, Plus, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinningId, setPinningId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroups();
  }, [fetchGroups]);

  const togglePin = async (group: Group) => {
    try {
      setPinningId(group.group_id);
      if (group.is_pinned) {
        await groupsApi.unpin(group.group_id);
      } else {
        await groupsApi.pin(group.group_id);
      }
      await fetchGroups();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Could not update pin.');
    } finally {
      setPinningId(null);
    }
  };

  const renderGroupItem = ({ item, index }: { item: Group; index: number }) => {
    const isLast = index === groups.length - 1;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() =>
          router.push({ pathname: '/group-detail' as never, params: { groupId: item.group_id } } as never)
        }
        style={[styles.listItem, !isLast && styles.listItemBorder]}
      >
        <View style={styles.groupInfo}>
          <Avatar
            imageUrl={item.picture_url}
            emoji={item.emoji}
            name={item.name}
            size={56}
            backgroundColor="#EEF2FF"
            textColor={Colors.primary}
          />
          <View style={styles.textContainer}>
            <View style={styles.nameRow}>
              <Typography.Body style={styles.groupName} numberOfLines={1}>
                {item.name}
              </Typography.Body>
              {item.is_pinned && (
                <View style={styles.pinBadge}>
                  <Pin size={12} color={Colors.primary} fill={Colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.memberRow}>
              <Users size={14} color={Colors.textSecondary} />
              <Typography.Caption style={styles.memberCount}>
                {item.members_count || 0} members
              </Typography.Caption>
            </View>
          </View>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity
            hitSlop={10}
            onPress={() => togglePin(item)}
            disabled={pinningId === item.group_id}
            style={styles.iconBtn}
          >
            {item.is_pinned ? (
              <PinOff size={18} color={Colors.primary} />
            ) : (
              <Pin size={18} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={10}
            onPress={() =>
              router.push({ pathname: '/edit-group' as never, params: { groupId: item.group_id } } as never)
            }
            style={styles.iconBtn}
          >
            <Pencil size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
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
    backgroundColor: Colors.background,
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
  groupInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md },
  textContainer: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  groupName: { fontWeight: '800', fontSize: 17, color: Colors.text, maxWidth: 180 },
  pinBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCount: { fontSize: 13, color: Colors.textSecondary },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  iconBtn: { padding: Spacing.xs },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 100, color: Colors.textSecondary },
});
