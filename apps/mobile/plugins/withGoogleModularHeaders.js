const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// AppCheckCore (pulled in by AdMob + Google Sign-In) is a Swift pod that
// depends on GoogleUtilities and RecaptchaInterop, which don't define module
// maps. As static libraries that breaks the `import` from Swift, failing
// `pod install`. Declaring these pods with :modular_headers => true generates
// the module maps so the build links. See the CocoaPods error:
// "The following Swift pods cannot yet be integrated as static libraries".
const PODS_NEEDING_MODULAR_HEADERS = ['GoogleUtilities', 'RecaptchaInterop'];

module.exports = function withGoogleModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let contents = fs.readFileSync(podfilePath, 'utf8');

      const podLines = PODS_NEEDING_MODULAR_HEADERS.map(
        (pod) => `  pod '${pod}', :modular_headers => true`
      );

      // Insert just inside the app target block, after `target '...' do`.
      const targetRegex = /(target\s+'[^']+'\s+do\n)/;
      if (!targetRegex.test(contents)) {
        throw new Error(
          'withGoogleModularHeaders: could not find a target block in the Podfile'
        );
      }

      // Avoid adding the lines twice on repeated prebuilds.
      if (!contents.includes(`pod '${PODS_NEEDING_MODULAR_HEADERS[0]}'`)) {
        contents = contents.replace(
          targetRegex,
          `$1${podLines.join('\n')}\n`
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
