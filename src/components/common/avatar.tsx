import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/theme/theme';

type Props = {
  imageUrl?: string | null;
  /**
   * Stable identifier for the underlying image, from the API's
   * `avatar_cache_key` / `picture_cache_key` field.
   *
   * `imageUrl` is a presigned S3 URL whose signature changes on every API
   * response, so caching on the URL re-downloads the same image every time.
   * Passing this key makes expo-image cache on the object identity instead,
   * and it only changes when the picture is actually replaced.
   *
   * Falls back to `imageUrl` when absent so older API responses still render
   * (just without the caching benefit).
   */
  cacheKey?: string | null;
  name?: string;
  emoji?: string | null;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
};

export function Avatar({
  imageUrl,
  cacheKey,
  name,
  emoji,
  size = 40,
  backgroundColor = Colors.surfaceMuted,
  textColor = Colors.text,
}: Props) {
  const radius = size / 2;
  const fontSize = Math.max(12, size * 0.42);

  if (imageUrl) {
    const resolvedCacheKey = cacheKey || imageUrl;
    return (
      <Image
        source={{ uri: imageUrl, cacheKey: resolvedCacheKey }}
        // `recyclingKey` clears the previous image when a list row is reused,
        // so scrolling doesn't briefly show another person's avatar.
        recyclingKey={resolvedCacheKey}
        cachePolicy="memory-disk"
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
