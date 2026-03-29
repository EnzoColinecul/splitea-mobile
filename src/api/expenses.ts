import { DashboardSummary, Expense } from '../types';
import apiClient from './api-client';

export const expensesApi = {
  getSummary: async () => {
    const response = await apiClient.get<DashboardSummary>('/expense/user/summary');
    return response.data;
  },
  listUserExpenses: async (params?: { limit?: number; offset?: number }) => {
    const response = await apiClient.get<{ expenses: Expense[]; total: number }>('/expense/user/expenses', { params });
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post<Expense>('/expense/create', data);
    return response.data;
  },
  settleUp: async (friendId: string, groupId?: string) => {
    const response = await apiClient.post('/expense/settle-up', { friend_id: friendId, group_id: groupId });
    return response.data;
  },
  getStatistics: async (params?: { group_id?: string; user_id?: string }) => {
    const response = await apiClient.get('/expense/statistics', { params });
    return response.data;
  },
  getGroupBalances: async (groupId: string) => {
    const response = await apiClient.get<{ balances: any[] }>(`/expense/group/${groupId}/balances`);
    return response.data.balances;
  },
  settleSplit: async (splitId: string) => {
    const response = await apiClient.post(`/expense/split/${splitId}/settle`);
    return response.data;
  },
  getPresignedUrl: async (eventId: string, filename: string) => {
    const response = await apiClient.get<{ upload_url: string; object_key: string }>(
      '/expense/presigned-url',
      { params: { event_id: eventId, filename } }
    );
    return response.data;
  },
  analyzeReceipt: async (data: {
    s3_key: string;
    instruction: string;
    participant_ids: string[];
    group_id?: string;
  }) => {
    const response = await apiClient.post('/expense/analyze-receipt', data);
    return response.data as ReceiptAnalyzeResponse;
  },
  extractReceiptTotal: async (data: { s3_key: string }) => {
    const response = await apiClient.post('/expense/extract-receipt-total', data);
    return response.data as ReceiptTotalResponse;
  },
  transcribeInstruction: async (formData: FormData) => {
    const response = await apiClient.post<TranscribeAudioResponse>(
      '/expense/transcribe-instruction',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },
};

export interface TranscribeAudioResponse {
  transcription: string;
}

export interface ReceiptTotalResponse {
  total_amount: number;
  currency: string;
}

export interface ProposedSplit {
  user_id: string;
  name: string;
  amount_owed: number;
  reasoning?: string;
}

export interface ProposedExpense {
  title: string;
  paid_by: string;
  total_amount: number;
  splits: ProposedSplit[];
}

export interface LineItem {
  description: string;
  quantity?: string;
  unit_price?: string;
  total_price?: string;
}

export interface ReceiptAnalyzeResponse {
  line_items: LineItem[];
  proposed_expenses: ProposedExpense[];
  receipt_total: number;
  currency: string;
}
