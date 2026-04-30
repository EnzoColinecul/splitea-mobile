import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { friendsApi } from '@/api/social';
import { Friend } from '@/types';
import { Search, UserPlus, UserCheck, X } from 'lucide-react-native';
import { debounce } from 'lodash';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);

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

  const handleSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const data = await friendsApi.search(query);
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((nextValue: string) => handleSearch(nextValue), 500),
    []
  );

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
  };

  const sendInvite = async (user: any) => {
    try {
      setSendingRequestId(user.user_id);
      await friendsApi.sendRequest(user.email);
      Alert.alert('Success', `Friend request sent to ${user.first_name}!`);
      // Update local state to show "Sent" or similar if needed
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to send friend request';
      Alert.alert('Invitation Failed', msg);
    } finally {
      setSendingRequestId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Typography.Header style={styles.title}>Friends</Typography.Header>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email…"
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholderTextColor={Colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {searchQuery.length > 0 ? (
          <>
            <Typography.SubHeader style={styles.sectionTitle}>SEARCH RESULTS</Typography.SubHeader>
            {searching ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
            ) : searchResults.length === 0 ? (
              <Typography.Body style={styles.emptyText}>No users found with that name or email.</Typography.Body>
            ) : (
              <View style={styles.list}>
                {searchResults.map((user) => (
                  <Card key={user.user_id} style={styles.friendCard}>
                    <View style={[styles.avatarPlaceholder, { backgroundColor: '#F3F4F6' }]}>
                      <Typography.Body style={{ color: Colors.text, fontWeight: 'bold' }}>
                        {user.first_name.charAt(0)}
                      </Typography.Body>
                    </View>
                    <View style={styles.friendInfo}>
                      <Typography.Body style={styles.friendName}>{`${user.first_name} ${user.last_name}`}</Typography.Body>
                      <Typography.Caption>{user.email}</Typography.Caption>
                    </View>
                    {user.is_friend ? (
                      <View style={styles.statusBadge}>
                        <UserCheck size={20} color={Colors.secondary} />
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.actionBtn} 
                        onPress={() => sendInvite(user)}
                        disabled={sendingRequestId === user.user_id}
                      >
                        {sendingRequestId === user.user_id ? (
                          <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                          <UserPlus size={20} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <Typography.SubHeader style={styles.sectionTitle}>MY FRIENDS ({friends.length})</Typography.SubHeader>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
            ) : friends.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Typography.Body style={styles.emptyText}>You haven't added any friends yet.</Typography.Body>
                <Typography.Caption style={{ textAlign: 'center', marginTop: Spacing.xs }}>
                  Use the search bar above to find and invite your friends!
                </Typography.Caption>
              </View>
            ) : (
              <View style={styles.list}>
                {friends.map((friend) => (
                  <Card key={friend.user_id} style={styles.friendCard}>
                    <View style={[styles.avatarPlaceholder, { backgroundColor: '#F0FDF4' }]}>
                      <Typography.Body style={{ color: '#15803D', fontWeight: 'bold' }}>
                        {(friend.first_name || 'U').charAt(0)}
                      </Typography.Body>
                    </View>
                    <View style={styles.friendInfo}>
                      <Typography.Body style={styles.friendName}>
                        {friend.first_name} {friend.last_name}
                      </Typography.Body>
                      <Typography.Caption>{friend.email}</Typography.Caption>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    paddingTop: 20,
    marginBottom: Spacing.sm,
  },
  headerLeft: { gap: 2 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 0 },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: 14,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 8,
  },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1.2, marginBottom: Spacing.md },
  list: { gap: Spacing.md },
  friendCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.itemBorder,
  },
  avatarPlaceholder: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: Spacing.md,
  },
  friendInfo: { flex: 1 },
  friendName: { fontWeight: '700', fontSize: 16, color: Colors.text },
  actionBtn: {
    padding: Spacing.sm,
  },
  statusBadge: {
    padding: Spacing.sm,
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: { 
    color: Colors.textSecondary, 
    textAlign: 'center',
    marginTop: Spacing.md,
  }
});
