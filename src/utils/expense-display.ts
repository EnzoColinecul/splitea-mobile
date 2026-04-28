import { Expense, GroupBalance, User } from '@/types';

export interface MemberDisplay {
  userId: string;
  displayName: string;
  isCurrentUser: boolean;
}

export const formatCurrency = (amount: number = 0, currencySymbol = '$') => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return `${currencySymbol}${safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch (error) {
    return `${currencySymbol}${safeAmount.toFixed(2)}`;
  }
};

export const normalizeMember = (member: any, currentUserId?: string | null): MemberDisplay | null => {
  const userId = member?.user_id || member?.id;
  if (!userId) return null;

  const firstName = typeof member?.first_name === 'string' ? member.first_name.trim() : '';
  const lastName = typeof member?.last_name === 'string' ? member.last_name.trim() : '';
  const fullName = `${firstName} ${lastName}`.trim();
  const fallbackName =
    (typeof member?.name === 'string' && member.name.trim()) ||
    (typeof member?.email === 'string' && member.email.trim()) ||
    'Member';

  return {
    userId,
    displayName: fullName || fallbackName,
    isCurrentUser: userId === currentUserId,
  };
};

export const buildMemberLookup = (members: any[], currentUser?: User | null) => {
  const lookup = new Map<string, MemberDisplay>();

  members.forEach((member) => {
    const normalized = normalizeMember(member, currentUser?.user_id);
    if (normalized) {
      lookup.set(normalized.userId, normalized);
    }
  });

  if (currentUser) {
    lookup.set(currentUser.user_id, {
      userId: currentUser.user_id,
      displayName: `${currentUser.first_name} ${currentUser.last_name}`.trim() || 'You',
      isCurrentUser: true,
    });
  }

  return lookup;
};

export const getDisplayName = (userId: string, lookup: Map<string, MemberDisplay>) => {
  const member = lookup.get(userId);
  if (!member) return 'Member';
  return member.isCurrentUser ? 'You' : member.displayName;
};

export const getBalanceDirectionForUser = (balance: GroupBalance, currentUserId: string) => {
  const amount = Number(balance.balance) || 0;
  if (amount <= 0) return null;

  if (balance.user_id === currentUserId) {
    return {
      amount,
      counterpartyId: balance.other_user_id,
      type: 'pay' as const,
    };
  }

  if (balance.other_user_id === currentUserId) {
    return {
      amount,
      counterpartyId: balance.user_id,
      type: 'receive' as const,
    };
  }

  return null;
};

export const getExpenseParticipantAmount = (expense: Expense, userId: string) => {
  return Number(expense.splits?.find((split) => split.user_id === userId)?.amount_owed || 0);
};

export const deriveGroupBalancesFromExpenses = (expenses: Expense[]): GroupBalance[] => {
  const pairTotals = new Map<string, number>();

  expenses.forEach((expense) => {
    const payerId = expense.paid_by;
    if (!payerId || !Array.isArray(expense.splits)) return;

    expense.splits.forEach((split) => {
      const debtorId = split.user_id;
      const amount = Number(split.amount_owed) || 0;

      if (!debtorId || debtorId === payerId || amount <= 0) {
        return;
      }

      const forwardKey = `${debtorId}:${payerId}`;
      const reverseKey = `${payerId}:${debtorId}`;
      const reverseAmount = pairTotals.get(reverseKey) || 0;

      if (reverseAmount > 0) {
        const netAmount = reverseAmount - amount;
        if (netAmount > 0) {
          pairTotals.set(reverseKey, Number(netAmount.toFixed(2)));
          pairTotals.delete(forwardKey);
        } else if (netAmount < 0) {
          pairTotals.delete(reverseKey);
          pairTotals.set(forwardKey, Number(Math.abs(netAmount).toFixed(2)));
        } else {
          pairTotals.delete(reverseKey);
          pairTotals.delete(forwardKey);
        }
        return;
      }

      pairTotals.set(forwardKey, Number(((pairTotals.get(forwardKey) || 0) + amount).toFixed(2)));
    });
  });

  return Array.from(pairTotals.entries())
    .map(([pair, balance]) => {
      const [user_id, other_user_id] = pair.split(':');
      return {
        user_id,
        other_user_id,
        balance,
        last_updated: '',
      };
    })
    .filter((balance) => balance.balance > 0)
    .sort((left, right) => right.balance - left.balance);
};
