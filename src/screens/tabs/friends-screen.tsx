import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar } from '@/components/common/avatar';
import { Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { friendsApi } from '@/api/social';
import { Friend } from '@/types';
import { formatCurrency } from '@/utils/expense-display';
import { useRouter } from 'expo-router';
import { Search, UserPlus, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function groupByLetter<T>(items: T[], key: (i: T) => string) {
  const map: Record<string, T[]> = {};
  items.forEach((i) => {
    const l = key(i).charAt(0).toUpperCase();
    (map[l] ??= []).push(i);
  });
  return Object.keys(map)
    .sort()
    .map((l) => ({ letter: l, items: map[l] }));
}

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const data = await friendsApi.list();
      setFriends(data);
    } catch (error) {
      console.error('Failed to load friends', error);
      Alert.alert('Error', 'Could not load friends list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFriends();
  }, []);

  const filtered = friends.filter((f) =>
    `${f.first_name} ${f.last_name}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const sortedFriends = [...filtered].sort((a, b) =>
    a.first_name.localeCompare(b.first_name),
  );
  const friendSections = groupByLetter(sortedFriends, (f) => f.first_name);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Typography.Header style={styles.title}>Friends</Typography.Header>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/add-friends' as never)}
        >
          <UserPlus size={18} color={Colors.white} style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textSecondary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <Typography.SubHeader style={styles.sectionTitle}>
            MY FRIENDS ({friends.length})
          </Typography.SubHeader>

          {friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Typography.Body style={styles.emptyText}>
                You haven't added any friends yet.
              </Typography.Body>
              <Typography.Caption style={{ textAlign: 'center', marginTop: Spacing.xs }}>
                Tap "Add" to find and invite your friends!
              </Typography.Caption>
            </View>
          ) : filtered.length === 0 ? (
            <Typography.Body style={styles.emptyText}>No friends found.</Typography.Body>
          ) : (
            friendSections.map((section) => (
              <View key={section.letter}>
                <Text style={styles.sectionLetter}>{section.letter}</Text>
                <View style={styles.sectionCard}>
                  {section.items.map((friend, idx) => {
                    const net = friend.net_balance ?? 0;
                    const balanceColor =
                      net > 0.005
                        ? Colors.secondary
                        : net < -0.005
                          ? Colors.danger
                          : Colors.textSecondary;
                    const balanceLabel =
                      net > 0.005 ? 'owes you' : net < -0.005 ? 'you owe' : 'settled';
                    return (
                      <View key={friend.user_id}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.itemRow}
                          onPress={() =>
                            router.push({
                              pathname: '/user-activity',
                              params: { userId: friend.user_id },
                            })
                          }
                        >
                          <View style={styles.avatarWrap}>
                            <Avatar
                              imageUrl={friend.avatar_url}
                              name={friend.first_name}
                              size={44}
                            />
                          </View>
                          <View style={styles.friendInfo}>
                            <Text style={styles.friendName}>
                              {friend.first_name} {friend.last_name}
                            </Text>
                            <Text style={styles.friendEmail}>{friend.email}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.balanceLabel, { color: balanceColor }]}>
                              {balanceLabel}
                            </Text>
                            <Text style={[styles.balanceAmount, { color: balanceColor }]}>
                              {Math.abs(net) > 0.005 ? formatCurrency(Math.abs(net)) : '—'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {idx < section.items.length - 1 && (
                          <View style={styles.divider} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
  addBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    height: 50,
    borderRadius: 15,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  sectionLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background,
    marginLeft: 76,
  },

  avatarWrap: { marginRight: Spacing.md },
  friendInfo: { flex: 1 },
  friendName: { fontWeight: '700', fontSize: 16, color: Colors.text },
  friendEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: { fontSize: 15, fontWeight: '700', marginTop: 2 },
});
