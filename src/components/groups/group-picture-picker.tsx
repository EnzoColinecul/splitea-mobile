import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Avatar } from '@/components/common/avatar';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';

const EMOJI_CHOICES = [
  '🏠', '🍕', '✈️', '🛒', '🎉', '⚽', '🍻', '🧳',
  '🎁', '🏖️', '🎬', '🎵', '🚗', '🍔', '☕', '🌮',
  '🎂', '🌍', '🏔️', '🛏️', '💼', '📚', '💡', '🐶',
];

export type GroupPicturePickerValue = {
  emoji?: string | null;
  pictureLocalUri?: string | null;
  pictureUrl?: string | null;
  pictureS3Key?: string | null;
};

type Props = {
  name: string;
  value: GroupPicturePickerValue;
  onChange: (next: GroupPicturePickerValue) => void;
};

export function GroupPicturePicker({ name, value, onChange }: Props) {
  const [tab, setTab] = useState<'emoji' | 'image'>(value.emoji ? 'emoji' : 'image');

  const previewImage = value.pictureLocalUri || value.pictureUrl || null;

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onChange({
        emoji: null,
        pictureLocalUri: result.assets[0].uri,
        pictureUrl: null,
        pictureS3Key: null,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewRow}>
        <Avatar
          imageUrl={previewImage}
          emoji={value.emoji || null}
          name={name}
          size={72}
          backgroundColor={Colors.itemBorder}
        />
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <Text style={styles.helper}>
            {previewImage
              ? 'Custom photo'
              : value.emoji
                ? 'Emoji icon'
                : 'Default initial'}
          </Text>
          {(previewImage || value.emoji) && (
            <TouchableOpacity
              onPress={() =>
                onChange({ emoji: null, pictureLocalUri: null, pictureUrl: null, pictureS3Key: null })
              }
            >
              <Text style={styles.clearText}>Reset to initial</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'emoji' && styles.tabActive]}
          onPress={() => setTab('emoji')}
        >
          <Text style={[styles.tabText, tab === 'emoji' && styles.tabTextActive]}>Emoji</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'image' && styles.tabActive]}
          onPress={() => setTab('image')}
        >
          <Text style={[styles.tabText, tab === 'image' && styles.tabTextActive]}>Photo</Text>
        </TouchableOpacity>
      </View>

      {tab === 'emoji' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
          {EMOJI_CHOICES.map((e) => (
            <TouchableOpacity
              key={e}
              style={[
                styles.emojiCell,
                value.emoji === e && styles.emojiCellActive,
              ]}
              onPress={() =>
                onChange({
                  emoji: e,
                  pictureLocalUri: null,
                  pictureUrl: null,
                  pictureS3Key: null,
                })
              }
            >
              <Text style={{ fontSize: 26 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <TouchableOpacity style={styles.imagePickBtn} onPress={handlePickImage}>
          <Text style={styles.imagePickText}>
            {previewImage ? 'Replace photo' : 'Upload photo'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  helper: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  clearText: {
    color: Colors.primary,
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.itemBorder,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.background,
  },
  tabText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.text,
  },
  emojiRow: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  emojiCell: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.itemBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  emojiCellActive: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  imagePickBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  imagePickText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
