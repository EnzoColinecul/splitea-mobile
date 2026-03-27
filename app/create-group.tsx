import { Stack, useRouter } from 'expo-router';
import { CheckCircle, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { friendsApi, groupsApi } from '../src/api/social';
import { Button, Typography } from '../src/components/Shared';
import { Colors, Spacing } from '../src/theme/theme';
import { Friend } from '../src/types';

export default function CreateGroupScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const data = await friendsApi.list();
      setFriends(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load friends');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (userId: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      const group = await groupsApi.create({ name, description });

      if (selectedFriendIds.length > 0) {
        await groupsApi.addFriends(group.group_id, selectedFriendIds);
      }

      router.replace({
        pathname: '/group-detail',
        params: { groupId: group.group_id, name: group.name }
      });
    } catch (err) {
      Alert.alert('Error', 'Could not create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>New Group</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Typography.Header style={styles.mainTitle}>Create Group</Typography.Header>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Summer Trip 2024"
              value={name}
              onChangeText={setName}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="What is this group for?"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
        </View>

        <View style={[styles.section, { marginTop: Spacing.xl }]}>
          <Typography.SubHeader style={styles.sectionTitle}>ADD MEMBERS</Typography.SubHeader>

          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : friends.length === 0 ? (
            <Text style={styles.emptyText}>You don't have any friends yet.</Text>
          ) : (
            friends.map(friend => {
              const isSelected = selectedFriendIds.includes(friend.user_id);
              return (
                <TouchableOpacity
                  key={friend.user_id}
                  style={[styles.friendItem, isSelected && styles.friendSelected]}
                  onPress={() => toggleFriend(friend.user_id)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{friend.first_name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{friend.first_name} {friend.last_name}</Text>
                    <Text style={styles.friendEmail}>{friend.email}</Text>
                  </View>
                  {isSelected && <CheckCircle size={20} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={creating ? "Creating..." : `Create Group ${selectedFriendIds.length > 0 ? `with ${selectedFriendIds.length} members` : ''}`}
          onPress={handleCreate}
          disabled={creating || !name.trim()}
          style={styles.createBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0 },
  scroll: { padding: Spacing.xl, paddingBottom: 120 },
  section: {},
  mainTitle: { fontSize: 32, fontWeight: '800', marginBottom: Spacing.xl, color: Colors.text },
  sectionTitle: { fontSize: 13, letterSpacing: 1.2, color: Colors.textSecondary, fontWeight: '700', marginBottom: Spacing.md },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white
  },
  friendSelected: { borderColor: Colors.primary, backgroundColor: '#FFF9F4' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md
  },
  avatarText: { fontWeight: '700', color: Colors.primary, fontSize: 18 },
  friendName: { fontWeight: '600', fontSize: 16, color: Colors.text },
  friendEmail: { fontSize: 13, color: Colors.textSecondary },
  emptyText: { color: Colors.textSecondary, fontStyle: 'italic', marginTop: 10 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  createBtn: { height: 56, borderRadius: 28 },
});
