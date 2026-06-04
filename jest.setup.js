import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevice: jest.fn(() => null),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn(async () => true),
  })),
  useFrameProcessor: jest.fn(),
}));

jest.mock('react-native-vision-camera-face-detector', () => ({
  FaceDetector: jest.fn(),
  useFaceDetector: jest.fn(() => ({
    detectFaces: jest.fn(() => []),
  })),
}));

jest.mock('react-native-worklets-core', () => ({
  useRunOnJS: jest.fn(callback => callback),
  useSharedValue: jest.fn(initialValue => ({value: initialValue})),
}));

jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));
