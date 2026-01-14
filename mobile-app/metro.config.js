const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable Expo Router if not using it, or keep it default
// The previous version had this:
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: false,
};

module.exports = config;
