import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronLeft, Users, Info } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { uuid } from 'uuidv4';
import apiClient from '../../src/api/api-client';
import { groupsApi } from '../../src/api/social';
import { expensesApi } from '../../src/api/expenses';
import { SplitAmount, SplitEditor } from '../../src/components/Expenses/SplitEditor';
import { Button, Input, Typography } from '../../src/components/Shared';
import { BorderRadius, Colors, Spacing } from '../../src/theme/theme';
import { SplitType, User } from '../../src/types';

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    participants: string,
    groupId?: string,
    initialAmount?: string,
    receiptUrl?: string
  }>();
  const participants = params.participants ? JSON.parse(params.participants) : [];
  const [groupName, setGroupName] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(params.initialAmount || '');
  const [splitType, setSplitType] = useState<SplitType>(SplitType.EQUALLY);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(params.receiptUrl || null);
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // For the segmented control appearance
  const [splits, setSplits] = useState<SplitAmount[]>([]);

  useEffect(() => {
    fetchCurrentUser();
    if (params.groupId) {
      fetchGroupName(params.groupId);
    }
  }, []);

  const fetchGroupName = async (id: string) => {
    try {
      const data = await groupsApi.get(id);
      setGroupName(data.name);
    } catch (err) {
      console.error('Failed to get group name', err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await apiClient.get('/user/profile');
      setCurrentUser(res.data);
    } catch (err) {
      console.error('Failed to get user profile', err);
    }
  };

  const handlePickReceipt = async () => {
    Alert.alert('Attach Receipt', 'Choose a source', [
      {
        text: 'Camera 📷',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
          if (!result.canceled && result.assets.length > 0) uploadReceipt(result.assets[0].uri);
        }
      },
      {
        text: 'Gallery 🖼️',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
          if (!result.canceled && result.assets.length > 0) uploadReceipt(result.assets[0].uri);
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const uploadReceipt = async (uri: string) => {
    try {
      setUploadingReceipt(true);
      const eventId = uuid();
      const filename = `receipt_manual_${Date.now()}.jpg`;
      const { upload_url, object_key } = await expensesApi.getPresignedUrl(eventId, filename);
      const blob = await (await fetch(uri)).blob();
      await fetch(upload_url, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
      setReceiptUrl(object_key);
    } catch (error) {
      console.error('Receipt upload failed', error);
      Alert.alert('Upload Error', 'Failed to upload the receipt.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleCreate = async () => {
    if (!currentUser) return;
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      let apiSplits: any[] = [];
      if (splitType === SplitType.EQUALLY) {
        // Handle rounding to ensure sum = totalAmount
        const count = participants.length;
        const baseShare = Math.floor((totalAmount / count) * 100) / 100;
        const totalBase = baseShare * count;
        const remainder = Math.round((totalAmount - totalBase) * 100) / 100;
        
        apiSplits = participants.map((p: any, index: number) => ({
          user_id: p.id,
          amount_owed: index === count - 1 ? Number((baseShare + remainder).toFixed(2)) : baseShare
        }));
      } else {
        apiSplits = splits.map((s: SplitAmount) => ({ user_id: s.userId, amount_owed: s.amount }));
      }

      // Map SplitType enum to backend strings
      const backendSplitType = 
        splitType === SplitType.EQUALLY ? 'equally' : 
        splitType === SplitType.PERCENTAGE ? 'percentage' : 
        'exact_amount';

      await expensesApi.create({
        title: description,
        description: '',
        total_amount: totalAmount,
        paid_by: currentUser.user_id,
        group_id: params.groupId || undefined,
        split_type: backendSplitType,
        splits: apiSplits,
        receipt_url: receiptUrl || undefined
      });

      Alert.alert('Success', 'Expense created!', [{ text: 'OK', onPress: () => router.dismissAll() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create expense');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
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
        <Typography.SubHeader style={styles.headerTitle}>New Expense</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      {groupName && (
        <View style={styles.groupBanner}>
          <Users size={16} color={Colors.primary} />
          <Text style={styles.groupBannerText}>Group: {groupName}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* DETAILS Section */}
        <Typography.SectionHeader>1. EXPENSE DETAILS</Typography.SectionHeader>
        <Input
          label="Title"
          placeholder="e.g. Pizza Night, Drinks..."
          value={description}
          onChangeText={setDescription}
        />
        <Input
          label="Amount ($)"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        {/* SPLIT TYPE Section */}
        <Typography.SectionHeader style={{ marginTop: Spacing.xl }}>2. HOW TO SPLIT</Typography.SectionHeader>
        <View style={styles.splitTypeRow}>
          {([SplitType.EQUALLY, SplitType.PERCENTAGE, SplitType.EXACT] as any[]).map((type) => {
            const label = type === SplitType.EQUALLY ? 'EQUALLY' : type === SplitType.EXACT ? 'EXACT' : 'PERCENT';
            return (
              <TouchableOpacity
                key={type}
                style={[styles.pill, splitType === type && styles.pillActive]}
                onPress={() => setSplitType(type)}
              >
                <Text style={[styles.pillText, splitType === type && styles.pillTextActive]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Participant List */}
        <View style={styles.participantList}>
          <SplitEditor
            currentUserId={currentUser.user_id}
            participants={participants}
            splitType={splitType}
            totalAmount={parseFloat(amount) || 0}
            splits={splits}
            onSplitsChange={setSplits}
            minimalist={true}
          />
        </View>

        {/* ATTACH RECEIPT Section */}
        <Typography.SectionHeader style={{ marginTop: Spacing.xl }}>3. ATTACH RECEIPT (OPTIONAL)</Typography.SectionHeader>
        <TouchableOpacity 
          style={styles.attachCard} 
          onPress={handlePickReceipt}
          activeOpacity={0.7}
        >
          {uploadingReceipt ? (
            <ActivityIndicator color={Colors.primary} />
          ) : receiptUrl ? (
            <View style={styles.receiptPreviewContainer}>
              <View style={styles.receiptIconCircle}>
                <Camera size={20} color={Colors.primary} />
              </View>
              <Typography.Body style={styles.receiptText}>Receipt attached successfully</Typography.Body>
              <TouchableOpacity onPress={() => setReceiptUrl(null)}>
                <Typography.Caption style={{ color: Colors.danger, fontWeight: '600' }}>Remove</Typography.Caption>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.receiptIconCircle}>
                <Camera size={20} color={Colors.primary} />
              </View>
              <Typography.Body style={styles.receiptText}>Tap to upload or take a photo</Typography.Body>
            </>
          )}
        </TouchableOpacity>

        {/* Blue Info Box */}
        <View style={styles.infoBox}>
          <Info size={18} color="#0E7490" style={{ marginTop: 2 }} />
          <Typography.Caption style={styles.infoText}>
            Splits are calculated based on the total amount. You can adjust individual shares if needed.
          </Typography.Caption>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={loading ? "Creating..." : "Confirm & Create"}
          onPress={handleCreate}
          disabled={!description || !amount || loading || uploadingReceipt}
          style={styles.createBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  groupBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#EEF2FF', 
    paddingHorizontal: Spacing.lg, 
    paddingVertical: 8,
    gap: 8,
    marginHorizontal: Spacing.xl,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    marginBottom: Spacing.sm,
  },
  groupBannerText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0, fontWeight: '700' },
  scroll: { padding: Spacing.xl, paddingBottom: 150 },
  sectionTitle: { marginBottom: Spacing.sm, fontSize: 13, letterSpacing: 1.2, color: Colors.textSecondary, fontWeight: '700' },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Cleaner light gray
    borderRadius: 14,
    padding: 2,
    height: 48,
  },
  segment: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  segmentActive: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.itemBorder },
  segmentText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  segmentTextActive: { color: Colors.primary, fontWeight: '700' },

  splitTypeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  pill: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: BorderRadius.md, 
    borderWidth: 1.5, 
    borderColor: Colors.itemBorder, 
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },

  participantList: { marginTop: Spacing.md },
  
  attachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    borderStyle: 'dashed',
    marginBottom: Spacing.lg,
  },
  receiptIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF2E6', // Light orange tint
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  receiptText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  receiptPreviewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFEFF', // Cyan/Light blue tint
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0E7490',
    lineHeight: 18,
    fontWeight: '500',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.itemBorder,
  },
  createBtn: { height: 56, borderRadius: BorderRadius.md },
});
