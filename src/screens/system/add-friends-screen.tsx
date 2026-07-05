import { friendsApi } from '@/api/social';
import { Avatar } from '@/components/common/avatar';
import { Button, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { Stack, useRouter } from 'expo-router';
import { debounce } from 'lodash';
import { ChevronLeft, Search, UserCheck } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddFriendsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const doSearch = async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const data = await friendsApi.search(q);
      setResults(data.users || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = useCallback(debounce(doSearch, 500), []);

  const onQueryChange = (text: string) => {
    setQuery(text);
    debouncedSearch(text);
  };

  const toggleSelect = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);
    const toSend = results.filter((u) => selected.includes(u.user_id));
    const failed: string[] = [];
    await Promise.allSettled(
      toSend.map((u) =>
        friendsApi.sendRequest(u.email).catch(() => failed.push(u.first_name)),
      ),
    );
    setSending(false);
    const successCount = toSend.length - failed.length;
    if (failed.length === 0) {
      Alert.alert(
        'Done',
        `Friend request${successCount > 1 ? 's' : ''} sent!`,
      );
    } else {
      Alert.alert(
        'Partial success',
        `Sent ${successCount} request${successCount !== 1 ? 's' : ''}. Could not send to: ${failed.join(', ')}.`,
      );
    }
    setSentIds((prev) => new Set([...prev, ...toSend.map((u) => u.user_id)]));
    setSelected([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>Add Friends</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography.Header style={styles.mainTitle}>
          Find people you know
        </Typography.Header>

        <View style={styles.searchBar}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email…"
            value={query}
            onChangeText={onQueryChange}
            placeholderTextColor={Colors.textSecondary}
            autoFocus
          />
        </View>

        {searching && (
          <ActivityIndicator
            size="small"
            color={Colors.primary}
            style={{ marginTop: Spacing.xl }}
          />
        )}

        {!searching && query.length >= 2 && results.length === 0 && (
          <Text style={styles.emptyText}>No users found.</Text>
        )}

        {!searching && results.length > 0 && (
          <View style={styles.sectionCard}>
            {results.map((user, idx) => {
              const isFriend = user.is_friend;
              const isSent = sentIds.has(user.user_id);
              const isSelected = selected.includes(user.user_id);
              const isLast = idx === results.length - 1;

              return (
                <View key={user.user_id}>
                  <TouchableOpacity
                    style={styles.itemRow}
                    onPress={() => {
                      if (!isFriend && !isSent) toggleSelect(user.user_id);
                    }}
                    activeOpacity={isFriend || isSent ? 1 : 0.75}
                  >
                    <View style={styles.avatar}>
                      <Avatar
                        imageUrl={user.avatar_url}
                        name={user.first_name}
                        size={44}
                      />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.first_name} {user.last_name}
                      </Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    {isFriend ? (
                      <View style={styles.badge}>
                        <UserCheck size={18} color={Colors.secondary} />
                        <Text style={styles.badgeText}>Friends</Text>
                      </View>
                    ) : isSent ? (
                      <View style={styles.badge}>
                        <Text style={styles.sentText}>Sent</Text>
                      </View>
                    ) : (
                      <View
                        style={[styles.checkbox, isSelected && styles.checkboxActive]}
                      >
                        {isSelected && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {results.length > 0 && (
        <View style={styles.footer}>
          <Button
            title={
              sending
                ? 'Sending…'
                : selected.length > 0
                  ? `Send ${selected.length} Request${selected.length > 1 ? 's' : ''}`
                  : 'Send Request'
            }
            onPress={handleSend}
            disabled={selected.length === 0 || sending}
            style={styles.sendBtn}
          />
        </View>
      )}
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
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0 },

  scroll: { padding: Spacing.xl, paddingBottom: 150 },
  mainTitle: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.lg, color: Colors.text },

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

  emptyText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.xl,
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
  avatar: { marginRight: Spacing.md },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.background,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: Colors.secondary },
  sentText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.itemBorder,
  },
  sendBtn: { height: 56, borderRadius: BorderRadius.round },
});
