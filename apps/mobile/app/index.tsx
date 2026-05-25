import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../lib/colors';

export default function Index() {
  const { token, user, loading } = useAuth();
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (!token) return <Redirect href="/(auth)/login" />;
  if (user && !user.phone) return <Redirect href={'/(auth)/complete-profile' as any} />;
  return <Redirect href="/(tabs)" />;
}
