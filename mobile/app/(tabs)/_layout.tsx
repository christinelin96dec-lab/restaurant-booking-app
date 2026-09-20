import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme/colors';

function TabIcon({ symbol }: { symbol: string }) {
  return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: () => <TabIcon symbol="🔍" /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'My Bookings', tabBarIcon: () => <TabIcon symbol="📅" /> }} />
      <Tabs.Screen name="vouchers" options={{ title: 'Vouchers', tabBarIcon: () => <TabIcon symbol="🎁" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => <TabIcon symbol="👤" /> }} />
    </Tabs>
  );
}
