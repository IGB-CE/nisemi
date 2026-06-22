const base = require('./app.json');

const TEST_ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

const GOOGLE_IOS_URL_SCHEME = 'com.googleusercontent.apps.1039009843352-6k7m327kvdq8i6h39kbt34d51uqjvls5';

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    android: {
      ...base.expo.android,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
        },
      },
    },
    plugins: [
      ...(base.expo.plugins ?? []),
      './plugins/withGoogleModularHeaders',
      '@react-native-community/datetimepicker',
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID ?? TEST_ADMOB_ANDROID_APP_ID,
          iosAppId: process.env.ADMOB_IOS_APP_ID ?? TEST_ADMOB_IOS_APP_ID,
        },
      ],
      [
        'expo-tracking-transparency',
        {
          userTrackingPermission:
            'Lejimi i ndjekjes na ndihmon të shfaqim reklama më relevante. Ju mund të refuzoni pa humbur asnjë funksion të aplikacionit.',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: GOOGLE_IOS_URL_SCHEME },
      ],
    ],
  },
};
