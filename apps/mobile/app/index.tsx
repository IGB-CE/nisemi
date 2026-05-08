import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../lib/colors';

export default function Index() {
  const { token, loading } = useAuth();
  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}
