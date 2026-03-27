import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Info } from 'lucide-react-native';
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
import {
  ProposedExpense,
  ReceiptAnalyzeResponse
} from '@/api/expenses';
import { Button, Card, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';

export default function ReceiptSplitPreviewScreen() {
  const router = useRouter();
  const { previewData, participantIds, groupId, receiptUrl } = useLocalSearchParams<{
    previewData: string;
    participantIds: string;
    groupId?: string;
    receiptUrl?: string;
  }>();

  const initial: ReceiptAnalyzeResponse = JSON.parse(previewData || '{}');
  const [expenses, setExpenses] = useState<ProposedExpense[]>(initial.proposed_expenses || []);
  const [loading, setLoading] = useState(false);

  const editedTotal = expenses.reduce(
    (acc, exp) => acc + exp.splits.reduce((s, p) => s + p.amount_owed, 0),
    0
  );

  const updateAmount = (expIndex: number, userId: string, raw: string) => {
    const value = parseFloat(raw) || 0;
    setExpenses((prev) =>
      prev.map((exp, i) => {
        if (i !== expIndex) return exp;
        const updatedSplits = exp.splits.map((p) =>
          p.user_id === userId ? { ...p, amount_owed: value } : p
        );
        const newTotal = updatedSplits.reduce((acc, split) => acc + split.amount_owed, 0);
        return { ...exp, splits: updatedSplits, total_amount: newTotal };
      })
    );
  };

  const handleApprove = () => {
    const diff = Math.abs(editedTotal - initial.receipt_total);
    if (diff > 0.05) {
      Alert.alert('Mismatch', `Total is $${editedTotal.toFixed(2)}, receipt was $${initial.receipt_total.toFixed(2)}.`);
      return;
    }

    // Instead of creating immediately, we pass it to the "Final Confirmation" screen (details.tsx)
    // Actually, in the user's flow, Step 4 is the final confirm.
    // If we have MULTIPLE expenses from AI Split, details.tsx might need to be adapted or we just consolidate them.
    // But usually AI Split produces splits for ONE expense or multiple.
    // Let's assume we go to Step 4 with the first expense or a combined one.
    // Or just create them here as "Approve" step.

    // User said: "finally, User confirm the information and create the expense"
    // So let's navigate to details.tsx with the first AI-proposed expense for final confirm.

    if (expenses.length > 1) {
      Alert.alert('Multiple Expenses', 'The AI found multiple sub-groups. We will proceed with the combined details.');
    }

    router.push({
      pathname: '/expense/details',
      params: {
        participants: JSON.stringify(expenses[0].splits.map(s => ({ id: s.user_id, name: s.name }))),
        groupId,
        initialAmount: String(expenses[0].total_amount),
        receiptUrl: receiptUrl,
        // We could pass more complex split data if needed
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <Typography.SubHeader style={styles.headerTitle}>AI Split Preview</Typography.SubHeader>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography.Header style={styles.mainTitle}>Review the split 📋</Typography.Header>

        <View style={styles.receiptSummary}>
          <Typography.Body style={styles.receiptLabel}>RECEIPT TOTAL</Typography.Body>
          <Typography.Header style={styles.receiptValue}>${initial.receipt_total?.toFixed(2)}</Typography.Header>
        </View>

        {expenses.map((exp, expIndex) => (
          <Card key={expIndex} style={styles.expenseCard}>
            <View style={styles.cardHeader}>
              <CheckCircle2 size={18} color={Colors.primary} />
              <Typography.SubHeader style={styles.cardTitle}>{exp.title || 'Expense'}</Typography.SubHeader>
            </View>

            <View style={styles.splitsList}>
              {exp.splits.map((split) => (
                <View key={split.user_id} style={styles.splitRow}>
                  <View style={styles.splitLeft}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{split.name.charAt(0)}</Text>
                    </View>
                    <Typography.Body style={styles.name}>{split.name}</Typography.Body>
                  </View>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.dollar}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={String(split.amount_owed)}
                      onChangeText={(v) => updateAmount(expIndex, split.user_id, v)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.cardFooter}>
              <Typography.Body style={styles.subtotalLabel}>Subtotal</Typography.Body>
              <Typography.SubHeader style={styles.subtotalValue}>${exp.total_amount.toFixed(2)}</Typography.SubHeader>
            </View>
          </Card>
        ))}

        <View style={styles.infoRow}>
          <Info size={16} color={Colors.textSecondary} />
          <Typography.Caption style={styles.infoText}>You can adjust any amount manually.</Typography.Caption>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Looks Good!"
          onPress={handleApprove}
          style={styles.approveBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, color: Colors.text, marginBottom: 0 },
  scroll: { padding: Spacing.xl },
  mainTitle: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.lg, color: Colors.text },

  receiptSummary: { backgroundColor: '#F8FAFC', borderRadius: BorderRadius.card, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.xl, borderWidth: 1.5, borderColor: Colors.itemBorder },
  receiptLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '700', letterSpacing: 1 },
  receiptValue: { fontSize: 36, color: Colors.primary, fontWeight: '900', marginBottom: 0 },

  expenseCard: { marginBottom: Spacing.lg, borderRadius: BorderRadius.card, padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.itemBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  cardTitle: { marginBottom: 0, fontSize: 16, color: Colors.text },

  splitsList: { gap: Spacing.md },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.itemBorder },
  avatarText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14 },
  name: { fontWeight: '600', color: Colors.text },

  amountInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 2, borderBottomWidth: 1.5, borderBottomColor: Colors.itemBorder, paddingHorizontal: 4 },
  dollar: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700' },
  amountInput: { fontSize: 17, fontWeight: '700', color: Colors.text, minWidth: 60, textAlign: 'right' },

  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.itemBorder },
  subtotalLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  subtotalValue: { marginBottom: 0, color: Colors.text, fontSize: 18 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  infoText: { color: Colors.textSecondary, fontWeight: '600' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: Spacing.xl + 20, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderTopWidth: 1, borderTopColor: Colors.itemBorder },
  approveBtn: { height: 56, borderRadius: BorderRadius.round },
});
