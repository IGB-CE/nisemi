import { Tabs } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { Text } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const isDriver = user?.role === 'DRIVER' || user?.role === 'ADMIN';

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.subtle,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: 8, height: 60 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Kërko', tabBarIcon: ({ focused }) => <TabIcon label="🔍" focused={focused} /> }} />
      <Tabs.Screen name="rezervimet" options={{ title: 'Rezervimet', tabBarIcon: ({ focused }) => <TabIcon label="🎫" focused={focused} /> }} />
      {isDriver && (
        <Tabs.Screen name="shofer" options={{ title: 'Shofer', tabBarIcon: ({ focused }) => <TabIcon label="🚗" focused={focused} /> }} />
      )}
      {!isDriver && (
        <Tabs.Screen name="shofer" options={{ href: null }} />
      )}
      <Tabs.Screen name="profili" options={{ title: 'Profili', tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} /> }} />
    </Tabs>
  );
}
