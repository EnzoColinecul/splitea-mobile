import { groupsApi } from '@/api/social';
import apiClient from '@/api/api-client';
import { Button, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Search, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

type Participant = {
  id: string;
  name: string;
  isMe: boolean;
  isSelected: boolean;
};

export default function GroupParticipantsScreen() {
  const router = useRouter();
  const { groupId, groupName } = useLocalSearchParams<{ groupId: string; groupName: string }>();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const [{ users }, profileRes] = await Promise.all([
        groupsApi.getUsers(groupId),
        apiClient.get('/user/profile'),
      ]);
      const me = profileRes.data;
      const mapped: Participant[] = users.map((u: any) => ({
        id: u.user_id || u.id,
        name: u.first_name ? `${u.first_name} ${u.last_name}` : (u.name || 'Member'),
        isMe: me && (u.user_id === me.user_id || u.id === me.user_id),
        isSelected: true,
      }));
      setParticipants(mapped);
    } catch {
      Alert.alert('Error', 'Could not load group members.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = participants.filter(p => p.isSelected).length;

  const toggleParticipant = (id: string) => {
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, isSelected: !p.isSelected } : p))
    );
  };

  const selectAll = () => {
    setParticipants(prev =>
      prev.map(p =>
        filtered.find(f => f.id === p.id) ? { ...p, isSelected: true } : p
      )
    );
  };

  const deselectAll = () => {
    setParticipants(prev =>
      prev.map(p =>
        filtered.find(f => f.id === p.id) ? { ...p, isSelected: false } : p
      )
    );
  };

  const handleConfirm = () => {
    const selected = participants.filter(p => p.isSelected);
    if (selected.length === 0) {
      Alert.alert('Select participants', 'Please select at least one person.');
      return;
    }
    router.push({
      pathname: '/expense/choice',
      params: {
        participants: JSON.stringify(selected.map(p => ({ id: p.id, name: p.name }))),
        groupId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle} numberOfLines={1}>
          {groupName || 'Group'}
        </Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.searchBar}>
              <Search size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search members..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.controlRow}>
              <View style={styles.membersBadge}>
                <Users size={16} color={Colors.primary} />
                <Text style={styles.membersLabel}>
                  {selectedCount} / {participants.length} selected
                </Text>
              </View>
              <View style={styles.bulkButtons}>
                <TouchableOpacity style={styles.bulkBtn} onPress={selectAll}>
                  <Text style={styles.bulkBtnText}>Select all</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnOutline]} onPress={deselectAll}>
                  <Text style={[styles.bulkBtnText, styles.bulkBtnOutlineText]}>Deselect all</Text>
                </TouchableOpacity>
              </View>
            </View>

            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>No members match your search.</Text>
            ) : (
              <View style={styles.list}>
                {filtered.map((participant, idx) => (
                  <View key={participant.id}>
                    <TouchableOpacity
                      style={styles.participantRow}
                      onPress={() => toggleParticipant(participant.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatar, participant.isMe ? styles.avatarMe : styles.avatarOther]}>
                        <Text style={[styles.avatarText, participant.isMe ? styles.avatarTextMe : styles.avatarTextOther]}>
                          {participant.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.nameContainer}>
                        <Text style={styles.participantName}>{participant.name}</Text>
                        {participant.isMe && <Text style={styles.youTag}>You</Text>}
                      </View>
                      <View style={[styles.checkbox, participant.isSelected && styles.checkboxActive]}>
                        {participant.isSelected && <Text style={styles.check}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                    {idx < filtered.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={selectedCount > 0 ? `Confirm (${selectedCount} selected)` : 'Confirm'}
              onPress={handleConfirm}
              disabled={selectedCount === 0}
              style={styles.confirmBtn}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0, flex: 1, textAlign: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: 140 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    height: 50,
    borderRadius: 15,
    marginBottom: Spacing.lg,
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

  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  membersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bulkBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary,
  },
  bulkBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
  },
  bulkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  bulkBtnOutlineText: {
    color: Colors.textSecondary,
  },

  list: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarMe: { backgroundColor: '#FEE2E2' },
  avatarOther: { backgroundColor: '#F0FDF4' },
  avatarText: { fontWeight: 'bold', fontSize: 18 },
  avatarTextMe: { color: '#B91C1C' },
  avatarTextOther: { color: '#15803D' },
  nameContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  participantName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  youTag: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: '#FFF3EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  check: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: Colors.background, marginLeft: 76 },
  emptyText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },

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
  confirmBtn: { height: 56, borderRadius: BorderRadius.round },
});
