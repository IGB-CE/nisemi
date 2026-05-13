const base = require('./app.json');

const TEST_ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

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
    ],
  },
};
