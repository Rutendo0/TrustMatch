const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable CSS support
config.resolver.sourceExts.push('mjs');

module.exports = config;
