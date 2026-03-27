import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import apiClient from '../../src/api/api-client';
import { groupsApi } from '../../src/api/social';
import { Button, Typography } from '../../src/components/Shared';
import { BorderRadius, Colors, Spacing } from '../../src/theme/theme';
import { Search } from 'lucide-react-native';

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
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchParticipants(selectedGroup);
    } else {
      setGroupParticipants([]);
    }
  }, [selectedGroup]);

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
      
      // Auto-select "Me"
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

  const fetchParticipants = async (groupId: string) => {
    setLoadingParticipants(true);
    try {
      const { users } = await groupsApi.getUsers(groupId);
      // Map users to participants format and default all to selected: true
      const mapped = users.map((u: any) => ({
        id: u.user_id || u.id,
        name: u.first_name ? `${u.first_name} ${u.last_name}` : (u.name || 'Member'),
        isSelected: true,
        isMe: currentUser && (u.user_id === currentUser.user_id || u.id === currentUser.user_id)
      }));
      setGroupParticipants(mapped);
    } catch (err) {
      Alert.alert('Error', 'Could not load group members.');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const toggleFriend = (user_id: string) => {
    setSelectedFriends(prev =>
      prev.includes(user_id) ? prev.filter(f => f !== user_id) : [...prev, user_id]
    );
  };

  const toggleParticipant = (participantId: string) => {
    setGroupParticipants(prev =>
      prev.map(p =>
        p.id === participantId ? { ...p, isSelected: !p.isSelected } : p
      )
    );
  };

  const selectGroup = (id: string) => {
    if (selectedGroup === id) {
      setSelectedGroup(null);
    } else {
      setSelectedGroup(id);
    }
  };

  const switchTab = (tab: 'friends' | 'groups') => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearchQuery('');
    // Reset selections when switching tabs
    setSelectedFriends(currentUser ? [currentUser.user_id] : []);
    setSelectedGroup(null);
    setGroupParticipants([]);
  };

  const filteredFriends = friends.filter(f => 
    `${f.first_name} ${f.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNext = () => {
    let participants: any[] = [];
    if (activeTab === 'groups') {
      if (!selectedGroup) {
        Alert.alert('Select a group', 'Please choose a group to split with.');
        return;
      }
      participants = groupParticipants
        .filter(p => p.isSelected)
        .map(p => ({
          id: p.id,
          name: p.name,
          isGroup: false
        }));
      
      if (participants.length === 0) {
        Alert.alert('Select participants', 'Please select at least one person from the group.');
        return;
      }
    } else {
      if (selectedFriends.length === 0) {
        Alert.alert('Select friends', 'Please choose at least one friend to split with.');
        return;
      }
      
      const selectedInList = friends.filter(f => selectedFriends.includes(f.user_id));
      participants = selectedInList.map(f => ({
        id: f.user_id,
        name: `${f.first_name} ${f.last_name}`
      }));
      
      if (currentUser && selectedFriends.includes(currentUser.user_id)) {
        // Only add if not already in list
        if (!participants.find(p => p.id === currentUser.user_id)) {
          participants.unshift({
            id: currentUser.user_id,
            name: `${currentUser.first_name} ${currentUser.last_name}`
          });
        }
      }
    }

    router.push({
      pathname: '/expense/choice',
      params: {
        participants: JSON.stringify(participants),
        groupId: selectedGroup || undefined
      }
    });
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
            {filteredGroups.length === 0 ? (
              <Text style={styles.emptyText}>No groups found.</Text>
            ) : (
              filteredGroups.map(group => {
                const isSelected = selectedGroup === group.group_id;
                return (
                  <View key={group.group_id}>
                    <TouchableOpacity
                      style={[
                        styles.itemRow,
                        isSelected && styles.itemRowSelected
                      ]}
                      onPress={() => selectGroup(group.group_id)}
                    >
                      <View style={[styles.avatar, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.avatarText, { color: '#0369A1' }]}>{group.name.charAt(0)}</Text>
                      </View>
                      <Text style={styles.itemName}>{group.name}</Text>
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected && <Text style={styles.check}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                    
                    {isSelected && (
                      <View style={styles.participantsContainer}>
                        <Text style={styles.participantsTitle}>PARTICIPANTS</Text>
                        {loadingParticipants ? (
                          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
                        ) : (
                          groupParticipants.map(participant => (
                            <TouchableOpacity
                              key={participant.id}
                              style={styles.participantRow}
                              onPress={() => toggleParticipant(participant.id)}
                            >
                              <View style={[styles.miniAvatar, { backgroundColor: participant.isMe ? '#FEE2E2' : '#F3F4F6' }]}>
                                <Text style={[styles.miniAvatarText, { color: participant.isMe ? '#B91C1C' : '#4B5563' }]}>
                                  {participant.name.charAt(0)}
                                </Text>
                              </View>
                              <Text style={styles.participantName}>{participant.name} {participant.isMe ? '(Me)' : ''}</Text>
                              <View style={[styles.miniCheckbox, participant.isSelected && styles.miniCheckboxActive]}>
                                {participant.isSelected && <Text style={styles.miniCheck}>✓</Text>}
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {/* "Me" option always first in friends list, unless search filters it out? */}
            {(currentUser && (!searchQuery || 'Me (You)'.toLowerCase().includes(searchQuery.toLowerCase()))) && (
              <TouchableOpacity
                key="me"
                style={[
                  styles.itemRow,
                  selectedFriends.includes(currentUser.user_id) && styles.itemRowSelected
                ]}
                onPress={() => toggleFriend(currentUser.user_id)}
              >
                <View style={[styles.avatar, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.avatarText, { color: '#B91C1C' }]}>Me</Text>
                </View>
                <Text style={styles.itemName}>Me (You)</Text>
                <View style={[styles.checkbox, selectedFriends.includes(currentUser.user_id) && styles.checkboxActive]}>
                  {selectedFriends.includes(currentUser.user_id) && <Text style={styles.check}>✓</Text>}
                </View>
              </TouchableOpacity>
            )}

            {filteredFriends.length === 0 ? (
              <Text style={styles.emptyText}>{searchQuery ? 'No friends found.' : "You don't have any friends yet."}</Text>
            ) : (
              filteredFriends.map(friend => {
                const isSelected = selectedFriends.includes(friend.user_id);
                return (
                  <TouchableOpacity
                    key={friend.friendship_id}
                    style={[
                      styles.itemRow,
                      isSelected && styles.itemRowSelected
                    ]}
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
                )
              })
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Confirm Participants"
          onPress={handleNext}
          disabled={!selectedGroup && selectedFriends.length === 0}
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
    borderWidth: 1,
    borderColor: Colors.itemBorder,
    marginBottom: Spacing.md,
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
  sectionTitle: { marginBottom: Spacing.md, fontSize: 13, letterSpacing: 1.2, color: Colors.textSecondary, fontWeight: '700' },
  listContainer: { gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontStyle: 'italic', paddingHorizontal: Spacing.md, textAlign: 'center', marginTop: Spacing.xl },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
  },
  itemRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF9F4',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  participantsContainer: {
    backgroundColor: Colors.white,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    marginTop: -1,
    marginBottom: Spacing.sm,
  },
  participantsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  miniAvatarText: { fontSize: 12, fontWeight: 'bold' },
  miniCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D4C5B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCheckboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  miniCheck: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
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
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D4C5B0', justifyContent: 'center', alignItems: 'center' },
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
