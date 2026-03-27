import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { friendsApi, groupsApi } from '../../api/social';
import { BorderRadius, Colors, Spacing } from '../../theme/theme';
import { Friend } from '../../types';
import { Button, Card, Typography } from '../Shared';
import { X, CheckCircle } from 'lucide-react-native';

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  currentMemberIds: string[];
  onSuccess: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ visible, onClose, groupId, currentMemberIds, onSuccess }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchFriends();
      setSelectedIds([]);
    }
  }, [visible]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const allFriends = await friendsApi.list();
      // Filter out those who are already in the group
      setFriends(allFriends.filter(f => !currentMemberIds.includes(f.user_id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (userId: string) => {
    setSelectedIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    setAdding(true);
    try {
      await groupsApi.addFriends(groupId, selectedIds);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Typography.SubHeader style={styles.title}>Add Member</Typography.SubHeader>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ margin: 40 }} />
          ) : friends.length === 0 ? (
            <Typography.Body style={styles.empty}>All your friends are already in this group.</Typography.Body>
          ) : (
            <FlatList
              data={friends}
            keyExtractor={(f) => f.user_id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.user_id);
              return (
                <TouchableOpacity 
                  style={[styles.friendItem, isSelected && styles.friendSelected]} 
                  onPress={() => toggleSelection(item.user_id)}
                >
                    <View style={styles.avatar}>
                      <Typography.Body style={styles.avatarText}>{item.first_name.charAt(0)}</Typography.Body>
                    </View>
                    <Typography.Body style={styles.name}>{item.first_name} {item.last_name}</Typography.Body>
                    {isSelected && <CheckCircle size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <Button 
            title={adding ? "Adding..." : `Add ${selectedIds.length} members`}
            onPress={handleAdd}
            disabled={selectedIds.length === 0 || adding}
            style={styles.addBtn}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { 
    backgroundColor: Colors.white, 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: Spacing.xl,
    paddingBottom: 50,
    maxHeight: '80%'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { marginBottom: 0 },
  list: { paddingBottom: Spacing.xl },
  friendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.md, 
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.sm
  },
  friendSelected: { borderColor: Colors.primary, backgroundColor: '#FFF9F4' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  avatarText: { fontWeight: '700', color: Colors.primary },
  name: { flex: 1, fontWeight: '600' },
  empty: { textAlign: 'center', marginVertical: 40, color: Colors.textSecondary },
  addBtn: { marginTop: Spacing.lg }
});
