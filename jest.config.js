module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-worklets-core|react-native-vision-camera|react-native-vision-camera-face-detector)/',
  ],
};
