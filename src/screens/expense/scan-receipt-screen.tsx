import { expensesApi } from '@/api/expenses';
import { BusyOverlay, Button, Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, CheckCircle2, ChevronLeft, Mic, RefreshCw, Sparkles, Square, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { v4 } from 'uuid';

const AUDIO_MIME_TYPES: Record<string, string> = {
  aac: 'audio/aac',
  caf: 'audio/x-caf',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  opus: 'audio/opus',
  wav: 'audio/wav',
};

const getAudioUploadMetadata = (uri: string) => {
  const sanitizedUri = uri.split('?')[0];
  const fileName = sanitizedUri.split('/').pop() || 'instruction-audio';
  const fileExtension = fileName.includes('.')
    ? fileName.split('.').pop()?.toLowerCase()
    : undefined;

  return {
    fileName,
    mimeType: fileExtension ? AUDIO_MIME_TYPES[fileExtension] || 'application/octet-stream' : 'application/octet-stream',
  };
};

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
  const isBusy = loading;

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

  const openReceiptSourcePicker = () => {
    if (isBusy) return;

    Alert.alert('Receipt Source', 'Choose how you want to add the receipt', [
      { text: 'Camera', onPress: handleCameraCapture },
      { text: 'Gallery', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const startRecording = async () => {
    try {
      if (isBusy) return;
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

      const { fileName, mimeType } = getAudioUploadMetadata(uri);

      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: mimeType } as any);

      const data = await expensesApi.transcribeInstruction(formData);
      setInstruction(prev => prev ? `${prev} ${data.transcription}` : data.transcription);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Transcription Error', err?.message ?? 'Could not transcribe your audio.');
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
      const eventId = v4();
      const filename = `receipt_${Date.now()}.jpg`;
      const { upload_url, object_key } = await expensesApi.getPresignedUrl(eventId, filename);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={isBusy}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>Scan Receipt</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={!isBusy}>
        <Typography.Header style={styles.mainTitle}>Let AI Handle The Math!</Typography.Header>

        <TouchableOpacity
          onPress={!imageUri ? openReceiptSourcePicker : undefined}
          style={[styles.imageCard, imageUri && styles.imageCardReady]}
          disabled={isBusy || !!imageUri}
        >
          {imageUri ? (
            <View style={styles.readyState}>
              <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
              <View style={styles.readyOverlay} />
              <View style={styles.readyBadge}>
                <CheckCircle2 size={18} color={Colors.secondary} />
                <Typography.Body style={styles.readyTitle}>Receipt ready</Typography.Body>
              </View>
              <View style={styles.readyActions}>
                <TouchableOpacity style={styles.readyActionBtn} onPress={() => setImageUri(null)} disabled={isBusy}>
                  <Trash2 size={16} color={Colors.danger} />
                  <Typography.Caption style={styles.removeActionText}>Remove</Typography.Caption>
                </TouchableOpacity>
                <TouchableOpacity style={styles.readyActionBtn} onPress={openReceiptSourcePicker} disabled={isBusy}>
                  <RefreshCw size={16} color={Colors.secondary} />
                  <Typography.Caption style={styles.uploadAgainText}>Upload again</Typography.Caption>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.cameraIconCircle}>
                <Camera size={40} color={Colors.primary} />
              </View>
              <Typography.Body style={styles.placeholderText}>Tap to upload from gallery or take a photo</Typography.Body>
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
            editable={!isBusy}
          />
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
            disabled={isBusy}
          >
            {isRecording ? <Square size={20} color="red" /> : <Mic size={20} color={Colors.text} />}
          </TouchableOpacity>
        </Card>

        <View style={styles.tipsRow}>
          <Sparkles size={16} color={Colors.primary} />
          <Typography.Caption style={styles.tipsText}>Specify names, percentages, or items</Typography.Caption>
        </View>
      </ScrollView>

      {!loading && (
        <View style={styles.footer}>
          <Button
            title="Analyze with AI"
            onPress={handleAnalyze}
            disabled={isBusy || !imageUri || !instruction.trim()}
            style={[styles.analyzeBtn, (!imageUri || !instruction.trim()) && { opacity: 0.5 }]}
          />
        </View>
      )}

      <BusyOverlay visible={isBusy} label={loadingStep} />
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
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  imageCardReady: {
    borderColor: '#D1F3DB',
    borderStyle: 'solid',
    backgroundColor: '#F4FFF7',
  },
  preview: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: Spacing.md },
  cameraIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF9F4', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  readyState: { width: '100%', height: '100%', justifyContent: 'space-between' },
  readyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244, 255, 247, 0.18)',
  },
  readyBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#D1F3DB',
  },
  readyTitle: { color: '#166534', fontWeight: '700' },
  readyActions: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  readyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: Colors.itemBorder,
  },
  removeActionText: { color: Colors.danger, fontWeight: '700' },
  uploadAgainText: { color: '#166534', fontWeight: '700' },

  sectionTitle: { marginBottom: Spacing.sm, fontSize: 12, letterSpacing: 1.2, color: Colors.textSecondary, fontWeight: '700' },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
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
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: Spacing.xl + 20, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderTopWidth: 1, borderTopColor: Colors.itemBorder },
  analyzeBtn: { height: 56, borderRadius: BorderRadius.round },
});
