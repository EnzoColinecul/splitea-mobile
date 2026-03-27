export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserUpdate {
  first_name: string;
  last_name: string;
}

export interface Group {
  group_id: string;
  name: string;
  description?: string;
  created_at: string;
  members_count?: number;
}

export interface Friend {
  friend_id: string;
  user_id: string;
  friend_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface FriendRequest {
  friend_request_id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

export enum SplitType {
  EQUALLY = 'equally',
  PERCENTAGE = 'percentage',
  EXACT = 'exact',
}

export interface ExpenseSplit {
  split_id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_paid: boolean;
}

export interface Expense {
  expense_id: string;
  description: string;
  amount: number;
  payer_id: string;
  group_id?: string;
  category?: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface DashboardSummary {
  total_owed_to_me: number;
  total_i_owe: number;
  balance: number;
  recent_activities: any[];
}

export interface ExpenseStatistics {
  total_expenses: number;
  total_amount: number;
  by_category: Record<string, number>;
  monthly_trend: any[];
}

export interface GroupBalance {
  user_id: string;
  other_user_id: string;
  balance: number;
  last_updated: string;
}
