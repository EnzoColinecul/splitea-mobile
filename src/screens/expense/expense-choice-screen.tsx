import { expensesApi } from '@/api/expenses';
import { Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronLeft, PenLine, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { v4 } from 'uuid';

export default function ExpenseChoiceScreen() {
  const router = useRouter();
  const { participants, groupId } = useLocalSearchParams<{ participants: string, groupId?: string }>();
  const [loading, setLoading] = useState(false);

  const processExtraction = async (imageUri: string) => {
    try {
      setLoading(true);
      const eventId = v4();
      const filename = `receipt_${Date.now()}.jpg`;

      const { upload_url, object_key } = await expensesApi.getPresignedUrl(eventId, filename);

      const blob = await (await fetch(imageUri)).blob();
      const uploadResp = await fetch(upload_url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      if (!uploadResp.ok) throw new Error('Upload to S3 failed');

      const { total_amount } = await expensesApi.extractReceiptTotal({ s3_key: object_key });

      router.push({
        pathname: '/expense/details',
        params: {
          participants,
          groupId,
          initialAmount: String(total_amount),
          receiptUrl: object_key,
        }
      });
    } catch (error: any) {
      console.error(error);
      Alert.alert('Extraction Error', error?.message || 'Could not extract total from the receipt.');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractChoice = () => {
    Alert.alert(
      'Extract Total',
      'Choose a source for your receipt',
      [
        {
          text: 'Camera 📷',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
            if (!result.canceled && result.assets.length > 0) {
              processExtraction(result.assets[0].uri);
            }
          }
        },
        {
          text: 'Gallery 🖼️',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
            if (!result.canceled && result.assets.length > 0) {
              processExtraction(result.assets[0].uri);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleManual = () => {
    router.push({
      pathname: '/expense/details',
      params: { participants, groupId }
    });
  };

  const handleSplitAI = () => {
    const parsedParticipants = JSON.parse(participants || '[]');
    router.push({
      pathname: '/expense/scan-receipt',
      params: {
        groupId,
        participantIds: JSON.stringify(parsedParticipants.map((p: any) => p.id)),
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
        <Typography.SubHeader style={styles.headerTitle}>Add Expense</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography.Header style={styles.mainTitle}>How would you like to add it?</Typography.Header>

        <TouchableOpacity onPress={handleSplitAI} style={styles.methodCardWrapper}>
          <Card style={[styles.methodCard, styles.aiCard]}>
            <View style={styles.iconCircle}>
              <Sparkles size={32} color={Colors.white} />
            </View>
            <View style={styles.cardContent}>
              <Typography.SubHeader style={styles.cardTitleWhite}>Split with AI</Typography.SubHeader>
              <Typography.Body style={styles.cardDescWhite}>Upload receipt & tell AI how to divide it among everyone.</Typography.Body>
            </View>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleExtractChoice} style={styles.methodCardWrapper} disabled={loading}>
          <Card style={styles.methodCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
              {loading ? <ActivityIndicator color="#15803D" size="small" /> : <Camera size={32} color="#15803D" />}
            </View>
            <View style={styles.cardContent}>
              <Typography.SubHeader style={[styles.cardTitle, { color: Colors.text }]}>Extract Total</Typography.SubHeader>
              <Typography.Body style={styles.cardDesc}>Photo to automatically extract the total amount.</Typography.Body>
            </View>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleManual} style={styles.methodCardWrapper}>
          <Card style={styles.methodCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#F8F9FA' }]}>
              <PenLine size={32} color={Colors.textSecondary} />
            </View>
            <View style={styles.cardContent}>
              <Typography.SubHeader style={[styles.cardTitle, { color: Colors.text }]}>Manual Entry</Typography.SubHeader>
              <Typography.Body style={styles.cardDesc}>Enter details and amount yourself.</Typography.Body>
            </View>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0 },
  scroll: { padding: Spacing.xl },
  mainTitle: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.xl, color: Colors.text },
  methodCardWrapper: { marginBottom: Spacing.lg },
  methodCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    gap: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    backgroundColor: Colors.white,
  },
  aiCard: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardTitleWhite: { fontSize: 18, fontWeight: '700', marginBottom: 4, color: Colors.white },
  cardDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  cardDescWhite: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20 },
});
