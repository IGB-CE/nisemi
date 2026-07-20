import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { useColors } from '../../lib/theme';
import { useUnread } from '../../lib/unread';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color }: { color: string }) => <Ionicons name={name} size={22} color={color} />;
}

export default function TabsLayout() {
  const { token, user, loading } = useAuth();
  const colors = useColors();
  const { unread } = useUnread();
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
      <Tabs.Screen name="index" options={{ title: 'Udhëtimet', tabBarIcon: tabIcon('car-outline') }} />
      <Tabs.Screen name="kerkesat" options={{ title: 'Kërkesat', tabBarIcon: tabIcon('hand-left-outline') }} />
      <Tabs.Screen
        name="mesazhet"
        options={{
          title: 'Mesazhet',
          tabBarIcon: tabIcon('chatbubble-outline'),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: '#fff', fontSize: 10, fontWeight: '700' },
        }}
      />
      {isDriver ? (
        <Tabs.Screen name="shofer" options={{ title: 'Shofer', tabBarIcon: tabIcon('speedometer-outline') }} />
      ) : (
        <Tabs.Screen name="shofer" options={{ href: null }} />
      )}
      <Tabs.Screen name="profili" options={{ title: 'Profili', tabBarIcon: tabIcon('person-outline') }} />
    </Tabs>
  );
}
