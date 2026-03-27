import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Input, Typography } from '@/components/common/shared';
import { BorderRadius, Colors, Spacing } from '@/theme/theme';
import { SplitType } from '@/types';
import { Participant } from './participant-selector';

export interface SplitAmount {
  userId: string;
  amount: number;
}

interface SplitEditorProps {
  payerUserId: string;
  participants: Participant[];
  splitType: SplitType;
  totalAmount: number;
  splits: SplitAmount[];
  onSplitsChange: (splits: SplitAmount[]) => void;
  minimalist?: boolean;
}

export const SplitEditor: React.FC<SplitEditorProps> = ({ payerUserId, participants, splitType, totalAmount, splits, onSplitsChange, minimalist }) => {
  const handleAmountChange = (userId: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const newSplits = splits.map(s => s.userId === userId ? { ...s, amount: numericValue } : s);

    // If we don't have a split object for this user yet, add it
    if (!newSplits.find(s => s.userId === userId)) {
      newSplits.push({ userId, amount: numericValue });
    }

    onSplitsChange(newSplits);
  };

  const calculateEqualAmount = () => {
    if (participants.length === 0 || totalAmount === 0) return 0;
    return Number((totalAmount / participants.length).toFixed(2));
  };

  const renderParticipants = () => {
    if (splitType === SplitType.EQUALLY) {
      const equalAmt = calculateEqualAmount();
      return participants.map((p) => (
        <View key={p.id} style={[styles.row, minimalist && styles.minimalistRow]}>
          <View>
            <Typography.Body style={styles.name}>{p.name}</Typography.Body>
            <Typography.Caption style={styles.subtitle}>
              {p.id === payerUserId ? 'paid by this person' : `owes ${participants.find((participant) => participant.id === payerUserId)?.name?.split(' ')[0] || 'payer'}`}
            </Typography.Caption>
          </View>
          <Typography.Header style={[styles.amountLabel, minimalist && styles.minimalistAmount]}>
            ${equalAmt}
          </Typography.Header>
        </View>
      ));
    }

    return participants.map((p) => {
      const split = splits.find(s => s.userId === p.id);
      const val = split?.amount ? split.amount.toString() : '';
      return (
        <View key={p.id} style={[styles.rowInput, minimalist && styles.minimalistRow]}>
          <View style={{ flex: 1 }}>
            <Typography.Body style={styles.name}>{p.name}</Typography.Body>
            <Typography.Caption style={styles.subtitle}>
              {p.id === payerUserId ? 'paid by this person' : `owes ${participants.find((participant) => participant.id === payerUserId)?.name?.split(' ')[0] || 'payer'}`}
            </Typography.Caption>
          </View>
          <View style={{ width: 100 }}>
            {minimalist ? (
              <Typography.Header style={styles.minimalistAmount}>${val || '0'}</Typography.Header>
            ) : (
              <Input
                value={val}
                onChangeText={(v) => handleAmountChange(p.id, v)}
                placeholder={splitType === SplitType.PERCENTAGE ? "0%" : "$0.00"}
                keyboardType="numeric"
              />
            )}
          </View>
        </View>
      );
    });
  };

  return (
    <View style={[styles.container, minimalist && styles.minimalistContainer]}>
      {renderParticipants()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
  },
  minimalistContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.itemBorder,
  },
  minimalistRow: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  rowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: -2,
  },
  amountLabel: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '700',
  },
  minimalistAmount: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: 0,
    fontWeight: '700',
  }
});
