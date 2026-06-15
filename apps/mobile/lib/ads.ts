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
  console.log('[ads] bootstrap start');
  await gatherUmpConsent();
  console.log('[ads] UMP done, canRequestAds =', canRequestAds);
  await requestTrackingPermission();
  if (canRequestAds || AdsConsentStatus.NOT_REQUIRED) {
    await initializeAds();
    console.log('[ads] SDK initialized');
  } else {
    console.log('[ads] skipping init — consent denied');
  }
}

// Loads and shows an interstitial. Triggered after every booking and every
// trip publish.
function loadAndShowInterstitial(): void {
  if (!initialized) {
    console.log('[ads] interstitial skipped — SDK not initialized');
    return;
  }
  console.log('[ads] requesting interstitial');
  const ad = InterstitialAd.createForAdRequest(adUnitIds.interstitial, {
    requestNonPersonalizedAdsOnly: !isTrackingAllowed(),
  });
  const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    console.log('[ads] interstitial LOADED, showing');
    ad.show();
  });
  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    console.log('[ads] interstitial CLOSED');
    unsubLoaded();
    unsubClosed();
    unsubError();
  });
  const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
    console.log('[ads] interstitial ERROR:', error);
    unsubLoaded();
    unsubClosed();
    unsubError();
  });
  ad.load();
}

export function maybeShowInterstitialAfterBooking(): void {
  console.log('[ads] booking interstitial requested');
  loadAndShowInterstitial();
}

export function showInterstitialAfterPublish(): void {
  console.log('[ads] publish interstitial requested');
  loadAndShowInterstitial();
}

export async function showRewardedAd(): Promise<boolean> {
  if (!initialized) {
    console.log('[ads] SDK not initialized — initializing now');
    try {
      await initializeAds();
    } catch (e) {
      console.log('[ads] init failed:', e);
      return false;
    }
  }
  console.log('[ads] requesting rewarded ad with unit:', adUnitIds.rewarded);
  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(adUnitIds.rewarded, {
      requestNonPersonalizedAdsOnly: !isTrackingAllowed(),
    });
    let earned = false;
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('[ads] rewarded LOADED, showing');
      ad.show();
    });
    const unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      console.log('[ads] EARNED_REWARD');
      earned = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[ads] CLOSED, earned =', earned);
      cleanup();
      resolve(earned);
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('[ads] ERROR loading rewarded:', error);
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
