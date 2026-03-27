import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { friendsApi, groupsApi } from '../../api/social';
import { BorderRadius, Colors, Spacing } from '../../theme/theme';
import { Friend, Group } from '../../types';
import { Input, Typography } from '../Shared';

export interface Participant {
  id: string;
  name: string;
}

interface ParticipantSelectorProps {
  onSelectionChange: (participants: Participant[], groupId?: string) => void;
  currentUser: Participant;
}

export const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({ onSelectionChange, currentUser }) => {
  const [mode, setMode] = useState<'friends' | 'group'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFriends();
    fetchGroups();
  }, []);

  const fetchFriends = async () => {
    try {
      const data = await friendsApi.list();
      setFriends(data);
    } catch (e) {
      console.error('Failed to fetch friends', e);
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch (e) {
      console.error('Failed to fetch groups', e);
    }
  };

  const handleModeSwitch = (newMode: 'friends' | 'group') => {
    if (newMode === mode) return;
    setMode(newMode);
    setSelectedFriendIds(new Set());
    setSelectedGroupId(null);
    setSearchQuery('');
    onSelectionChange([currentUser]);
  };

  const toggleFriend = (friend: Friend) => {
    const targetId = friend.user_id || friend.friend_id;
    const next = new Set(selectedFriendIds);
    if (next.has(targetId)) next.delete(targetId);
    else next.add(targetId);
    setSelectedFriendIds(next);
    
    const selectedParticipants = Array.from(next).map(id => {
      const f = friends.find(fr => (fr.user_id || fr.friend_id) === id);
      return { id: id, name: f ? `${f.first_name}` : 'Unknown' };
    });
    
    onSelectionChange([currentUser, ...selectedParticipants]);
  };

  const selectGroup = async (groupId: string, groupName: string) => {
    setSelectedGroupId(groupId);
    try {
      const data = await groupsApi.getUsers(groupId);
      const participants = data.users.map(id => {
        const f = friends.find(fr => (fr.user_id || fr.friend_id) === id);
        if (id === currentUser.id) return currentUser;
        return { id, name: f ? `${f.first_name}` : 'Member' };
      });
      if (!participants.find(p => p.id === currentUser.id)) participants.unshift(currentUser);
      onSelectionChange(participants, groupId);
    } catch (e) {
      console.error('Failed to fetch group users', e);
      onSelectionChange([currentUser], groupId);
    }
  };

  return (
    <View style={styles.container}>
      <Typography.SubHeader style={styles.title}>WITH</Typography.SubHeader>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, mode === 'friends' && styles.activeTab]} 
          onPress={() => handleModeSwitch('friends')}
        >
          <Text style={[styles.tabText, mode === 'friends' && styles.activeTabText]}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, mode === 'group' && styles.activeTab, groups.length === 0 && { opacity: 0.5 }]} 
          disabled={groups.length === 0}
          onPress={() => handleModeSwitch('group')}
        >
          <Text style={[styles.tabText, mode === 'group' && styles.activeTabText]}>Group</Text>
        </TouchableOpacity>
      </View>

      {mode === 'friends' ? (
        <View>
          <View style={styles.searchContainer}>
            <Input 
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search friends..."
            />
          </View>
          <ScrollView style={styles.listVertical} nestedScrollEnabled={true}>
            {friends.filter(f => 
              (f.first_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
              (f.last_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
            ).map(friend => {
              const targetId = friend.user_id || friend.friend_id; 
              const isSelected = selectedFriendIds.has(targetId);
              return (
                <TouchableOpacity
                  key={friend.friend_id || friend.user_id}
                  style={[styles.itemVertical, isSelected && styles.activeItem]}
                  onPress={() => toggleFriend(friend)}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={[styles.avatar, isSelected && styles.activeAvatar]}>
                      <Text style={[styles.avatarText, isSelected && styles.activeAvatarText]}>
                        {friend.first_name?.[0] || '?'}
                      </Text>
                    </View>
                    <Text style={[styles.itemText, isSelected && styles.activeItemText]}>
                      {friend.first_name} {friend.last_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={styles.listVertical} nestedScrollEnabled={true}>
           {groups.map(group => {
            const isSelected = selectedGroupId === group.group_id;
            return (
              <TouchableOpacity
                key={group.group_id}
                style={[styles.itemVertical, isSelected && styles.activeItem]}
                onPress={() => selectGroup(group.group_id, group.name)}
              >
                <Text style={[styles.itemText, isSelected && styles.activeItemText]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  searchContainer: {
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  activeTab: {
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  listVertical: {
    maxHeight: 180, // allows viewing up to ~3 items before scrolling
  },
  itemVertical: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#EEE',
    backgroundColor: Colors.white,
    marginBottom: Spacing.xs,
  },
  activeItem: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  activeAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  activeAvatarText: {
    color: Colors.white,
  },
  itemText: {
    color: Colors.text,
    fontWeight: '500',
    fontSize: 16,
  },
  activeItemText: {
    color: Colors.white,
  },
});
