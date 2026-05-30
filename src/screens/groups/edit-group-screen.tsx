import { groupsApi } from '@/api/social';
import { BusyOverlay, Button, Typography } from '@/components/common/shared';
import { GroupPicturePicker, GroupPicturePickerValue } from '@/components/groups/group-picture-picker';
import { Colors, Spacing } from '@/theme/theme';
import { Group } from '@/types';
import { extensionForMime, resolveImageMime, uploadImageToS3 } from '@/utils/upload';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
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

export default function EditGroupScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [picture, setPicture] = useState<GroupPicturePickerValue>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      try {
        const g = await groupsApi.get(groupId);
        setGroup(g);
        setName(g.name);
        setDescription(g.description || '');
        setPicture({
          emoji: g.emoji || null,
          pictureLocalUri: null,
          pictureUrl: g.picture_url || null,
          pictureS3Key: g.picture_s3_key || null,
        });
      } catch (e) {
        Alert.alert('Error', 'Could not load group');
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  const handleSave = async () => {
    if (!groupId) return;
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    try {
      setSaving(true);

      let pictureS3Key: string | null | undefined = undefined;
      if (picture.pictureLocalUri) {
        const mimeType = resolveImageMime({
          mimeType: picture.pictureMimeType,
          uri: picture.pictureLocalUri,
        });
        const filename = `group_${Date.now()}.${extensionForMime(mimeType)}`;
        const presigned = await groupsApi.getUploadUrl(groupId, filename, mimeType);
        await uploadImageToS3(picture.pictureLocalUri, presigned.upload_url, mimeType);
        pictureS3Key = presigned.object_key;
      } else if (picture.emoji) {
        pictureS3Key = null;
      } else if (
        !picture.emoji &&
        !picture.pictureLocalUri &&
        !picture.pictureUrl &&
        (group?.picture_s3_key || group?.emoji)
      ) {
        pictureS3Key = null;
      }

      await groupsApi.update(groupId, {
        name,
        description,
        emoji: picture.emoji ?? null,
        ...(pictureS3Key !== undefined ? { picture_s3_key: pictureS3Key } : {}),
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not update group');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>Edit Group</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GroupPicturePicker name={name || 'Group'} value={picture} onChange={setPicture} />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Group name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="What is this group for?"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor={Colors.textSecondary}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={saving ? 'Saving…' : 'Save changes'}
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={styles.saveBtn}
        />
      </View>
      <BusyOverlay visible={saving} label="Saving…" />
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
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0 },
  scroll: { padding: Spacing.xl, paddingBottom: 120 },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  saveBtn: { height: 56, borderRadius: 28 },
});
