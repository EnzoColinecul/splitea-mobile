export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  preferred_currency: string;
  language: string;
  avatar_url?: string | null;
  avatar_s3_key?: string | null;
  /** Stable image identity for caching — see the `cacheKey` prop on `Avatar`. */
  avatar_cache_key?: string | null;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  preferred_currency?: string;
  language?: string;
  avatar_s3_key?: string | null;
}

export interface Group {
  group_id: string;
  name: string;
  description?: string;
  created_at: string;
  members_count?: number;
  emoji?: string | null;
  picture_s3_key?: string | null;
  picture_url?: string | null;
  /** Stable image identity for caching — see the `cacheKey` prop on `Avatar`. */
  picture_cache_key?: string | null;
  is_pinned?: boolean;
  owner_id?: string;
  users?: string[];
}

export interface Friend {
  friendship_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  avatar_url?: string | null;
  avatar_cache_key?: string | null;
  net_balance?: number;
}

export interface FriendBalance {
  other_user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  avatar_cache_key?: string | null;
  amount: number;
  direction: 'owes_me' | 'i_owe' | 'settled';
}

export interface FriendBalanceListResponse {
  balances: FriendBalance[];
  total_owed_to_me: number;
  total_i_owe: number;
  net_balance: number;
}

export interface ActivityItem {
  type: 'expense' | 'settle_up';
  id: string;
  title: string;
  amount: number;
  paid_by: string;
  expense_date: string;
  group_id?: string | null;
  group_name?: string | null;
  your_share: number;
  currency: string;
  payment_method?: 'manual' | 'stripe' | null;
}

export interface UserActivityResponse {
  items: ActivityItem[];
  total: number;
  net_balance: number;
}

export interface UploadUrlResponse {
  upload_url: string;
  object_key: string;
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
  expense_split_id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  percentage?: number;
  shares?: number;
  is_paid: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  expense_id: string;
  group_id?: string;
  title: string;
  total_amount: number;
  paid_by: string;
  description?: string;
  expense_type: string;
  payment_method?: 'manual' | 'stripe' | null;
  split_type: string;
  currency: string;
  receipt_url?: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
  splits: ExpenseSplit[];
  is_deleted?: boolean;
  deleted_by?: string;
  deleted_at?: string;
}

export interface DashboardSummary {
  user_id: string;
  total_paid: number;
  total_owed: number;
  net_balance: number;
  expenses_count: number;
  splits_count: number;
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

// Payment types
export interface StripeConnectResponse {
  url: string;
  stripe_account_id: string;
}

export interface StripeAccountStatus {
  connected: boolean;
  stripe_account_id?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  payable: boolean;
}

export interface EligibilityProvider {
  provider: string;
  enabled: boolean;
  reason?: string;
  message?: string;
}

export interface PaymentEligibility {
  expense_split_id: string;
  providers: EligibilityProvider[];
}

export interface SettlementResponse {
  settlement_id: string;
  checkout_url: string;
  status: string;
}

export interface PaymentSettlement {
  settlement_id: string;
  expense_split_id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  amount: number;
  currency: string;
}
