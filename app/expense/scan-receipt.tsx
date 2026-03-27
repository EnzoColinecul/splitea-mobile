import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
} from 'react-native';
import { ChevronLeft, Camera, Image as ImageIcon, Mic, Square, Sparkles } from 'lucide-react-native';
import { uuid } from 'uuidv4';

const EXPO_API_URL = '/api'; 
import { expensesApi } from '../../src/api/expenses';
import { Button, Typography, Card } from '../../src/components/Shared';
import { BorderRadius, Colors, Spacing } from '../../src/theme/theme';

export default function ScanReceiptScreen() {
  const router = useRouter();
  const { groupId, participantIds } = useLocalSearchParams<{
    groupId?: string;
    participantIds?: string;
  }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const parsedParticipantIds: string[] = participantIds ? JSON.parse(participantIds) : [];

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85 });
    if (!result.canceled && result.assets.length > 0) setImageUri(result.assets[0].uri);
  };

  const handleCameraCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets.length > 0) setImageUri(result.assets[0].uri);
  };

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix' });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      if (!recorder) return;
      setLoading(true);
      setLoadingStep('Transcribing...');
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio');

      const formData = new FormData();
      formData.append('file', { uri, name: 'instruction.m4a', type: 'audio/m4a' } as any);
      const token = await SecureStore.getItemAsync('userToken');
      const response = await fetch(`${EXPO_API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Transcription failed');
      const data = await response.json();
      setInstruction(prev => prev ? `${prev} ${data.transcription}` : data.transcription);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri || !instruction.trim()) return;
    setLoading(true);
    try {
      setLoadingStep('Uploading receipt...');
      const eventId = uuid();
      const filename = `receipt_${Date.now()}.jpg`;
      const token = await SecureStore.getItemAsync('userToken');

      const presignedResp = await fetch(`${EXPO_API_URL}/storage/presigned?event_id=${eventId}&filename=${filename}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const { upload_url, object_key } = await presignedResp.json();

      const blob = await (await fetch(imageUri)).blob();
      await fetch(upload_url, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });

      setLoadingStep('AI Analysis...');
      const preview = await expensesApi.analyzeReceipt({
        s3_key: object_key,
        instruction: instruction.trim(),
        participant_ids: parsedParticipantIds,
        group_id: groupId,
      });

      router.push({
        pathname: '/expense/receipt-split-preview',
        params: {
          previewData: JSON.stringify(preview),
          receiptUrl: object_key,
          groupId: groupId ?? '',
          participantIds,
        },
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>Scan Receipt</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography.Header style={styles.mainTitle}>Let AI handle the math ✨</Typography.Header>
        
        <TouchableOpacity onPress={imageUri ? handlePickImage : handleCameraCapture} style={styles.imageCard}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.cameraIconCircle}>
                <Camera size={40} color={Colors.primary} />
              </View>
              <Typography.Body style={styles.placeholderText}>Tap to take a photo of the receipt</Typography.Body>
            </View>
          )}
        </TouchableOpacity>

        <Typography.SubHeader style={styles.sectionTitle}>HOW TO SPLIT?</Typography.SubHeader>
        <Card style={styles.instructionCard}>
          <TextInput
            style={styles.instructionInput}
            value={instruction}
            onChangeText={setInstruction}
            placeholder='e.g. "Burgers equal, drinks only Juan"'
            multiline
            placeholderTextColor="#A09787"
          />
          <TouchableOpacity 
            onPress={isRecording ? stopRecording : startRecording}
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
          >
            {isRecording ? <Square size={20} color="red" /> : <Mic size={20} color={Colors.text} />}
          </TouchableOpacity>
        </Card>

        <View style={styles.tipsRow}>
          <Sparkles size={16} color={Colors.primary} />
          <Typography.Caption style={styles.tipsText}>Specify names, percentages, or items</Typography.Caption>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingStep}>{loadingStep}</Text>
          </View>
        )}
      </ScrollView>

      {!loading && (
        <View style={styles.footer}>
          <Button
            title="Analyze with AI"
            onPress={handleAnalyze}
            disabled={!imageUri || !instruction.trim()}
            style={[styles.analyzeBtn, (!imageUri || !instruction.trim()) && { opacity: 0.5 }]}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0 },
  scroll: { padding: Spacing.xl, paddingBottom: 150 },
  mainTitle: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.xl, color: Colors.text },
  imageCard: { 
    height: 240, 
    width: '100%', 
    borderRadius: 24, 
    borderWidth: 2, 
    borderColor: Colors.itemBorder, 
    borderStyle: 'dashed', 
    backgroundColor: Colors.white, 
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  preview: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: Spacing.md },
  cameraIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF9F4', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  
  sectionTitle: { marginBottom: Spacing.sm, fontSize: 12, letterSpacing: 1.2, color: Colors.textSecondary, fontWeight: '700' },
  instructionCard: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    padding: Spacing.md, 
    borderRadius: 20, 
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    minHeight: 100,
  },
  instructionInput: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '600', paddingTop: 4 },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: '#FFEEED' },
  
  tipsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
  tipsText: { color: Colors.textSecondary, fontWeight: '600' },
  
  loadingOverlay: { marginTop: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  loadingStep: { color: Colors.textSecondary, fontWeight: '700' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: Spacing.xl + 20, backgroundColor: 'rgba(255, 255, 255, 0.95)' },
  analyzeBtn: { height: 56, borderRadius: BorderRadius.round },
});
