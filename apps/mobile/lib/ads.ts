import { Platform } from 'react-native';
import mobileAds, {
  TestIds,
  MaxAdContentRating,
  AdsConsent,
  AdsConsentStatus,
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
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
let canRequestAds = false;
let privacyOptionsRequired = false;

export async function gatherUmpConsent(): Promise<void> {
  try {
    const info = await AdsConsent.gatherConsent();
    canRequestAds = info.canRequestAds;
    privacyOptionsRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
  } catch {
    canRequestAds = true;
  }
}

export function isPrivacyOptionsRequired(): boolean {
  return privacyOptionsRequired;
}

export async function showPrivacyOptionsForm(): Promise<void> {
  await AdsConsent.showPrivacyOptionsForm();
}

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
  await mobileAds().setRequestConfiguration({
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });
  await mobileAds().initialize();
}

export async function bootstrapAds(): Promise<void> {
  await gatherUmpConsent();
  await requestTrackingPermission();
  if (canRequestAds || AdsConsentStatus.NOT_REQUIRED) {
    await initializeAds();
  }
}

let sessionBookingCount = 0;
let interstitialShownThisSession = false;

export function maybeShowInterstitialAfterBooking(): void {
  sessionBookingCount += 1;
  if (sessionBookingCount < 2) return;
  if (interstitialShownThisSession) return;
  if (!initialized) return;

  const ad = InterstitialAd.createForAdRequest(adUnitIds.interstitial, {
    requestNonPersonalizedAdsOnly: !isTrackingAllowed(),
  });
  const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitialShownThisSession = true;
    ad.show();
  });
  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    unsubLoaded();
    unsubClosed();
    unsubError();
  });
  const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
    unsubLoaded();
    unsubClosed();
    unsubError();
  });
  ad.load();
}

export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(adUnitIds.rewarded, {
      requestNonPersonalizedAdsOnly: !isTrackingAllowed(),
    });
    let earned = false;
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => ad.show());
    const unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup();
      resolve(earned);
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      resolve(false);
    });
    const cleanup = () => {
      unsubLoaded();
      unsubReward();
      unsubClosed();
      unsubError();
    };
    ad.load();
  });
}
