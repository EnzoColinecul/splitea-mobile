import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Colors } from '@/theme/theme';

type Props = {
  imageUrl?: string | null;
  name?: string;
  emoji?: string | null;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
};

export function Avatar({
  imageUrl,
  name,
  emoji,
  size = 40,
  backgroundColor = '#F1F5F9',
  textColor = Colors.text,
}: Props) {
  const radius = size / 2;
  const fontSize = Math.max(12, size * 0.42);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const content = emoji
    ? emoji
    : name && name.length > 0
      ? name.charAt(0).toUpperCase()
      : '?';

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius, backgroundColor },
      ]}
    >
      <Text style={{ fontSize, color: textColor, fontWeight: '600' }}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const AvatarStyles = { BorderRadius };
