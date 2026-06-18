import { DeviceEventEmitter } from 'react-native';

export interface PaymentReceivedPayload {
  expense_id: string;
  expense_split_id?: string;
  settle_expense_id?: string;
}

export const GlobalEvents = {
  CURRENCY_SELECTED: 'CURRENCY_SELECTED',
  LANGUAGE_SELECTED: 'LANGUAGE_SELECTED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',

  emitCurrencySelected: (code: string) => DeviceEventEmitter.emit('CURRENCY_SELECTED', code),
  emitLanguageSelected: (code: string) => DeviceEventEmitter.emit('LANGUAGE_SELECTED', code),
  emitPaymentReceived: (payload: PaymentReceivedPayload) =>
    DeviceEventEmitter.emit('PAYMENT_RECEIVED', payload),
};
