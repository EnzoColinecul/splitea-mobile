import apiClient from '@/api/api-client';
import { Button, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function groupByLetter<T>(items: T[], key: (i: T) => string) {
  const map: Record<string, T[]> = {};
  items.forEach(i => {
    const l = key(i).charAt(0).toUpperCase();
    (map[l] ??= []).push(i);
  });
  return Object.keys(map).sort().map(l => ({ letter: l, items: map[l] }));
}

export default function ExpenseMethodScreen() {
  const router = useRouter();

  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [fRes, gRes, uRes] = await Promise.all([
        apiClient.get('/friend/list'),
        apiClient.get('/group/list'),
        apiClient.get('/user/profile')
      ]);
      setFriends(fRes.data.friends || []);
      setGroups(gRes.data.groups || []);
      setCurrentUser(uRes.data);

      if (uRes.data) {
        setSelectedFriends([uRes.data.user_id]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load friends or groups.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (user_id: string) => {
    setSelectedFriends(prev =>
      prev.includes(user_id) ? prev.filter(f => f !== user_id) : [...prev, user_id]
    );
  };

  const switchTab = (tab: 'friends' | 'groups') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedFriends(currentUser ? [currentUser.user_id] : []);
    setSelectedGroup(null);
  };

  const filteredFriends = friends.filter(f =>
    `${f.first_name} ${f.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFriends = [...filteredFriends].sort((a, b) =>
    a.first_name.localeCompare(b.first_name)
  );
  const friendSections = groupByLetter(sortedFriends, f => f.first_name);

  const sortedGroups = [...filteredGroups].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const groupSections = groupByLetter(sortedGroups, g => g.name);

  const handleNext = () => {
    if (activeTab === 'groups') {
      if (!selectedGroup) {
        Alert.alert('Select a group', 'Please choose a group to split with.');
        return;
      }
      const group = groups.find(g => g.group_id === selectedGroup);
      router.push({
        pathname: '/expense/group-participants',
        params: { groupId: selectedGroup, groupName: group?.name ?? '' },
      });
    } else {
      if (selectedFriends.length === 0) {
        Alert.alert('Select friends', 'Please choose at least one friend to split with.');
        return;
      }

      const selectedInList = friends.filter(f => selectedFriends.includes(f.user_id));
      const participants: any[] = selectedInList.map(f => ({
        id: f.user_id,
        name: `${f.first_name} ${f.last_name}`
      }));

      if (currentUser && selectedFriends.includes(currentUser.user_id)) {
        if (!participants.find(p => p.id === currentUser.user_id)) {
          participants.unshift({
            id: currentUser.user_id,
            name: `${currentUser.first_name} ${currentUser.last_name}`
          });
        }
      }

      router.push({
        pathname: '/expense/choice',
        params: {
          participants: JSON.stringify(participants),
        }
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
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
        <Typography.SubHeader style={styles.headerTitle}>Select Participants</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} stickyHeaderIndices={[1]}>
        <Typography.Header style={styles.mainTitle}>Who are you splitting with?</Typography.Header>

        <View style={styles.stickyHeader}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab === 'friends' ? 'friends' : 'groups'}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
              onPress={() => switchTab('friends')}
            >
              <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
              onPress={() => switchTab('groups')}
            >
              <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Groups</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'groups' ? (
          <View style={styles.listContainer}>
            {groupSections.length === 0 ? (
              <Text style={styles.emptyText}>No groups found.</Text>
            ) : (
              groupSections.map(section => (
                <View key={section.letter}>
                  <Text style={styles.sectionLetter}>{section.letter}</Text>
                  <View style={styles.sectionCard}>
                    {section.items.map((group, idx) => {
                      const isSelected = selectedGroup === group.group_id;
                      return (
                        <View key={group.group_id}>
                          <TouchableOpacity
                            style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                            onPress={() => setSelectedGroup(isSelected ? null : group.group_id)}
                          >
                            <View style={[styles.avatar, { backgroundColor: '#E0F2FE' }]}>
                              <Text style={[styles.avatarText, { color: '#0369A1' }]}>{group.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.itemName}>{group.name}</Text>
                            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                              {isSelected && <Text style={styles.check}>✓</Text>}
                            </View>
                          </TouchableOpacity>
                          {idx < section.items.length - 1 && <View style={styles.divider} />}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {currentUser && (!searchQuery || `${currentUser.first_name} ${currentUser.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())) && (
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  style={[styles.itemRow, selectedFriends.includes(currentUser.user_id) && styles.itemRowSelected]}
                  onPress={() => toggleFriend(currentUser.user_id)}
                >
                  <View style={[styles.avatar, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.avatarText, { color: '#B91C1C' }]}>{currentUser.first_name.charAt(0)}</Text>
                  </View>
                  <View style={styles.nameContainer}>
                    <Text style={styles.itemName}>{currentUser.first_name} {currentUser.last_name}</Text>
                    <Text style={styles.youTag}>You</Text>
                  </View>
                  <View style={[styles.checkbox, selectedFriends.includes(currentUser.user_id) && styles.checkboxActive]}>
                    {selectedFriends.includes(currentUser.user_id) && <Text style={styles.check}>✓</Text>}
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {friendSections.length === 0 && searchQuery ? (
              <Text style={styles.emptyText}>No friends found.</Text>
            ) : friendSections.length === 0 ? (
              <Text style={styles.emptyText}>You don't have any friends yet.</Text>
            ) : (
              friendSections.map(section => (
                <View key={section.letter}>
                  <Text style={styles.sectionLetter}>{section.letter}</Text>
                  <View style={styles.sectionCard}>
                    {section.items.map((friend, idx) => {
                      const isSelected = selectedFriends.includes(friend.user_id);
                      return (
                        <View key={friend.friendship_id}>
                          <TouchableOpacity
                            style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                            onPress={() => toggleFriend(friend.user_id)}
                          >
                            <View style={[styles.avatar, { backgroundColor: '#F0FDF4' }]}>
                              <Text style={[styles.avatarText, { color: '#15803D' }]}>{friend.first_name.charAt(0)}</Text>
                            </View>
                            <Text style={styles.itemName}>{friend.first_name} {friend.last_name}</Text>
                            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                              {isSelected && <Text style={styles.check}>✓</Text>}
                            </View>
                          </TouchableOpacity>
                          {idx < section.items.length - 1 && <View style={styles.divider} />}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={activeTab === 'groups' ? 'Select Participants →' : 'Confirm Participants'}
          onPress={handleNext}
          disabled={activeTab === 'groups' ? !selectedGroup : selectedFriends.length === 0}
          style={styles.nextBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0 },
  scroll: { padding: Spacing.xl, paddingBottom: 150 },
  mainTitle: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.lg, color: Colors.text },
  stickyHeader: { backgroundColor: Colors.background, paddingBottom: Spacing.md },
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.itemBorder },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  listContainer: { gap: 0 },
  emptyText: { color: Colors.textSecondary, fontStyle: 'italic', paddingHorizontal: Spacing.md, textAlign: 'center', marginTop: Spacing.xl },
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
  itemRowSelected: {
    backgroundColor: '#FFF9F4',
  },
  divider: { height: 1, backgroundColor: Colors.background, marginLeft: 76 },
  nameContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  youTag: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: '#FFF3EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontWeight: 'bold', fontSize: 18 },
  itemName: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  check: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
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
  nextBtn: { height: 56, borderRadius: BorderRadius.round },
});
