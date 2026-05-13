import { Platform } from 'react-native';
import mobileAds, { TestIds, MaxAdContentRating } from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
  type PermissionStatus,
} from 'expo-tracking-transparency';

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

let trackingStatus: PermissionStatus | null = null;
let initialized = false;

export async function requestTrackingPermission(): Promise<PermissionStatus> {
  if (Platform.OS !== 'ios') {
    trackingStatus = 'granted' as PermissionStatus;
    return trackingStatus;
  }
  const existing = await getTrackingPermissionsAsync();
  if (existing.status !== 'undetermined') {
    trackingStatus = existing.status;
    return trackingStatus;
  }
  const requested = await requestTrackingPermissionsAsync();
  trackingStatus = requested.status;
  return trackingStatus;
}

export function isTrackingAllowed(): boolean {
  return trackingStatus === 'granted';
}

export async function initializeAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await mobileAds()
    .setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    })
    .then(() => mobileAds().initialize());
}
