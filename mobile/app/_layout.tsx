import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="restaurant/[id]" options={{ title: '' }} />
        <Stack.Screen name="booking/[restaurantId]" options={{ title: 'Book a table' }} />
        <Stack.Screen name="bulk-order/[restaurantId]" options={{ title: 'Bulk / event order' }} />
        <Stack.Screen name="admin/dashboard" options={{ title: 'Restaurant admin' }} />
      </Stack>
    </QueryClientProvider>
  );
}
