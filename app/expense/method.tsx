import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import apiClient from '../../src/api/api-client';
import { groupsApi } from '../../src/api/social';
import { Button, Typography } from '../../src/components/Shared';
import { BorderRadius, Colors, Spacing } from '../../src/theme/theme';

export default function ExpenseMethodScreen() {
  const router = useRouter();

  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const toggleFriend = (id: string, user_id: string) => {
    if (selectedGroup) setSelectedGroup(null);
    setSelectedFriends(prev =>
      prev.includes(user_id) ? prev.filter(f => f !== user_id) : [...prev, user_id]
    );
  };

  const selectGroup = (id: string) => {
    setSelectedFriends([]);
    setSelectedGroup(id);
  };

  const handleNext = async () => { // Made async
    let participants: any[] = [];
    if (selectedGroup) {
      const group = groups.find(g => g.group_id === selectedGroup);
      if (!group) return;
      setLoading(true);
      try {
        const { users } = await groupsApi.getUsers(selectedGroup);
        // Map users to participants format
        participants = users.map((u: any) => ({
          id: u.user_id || (u.id ? u.id : u),
          name: u.first_name ? `${u.first_name} ${u.last_name}` : (u.name ? u.name : 'Member'),
          isGroup: false // Expanded members are individuals
        }));
      } catch (err) {
        Alert.alert('Error', 'Could not load group members.');
        return;
      } finally {
        setLoading(false);
      }
    } else if (selectedFriends.length > 0) {
      const selectedInList = friends.filter(f => selectedFriends.includes(f.user_id));
      participants = selectedInList.map(f => ({
        id: f.user_id,
        name: `${f.first_name} ${f.last_name}`
      }));
      
      // Add current user if selected and not already in list (though they shouldn't be in friends)
      if (currentUser && selectedFriends.includes(currentUser.user_id)) {
        participants.unshift({
          id: currentUser.user_id,
          name: `${currentUser.first_name} ${currentUser.last_name}`
        });
      }
    } else {
      Alert.alert('Select participants', 'Please choose at least one friend or a group.');
      return;
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

      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography.Header style={styles.mainTitle}>Who are you splitting with?</Typography.Header>

        <Typography.SubHeader style={styles.sectionTitle}>GROUPS</Typography.SubHeader>
        <View style={styles.listContainer}>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>You don't have any groups yet.</Text>
          ) : (
            groups.map(group => (
              <TouchableOpacity
                key={group.group_id}
                style={[
                  styles.itemRow,
                  selectedGroup === group.group_id && styles.itemRowSelected
                ]}
                onPress={() => selectGroup(group.group_id)}
              >
                <View style={[styles.avatar, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.avatarText, { color: '#0369A1' }]}>{group.name.charAt(0)}</Text>
                </View>
                <Text style={styles.itemName}>{group.name}</Text>
                <View style={[styles.checkbox, selectedGroup === group.group_id && styles.checkboxActive]}>
                  {selectedGroup === group.group_id && <Text style={styles.check}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Typography.SubHeader style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>FRIENDS</Typography.SubHeader>
        <View style={styles.listContainer}>
          {/* "Me" option */}
          {currentUser && (
            <TouchableOpacity
              key="me"
              style={[
                styles.itemRow,
                selectedFriends.includes(currentUser.user_id) && styles.itemRowSelected
              ]}
              onPress={() => toggleFriend('me', currentUser.user_id)}
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

          {friends.length === 0 && !currentUser ? (
            <Text style={styles.emptyText}>You don't have any friends yet.</Text>
          ) : (
            friends.map(friend => {
              const isSelected = selectedFriends.includes(friend.user_id);
              return (
                <TouchableOpacity
                  key={friend.friendship_id}
                  style={[
                    styles.itemRow,
                    isSelected && styles.itemRowSelected
                  ]}
                  onPress={() => toggleFriend(friend.friendship_id, friend.user_id)}
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
  mainTitle: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.xl, color: Colors.text },
  sectionTitle: { marginBottom: Spacing.md, fontSize: 13, letterSpacing: 1.2, color: Colors.textSecondary, fontWeight: '700' },
  listContainer: { gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontStyle: 'italic', paddingHorizontal: Spacing.md },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
  },
  itemRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF9F4',
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
  },
  nextBtn: { height: 56, borderRadius: BorderRadius.round },
});
