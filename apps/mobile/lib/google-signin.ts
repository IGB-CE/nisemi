import {
  GoogleSignin,
  statusCodes,
  type SignInResponse,
} from '@react-native-google-signin/google-signin';

let configured = false;

export function configureGoogleSignIn() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
    scopes: ['openid', 'email', 'profile'],
  });
  configured = true;
}

export async function signInWithGoogle(): Promise<string | null> {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res: SignInResponse = await GoogleSignin.signIn();
  if (res.type === 'cancelled') return null;
  return res.data.idToken ?? null;
}

export { statusCodes as googleStatusCodes };
