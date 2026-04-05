import { DeviceEventEmitter } from 'react-native';

export const GlobalEvents = {
  CURRENCY_SELECTED: 'CURRENCY_SELECTED',
  LANGUAGE_SELECTED: 'LANGUAGE_SELECTED',
  
  emitCurrencySelected: (code: string) => DeviceEventEmitter.emit('CURRENCY_SELECTED', code),
  emitLanguageSelected: (code: string) => DeviceEventEmitter.emit('LANGUAGE_SELECTED', code),
};
