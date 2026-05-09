const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // npm workspaces keeps expo-router nested in this app, so the hoisted
    // preset cannot always auto-detect and enable this transform.
    plugins: [expoRouterBabelPlugin],
  };
};
