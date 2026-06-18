import apiClient from '@/api/api-client';
import { GlobalEvents, PaymentReceivedPayload } from '@/utils/events';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STORED_PUSH_TOKEN_KEY = 'PUSH_TOKEN_CACHE';

type NotifSub = { remove: () => void };

let foregroundSub: NotifSub | null = null;
let responseSub: NotifSub | null = null;
let currentToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const dispatchByKind = (data: Record<string, any> | undefined) => {
  if (!data || typeof data !== 'object') return;
  if (data.kind === 'expense.split.paid') {
    GlobalEvents.emitPaymentReceived({
      expense_id: String(data.expense_id),
      expense_split_id: data.expense_split_id ? String(data.expense_split_id) : undefined,
      settle_expense_id: data.settle_expense_id ? String(data.settle_expense_id) : undefined,
    } satisfies PaymentReceivedPayload);
  }
};

export async function registerPushToken(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let permission = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      permission = status;
    }
    if (permission !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

    const tokenResp = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenResp.data;
    if (!token) return null;

    await apiClient.post('/notification/push-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    currentToken = token;

    if (!foregroundSub) {
      foregroundSub = Notifications.addNotificationReceivedListener((notif) => {
        dispatchByKind(notif.request.content.data as Record<string, any> | undefined);
      });
    }
    if (!responseSub) {
      responseSub = Notifications.addNotificationResponseReceivedListener((resp) => {
        dispatchByKind(resp.notification.request.content.data as Record<string, any> | undefined);
      });
    }

    return token;
  } catch (err) {
    console.warn('registerPushToken failed', err);
    return null;
  }
}

export async function unregisterPushToken(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  foregroundSub?.remove();
  responseSub?.remove();
  foregroundSub = null;
  responseSub = null;

  if (!token) return;
  try {
    await apiClient.delete('/notification/push-token', { params: { token } });
  } catch (err) {
    console.warn('unregisterPushToken failed', err);
  }
}

export const _internalKeys = { STORED_PUSH_TOKEN_KEY };
