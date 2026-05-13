import { Platform } from 'react-native';
import mobileAds, { TestIds } from 'react-native-google-mobile-ads';

const isDev = __DEV__;

function pickId(testId: string, androidProdEnv: string | undefined, iosProdEnv: string | undefined): string {
  if (isDev) return testId;
  const prodId = Platform.OS === 'ios' ? iosProdEnv : androidProdEnv;
  return prodId ?? testId;
}

export const adUnitIds = {
  rewarded: pickId(
    TestIds.REWARDED,
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
  ),
  interstitial: pickId(
    TestIds.INTERSTITIAL,
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
  ),
};

let initialized = false;

export async function initializeAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await mobileAds().initialize();
}
