import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { useTheme } from '../../lib/theme';

export default function AppleSignInButton() {
  const { signIn } = useAuth();
  const dialog = useDialog();
  const { scheme } = useTheme();

  // Sign in with Apple is iOS-only.
  if (Platform.OS !== 'ios') return null;

  const onPress = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) return;
      const res = await api.post<{ token: string; user: any }>('/api/v1/auth/apple', {
        identityToken: credential.identityToken,
        firstName: credential.fullName?.givenName ?? undefined,
        lastName: credential.fullName?.familyName ?? undefined,
      });
      await signIn(res.token, res.user);
      router.replace((res.user.phone ? '/(tabs)' : '/(auth)/complete-profile') as any);
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      await dialog.alert('Gabim', e?.message ?? 'Hyrja me Apple dështoi');
    }
  };

  return (
    <View style={s.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          scheme === 'light'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
        }
        cornerRadius={999}
        style={s.button}
        onPress={onPress}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  button: { width: '100%', height: 48 },
});
