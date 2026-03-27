import { Stack } from 'expo-router';

export default function ExpenseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="choice" />
      <Stack.Screen name="details" />
      <Stack.Screen name="method" />
      <Stack.Screen name="scan-receipt" />
      <Stack.Screen name="receipt-split-preview" />
    </Stack>
  );
}
