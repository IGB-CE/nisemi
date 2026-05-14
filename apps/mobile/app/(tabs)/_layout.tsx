import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function TabsLayout() {
  const { token, user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const isDriver = user?.role === 'DRIVER' || user?.role === 'ADMIN';

  if (loading) return null;
  if (!token) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Kërko', tabBarIcon: () => <TabIcon label="🔍" /> }} />
      <Tabs.Screen name="rezervimet" options={{ title: 'Rezervimet', tabBarIcon: () => <TabIcon label="🎫" /> }} />
      <Tabs.Screen name="mesazhet" options={{ title: 'Mesazhet', tabBarIcon: () => <TabIcon label="💬" /> }} />
      {isDriver ? (
        <Tabs.Screen name="shofer" options={{ title: 'Shofer', tabBarIcon: () => <TabIcon label="🚗" /> }} />
      ) : (
        <Tabs.Screen name="shofer" options={{ href: null }} />
      )}
      <Tabs.Screen name="profili" options={{ title: 'Profili', tabBarIcon: () => <TabIcon label="👤" /> }} />
    </Tabs>
  );
}
