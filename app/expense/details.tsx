import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, SafeAreaView, Platform } from 'react-native';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { uuid } from 'uuidv4';
import { expensesApi } from '../../src/api/expenses';
import apiClient from '../../src/api/api-client';
import { Button, Input, Typography, Card } from '../../src/components/Shared';
import { SplitEditor, SplitAmount } from '../../src/components/Expenses/SplitEditor';
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

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(params.initialAmount || '');
  const [splitType, setSplitType] = useState<SplitType>(SplitType.EQUALLY);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(params.receiptUrl || null);
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // For the segmented control appearance
  const [selectionType, setSelectionType] = useState<'friends' | 'group'>('friends');

  const [splits, setSplits] = useState<SplitAmount[]>([]);
  const participants = params.participants ? JSON.parse(params.participants) : [];

  useEffect(() => {
    fetchCurrentUser();
    if (params.groupId) setSelectionType('group');
  }, []);

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
         const equalShare = totalAmount / participants.length;
         apiSplits = participants.map((p: any) => ({ user_id: p.id, amount_owed: equalShare }));
      } else {
         apiSplits = splits.map(s => ({ user_id: s.userId, amount_owed: s.amount }));
      }

      await expensesApi.create({
        title: description,
        description: '',
        total_amount: totalAmount,
        paid_by: currentUser.user_id,
        group_id: params.groupId || undefined,
        split_type: "EXACT_AMOUNT",
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

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* WITH Section */}
        <Typography.SubHeader style={styles.sectionTitle}>WITH</Typography.SubHeader>
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segment, selectionType === 'friends' && styles.segmentActive]}
            disabled={true} // Read-only in this flow
          >
            <Text style={[styles.segmentText, selectionType === 'friends' && styles.segmentTextActive]}>Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segment, selectionType === 'group' && styles.segmentActive]}
            disabled={true} // Read-only in this flow
          >
            <Text style={[styles.segmentText, selectionType === 'group' && styles.segmentTextActive]}>Group</Text>
          </TouchableOpacity>
        </View>

        {/* DETAILS Section */}
        <Typography.SubHeader style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>EXPENSE DETAILS</Typography.SubHeader>
        <Input 
          label="Description" 
          placeholder="What was it for?" 
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
        <Typography.SubHeader style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>SPLIT TYPE</Typography.SubHeader>
        <View style={styles.splitTypeRow}>
          {([SplitType.EQUALLY, SplitType.PERCENTAGE, SplitType.EXACT] as any[]).map((type) => {
             const label = type === SplitType.EXACT ? 'EXACT' : type.toUpperCase();
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

        {/* Participant List - matching the screenshot's minimalist look */}
        <View style={styles.participantList}>
          <SplitEditor
            currentUserId={currentUser.user_id}
            participants={participants}
            splitType={splitType}
            totalAmount={parseFloat(amount) || 0}
            splits={splits}
            onSplitsChange={setSplits}
            minimalist={true} // New prop for cleaner look
          />
        </View>

        {/* Camera icon for receipt if needed */}
        {!receiptUrl && !uploadingReceipt && (
           <TouchableOpacity onPress={handlePickReceipt} style={styles.receiptFab}>
             <Camera size={24} color={Colors.white} />
           </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={loading ? "Creating..." : "Create Expense"}
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
  segmentActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  segmentTextActive: { color: Colors.primary, fontWeight: '700' },
  
  splitTypeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.itemBorder, backgroundColor: Colors.white },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },

  participantList: { marginTop: Spacing.lg },
  receiptFab: { position: 'absolute', right: 0, top: 40, backgroundColor: '#3B82F6', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // White background
  },
  createBtn: { height: 56, borderRadius: BorderRadius.md },
});
