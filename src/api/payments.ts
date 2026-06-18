import apiClient from './api-client';
import {
  EligibilityProvider,
  PaymentEligibility,
  PaymentSettlement,
  SettlementResponse,
  StripeAccountStatus,
  StripeConnectResponse,
} from '@/types';

export const paymentsApi = {
  async getProviders(): Promise<{ providers: Array<{ provider: string; display_name: string; connected: boolean; payable: boolean }> }> {
    const res = await apiClient.get('/payments/providers');
    return res.data;
  },

  async stripeConnect(): Promise<StripeConnectResponse> {
    const res = await apiClient.post('/payments/stripe/connect');
    return res.data;
  },

  async getStripeAccount(): Promise<StripeAccountStatus> {
    const res = await apiClient.get('/payments/stripe/account');
    return res.data;
  },

  async refreshStripeAccount(): Promise<StripeAccountStatus> {
    const res = await apiClient.post('/payments/stripe/account/refresh');
    return res.data;
  },

  async getEligibility(expenseSplitId: string): Promise<PaymentEligibility> {
    const res = await apiClient.get(`/payments/eligibility/${expenseSplitId}`);
    return res.data;
  },

  async settle(expenseSplitId: string): Promise<SettlementResponse> {
    const res = await apiClient.post(`/payments/stripe/settle/${expenseSplitId}`);
    return res.data;
  },

  async getSettlement(expenseSplitId: string): Promise<PaymentSettlement> {
    const res = await apiClient.get(`/payments/stripe/settlements/${expenseSplitId}`);
    return res.data;
  },
};
