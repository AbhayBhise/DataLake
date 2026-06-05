// ─── Auth Screen ──────────────────────────────────────────────────────────────
// Full-screen face authentication with active liveness challenge
// Uses react-native-vision-camera v4 + face detector worklet
// Native FaceAuthModule handles TFLite inference + cosine similarity

import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, StatusBar, PermissionsAndroid,
  Linking, Animated, BackHandler, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera, useCameraDevice, useFrameProcessor,
} from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { useRunOnJS, useSharedValue } from 'react-native-worklets-core';
import Tts from 'react-native-tts';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import FaceGuideOverlay, { ScanStep } from '../components/FaceGuideOverlay';
import FaceAuthService from '../services/faceAuth';
import DatabaseService from '../services/database';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Auth'>;

// ── Challenge sequence definitions ────────────────────────────────────────────
interface Challenge {
  id: 'smile' | 'blink' | 'neutral';
  label: string;
  ttsPrompt: string;
  icon: string;
}

const ALL_CHALLENGES: Challenge[] = [
  { id: 'smile',   label: 'Smile widely',     ttsPrompt: 'Please smile widely.',          icon: '😄' },
  { id: 'blink',   label: 'Blink your eyes',  ttsPrompt: 'Please blink both eyes.',        icon: '😑' },
  { id: 'neutral', label: 'Neutral face',      ttsPrompt: 'Please keep a neutral face.',   icon: '😐' },
];

const SEQUENCE_LENGTH = 3;

function generateSequence(): Challenge[] {
  const shuffled = [...ALL_CHALLENGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SEQUENCE_LENGTH);
}

function generateHash(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

const LOCATION_POOL = [
  'NH-44 Toll Plaza, Delhi', 'NH-48 Entry Gate, Gurugram',
  'NH-8 Field Station, Jaipur', 'NH-19 Booth #14, Agra',
  'NH-27 Checkpoint, Lucknow',
];

// ─────────────────────────────────────────────────────────────────────────────

const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const device      = useCameraDevice(cameraPosition);

  const toggleCamera = useCallback(() => {
    setCameraPosition(prev => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const cameraRef = useRef<Camera>(null);

  // Permission
  const [hasCamPerm, setHasCamPerm] = useState(false);

  // Input
  const [employeeId, setEmployeeId] = useState('');

  // Flow state
  const [phase, setPhase]       = useState<'input' | 'camera'>('input');
  const [scanStep, setScanStep] = useState<ScanStep>('align');
  const [prompt, setPrompt]     = useState('Align your face inside the oval');
  const [processing, setProcessing] = useState(false);

  // Challenge sequence
  const [sequence, setSequence]       = useState<Challenge[]>([]);
  const [seqStep, setSeqStep]         = useState(0);
  const [seqHash, setSeqHash]         = useState('');

  // Shared values (worklet-safe)
  const fpReady    = useSharedValue(false);  // frame processor gate
  const curStepIdx = useSharedValue(0);       // current step index (for worklet)

  // Ref so onChallengeMatch can call runFaceMatch without forward-reference issue
  const runFaceMatchRef = useRef<() => void>(() => {});

  // Animations
  const slideAnim  = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const timersRef = useRef<any[]>([]);

  const safeTimeout = useCallback((cb: () => void, delay: number) => {
    const timer = setTimeout(() => {
      cb();
      timersRef.current = timersRef.current.filter((t) => t !== timer);
    }, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // ── Permission check ───────────────────────────────────────────────────────
  const checkPermission = useCallback(async () => {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    setHasCamPerm(granted);
  }, []);

  useEffect(() => {
    checkPermission();
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [checkPermission, slideAnim, opacityAnim]);

  // Hardware back: exit camera phase or go back
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'camera') {
        cancelCamera();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [phase]);

  // TTS setup
  useEffect(() => {
    Tts.setDefaultLanguage('en-IN');
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(1.1);
    return () => {
      Tts.stop();
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const speak = (text: string) => {
    Tts.stop();
    Tts.speak(text);
  };

  const requestPermission = async () => {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Required',
        message: 'DatalakeEdge needs camera access for face authentication.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      setHasCamPerm(true);
      return true;
    }
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Camera Permission Denied',
        'Please enable camera access in device Settings to use face authentication.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
    return false;
  };

  // ── Start auth flow ────────────────────────────────────────────────────────
  const handleStart = async () => {
    Keyboard.dismiss();
    if (!employeeId.trim()) {
      Alert.alert('Employee ID Required', 'Please enter your Employee ID to proceed.');
      return;
    }
    const id = employeeId.trim().toUpperCase();

    // Check employee registered
    const exists = await DatabaseService.employeeExists(id);
    if (!exists) {
      Alert.alert(
        'Not Enrolled',
        `Employee "${id}" has no registered face profile. Please enrol first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enrol Now', onPress: () => navigation.navigate('Register') },
        ],
      );
      return;
    }

    const permitted = hasCamPerm || await requestPermission();
    if (!permitted) return;

    // Generate challenge sequence
    const seq  = generateSequence();
    const hash = generateHash();
    setSequence(seq);
    setSeqStep(0);
    setSeqHash(hash);
    curStepIdx.value = 0;

    setPhase('camera');
    setScanStep('align');
    setPrompt('Align your face inside the oval');
    speak('Please align your face inside the oval circle.');
  };

  const cancelCamera = () => {
    clearAllTimers();
    fpReady.value = false;
    Tts.stop();
    setPhase('input');
    setScanStep('align');
    setProcessing(false);
  };

  // ── Liveness start ────────────────────────────────────────────────────────
  const startLivenessChallenge = () => {
    if (sequence.length === 0) return;
    const first = sequence[0];
    setSeqStep(0);
    curStepIdx.value = 0;
    setScanStep('challenge');
    setPrompt(`${first.icon}  ${first.label}`);
    speak(first.ttsPrompt);
    // Small delay before activating frame processor
    safeTimeout(() => { fpReady.value = true; }, 200);
  };

  // ── Face detection (worklet — runs on background thread) ─────────────────
  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    classificationMode: 'all',
  });

  // Called from worklet back on JS thread
  const onChallengeMatch = useRunOnJS((matchedId: string) => {
    if (scanStep !== 'challenge') return;

    const currentChallenge = sequence[seqStep];
    if (!currentChallenge || matchedId !== currentChallenge.id) return;

    // Pause FP briefly to avoid double-triggers
    fpReady.value = false;

    const nextStep = seqStep + 1;

    if (nextStep >= sequence.length) {
      // All challenges complete!
      Tts.stop();
      Tts.speak('Liveness verified. Running face match.');
      setSeqStep(sequence.length);
      // Use ref to avoid forward-reference issue with runFaceMatch
      runFaceMatchRef.current();
    } else {
      const next = sequence[nextStep];
      setSeqStep(nextStep);
      curStepIdx.value = nextStep;
      setPrompt(`${next.icon}  ${next.label}`);
      Tts.stop();
      Tts.speak(next.ttsPrompt);
      // Re-enable after 600ms debounce
      safeTimeout(() => { fpReady.value = true; }, 600);
    }
  }, [scanStep, sequence, seqStep, fpReady, curStepIdx, runFaceMatchRef, safeTimeout]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!fpReady.value) return;

    const faces = detectFaces(frame);
    if (faces.length === 0) return;

    const face = faces[0];
    const smile    = face.smilingProbability    ?? 0;
    const leftEye  = face.leftEyeOpenProbability  ?? 1;
    const rightEye = face.rightEyeOpenProbability ?? 1;

    // Detect which expression is happening
    let detected: string = '';
    if (smile > 0.72) {
      detected = 'smile';
    } else if (leftEye < 0.25 && rightEye < 0.25) {
      detected = 'blink';
    } else if (smile < 0.25 && leftEye > 0.75 && rightEye > 0.75) {
      detected = 'neutral';
    }

    if (detected !== '') {
      onChallengeMatch(detected);
    }
  }, [detectFaces, onChallengeMatch]);

  // ── Face match (after liveness passes) ────────────────────────────────────
  const runFaceMatch = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready. Please try again.');
      setScanStep('align');
      return;
    }
    setScanStep('matching');
    setPrompt('Verifying identity offline…');
    setProcessing(true);

    try {
      // Small stabilization delay to ensure UI updates and camera hardware settles
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 300));
      const startTime = Date.now();

      // Retry mechanism to make photo capture resilient to transient hardware states
      let photo;
      let retries = 3;
      while (retries > 0) {
        try {
          photo = await cameraRef.current.takePhoto({ flash: 'off' });
          break;
        } catch (takePhotoError) {
          console.warn(`[Auth] takePhoto failed, retries left: ${retries - 1}. Error:`, takePhotoError);
          retries--;
          if (retries === 0) {
            throw takePhotoError;
          }
          await new Promise<void>((resolve) => setTimeout(() => resolve(), 250));
        }
      }

      const fileUri = `file://${photo!.path}`;
      const id = employeeId.trim().toUpperCase();

      const result = await FaceAuthService.authenticateFace(fileUri, id);
      const totalMs = Date.now() - startTime;

      const location = LOCATION_POOL[Math.floor(Math.random() * LOCATION_POOL.length)];

      if (result.success) {
        // Log success
        await DatabaseService.logAttendance({
          employeeId:    id,
          status:        'SUCCESS',
          challengeType: `Temporal Sequence (${sequence.map(c => c.id).join('→')})`,
          sequenceHash:  seqHash,
          location,
          inferenceMs:   result.inferenceMs ?? totalMs,
          confidence:    result.confidence ?? 0,
        });

        setScanStep('done');
        setPrompt('✓ Authentication Successful!');
        speak('Authentication successful. Welcome.');

        safeTimeout(() => {
          navigation.goBack();
        }, 2000);

      } else {
        // Log failure
        await DatabaseService.logAttendance({
          employeeId:    id,
          status:        'FAILED',
          challengeType: `Temporal Sequence (${sequence.map(c => c.id).join('→')})`,
          sequenceHash:  seqHash,
          location,
          inferenceMs:   result.inferenceMs ?? totalMs,
          confidence:    result.confidence ?? 0,
        });

        setScanStep('failed');
        setPrompt('✗ Face match failed');
        speak('Access denied. Face did not match.');

        safeTimeout(() => {
          setScanStep('align');
          setPrompt('Align your face inside the oval');
          setProcessing(false);
        }, 2500);
      }
    } catch (err: any) {
      console.error('[Auth] Face match error:', err);
      setScanStep('failed');
      setPrompt('Error during verification');
      Alert.alert(
        'Verification Error',
        err?.message ?? 'An unexpected error occurred. Please try again.',
        [{ text: 'Try Again', onPress: () => { setScanStep('align'); setPrompt('Align your face inside the oval'); } }],
      );
    } finally {
      setProcessing(false);
      fpReady.value = false;
    }
  };

  // Wire up ref so onChallengeMatch can call runFaceMatch indirectly
  runFaceMatchRef.current = runFaceMatch;

  // ── Render — Input Phase ──────────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />

        {/* Header */}
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Biometric Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View
          style={[styles.inputPhaseContent, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>

          {/* Lock icon */}
          <View style={styles.iconBadge}>
            <Text style={styles.bigIcon}>🔒</Text>
          </View>
          <Text style={styles.sectionHeading}>Face Authentication</Text>
          <Text style={styles.sectionDesc}>
            Enter your Employee ID below. You will then complete a 3-step liveness
            challenge to verify your identity fully offline.
          </Text>

          {/* Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>EMPLOYEE ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. EMP-1001"
              placeholderTextColor={Colors.text.muted}
              value={employeeId}
              onChangeText={t => setEmployeeId(t.toUpperCase())}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
          </View>

          {/* Challenge preview */}
          <View style={styles.challengePreviewCard}>
            <Text style={styles.challengePreviewTitle}>Liveness Challenge Preview</Text>
            <Text style={styles.challengePreviewDesc}>
              You will be asked to perform 3 randomised facial actions:
            </Text>
            <View style={styles.challengeIcons}>
              {ALL_CHALLENGES.map(c => (
                <View key={c.id} style={styles.challengeIconItem}>
                  <Text style={styles.challengeIconEmoji}>{c.icon}</Text>
                  <Text style={styles.challengeIconLabel}>{c.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={[styles.startBtn, Shadow.brand]}
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Start face verification">
            <Text style={styles.startBtnText}>▶  Begin Verification</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Render — Camera Phase ─────────────────────────────────────────────────
  return (
    <View style={styles.cameraContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />

      {/* Camera */}
      {!device || !hasCamPerm ? (
        <View style={styles.camError}>
          <Text style={styles.camErrorIcon}>📷</Text>
          <Text style={styles.camErrorText}>
            {!hasCamPerm
              ? 'Camera permission not granted.'
              : 'No camera device found on this device.'}
          </Text>
          {!hasCamPerm && (
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelCamera}>
            <Text style={styles.cancelBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            photo
            frameProcessor={frameProcessor}
            onError={err => {
              console.error('[Camera] Runtime error:', err);
              if (err.code === 'system/camera-is-restricted') {
                Alert.alert('Camera Restricted', 'Camera access is restricted by the system or another app.');
              }
            }}
          />

          {/* Camera flip button — only visible while user is aligning, before challenge starts */}
          {scanStep === 'align' && !processing && (
            <TouchableOpacity
              style={styles.camFlipBtn}
              onPress={toggleCamera}
              accessibilityRole="button"
              accessibilityLabel="Switch camera">
              <Text style={styles.camFlipIcon}>⇄</Text>
            </TouchableOpacity>
          )}

          {/* Overlay */}
          <FaceGuideOverlay
            scanStep={scanStep}
            promptMessage={prompt}
            sequenceTotal={sequence.length}
            sequenceCurrent={seqStep}
          />

          {/* Close button */}
          <SafeAreaView style={styles.camHeader} edges={['top']}>
            <View style={styles.camHeaderRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={cancelCamera}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.camTitleBox}>
                <Text style={styles.camTitle}>{employeeId.toUpperCase()}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>

          {/* Bottom action area */}
          <View style={styles.bottomActions}>
            {scanStep === 'align' && !processing && (
              <TouchableOpacity
                style={[styles.livenessBigBtn, Shadow.emerald]}
                onPress={startLivenessChallenge}>
                <Text style={styles.livenessBtnText}>▶  Start Liveness Challenge</Text>
              </TouchableOpacity>
            )}
            {scanStep === 'matching' && (
              <View style={styles.matchingRow}>
                <ActivityIndicator size="large" color={Colors.brand.amber} />
                <Text style={styles.matchingText}>Running offline AI inference…</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.bg.primary },
  screenHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                        borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  backBtn:            { width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: Colors.bg.tertiary, borderRadius: Radius.md },
  backIcon:           { color: Colors.text.primary, fontSize: Typography.lg, fontWeight: Typography.bold },
  screenTitle:        { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.bold },
  inputPhaseContent:  { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing['3xl'], alignItems: 'center' },
  iconBadge:          { width: 90, height: 90, borderRadius: 24, backgroundColor: Colors.bg.tertiary,
                        borderWidth: 2, borderColor: Colors.brand.indigo + '66',
                        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
                        ...Shadow.brand },
  bigIcon:            { fontSize: 40 },
  sectionHeading:     { fontSize: Typography.xl, fontWeight: Typography.extrabold, color: Colors.text.primary,
                        textAlign: 'center', marginBottom: Spacing.sm },
  sectionDesc:        { fontSize: Typography.sm, color: Colors.text.muted, textAlign: 'center',
                        lineHeight: 20, marginBottom: Spacing['2xl'] },
  inputContainer:     { width: '100%', marginBottom: Spacing.lg },
  inputLabel:         { fontSize: Typography.xs, color: Colors.brand.indigo, fontWeight: Typography.bold,
                        letterSpacing: Typography.wider, marginBottom: Spacing.xs },
  input:              { backgroundColor: Colors.bg.tertiary, color: Colors.text.primary,
                        borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                        fontSize: Typography.md, fontWeight: Typography.bold,
                        borderWidth: 1, borderColor: Colors.border.default, letterSpacing: Typography.wide },
  challengePreviewCard:{ width: '100%', backgroundColor: Colors.bg.tertiary, borderRadius: Radius.lg,
                         padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.default,
                         marginBottom: Spacing['2xl'] },
  challengePreviewTitle:{ color: Colors.text.secondary, fontSize: Typography.sm, fontWeight: Typography.bold,
                          marginBottom: Spacing.xs },
  challengePreviewDesc: { color: Colors.text.muted, fontSize: Typography.xs, marginBottom: Spacing.md, lineHeight: 18 },
  challengeIcons:     { flexDirection: 'row', justifyContent: 'space-around' },
  challengeIconItem:  { alignItems: 'center', gap: 4 },
  challengeIconEmoji: { fontSize: 28 },
  challengeIconLabel: { fontSize: Typography.xs, color: Colors.text.muted, textAlign: 'center' },
  startBtn:           { width: '100%', backgroundColor: Colors.brand.indigo, borderRadius: Radius.full,
                        paddingVertical: Spacing.lg, alignItems: 'center' },
  startBtnText:       { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.extrabold,
                        letterSpacing: Typography.wide },
  // Camera phase
  cameraContainer:    { flex: 1, backgroundColor: Colors.bg.primary },
  camFlipBtn:         { position: 'absolute', top: 16, right: 16, width: 50, height: 50,
                        borderRadius: 25, backgroundColor: 'rgba(8,14,26,0.65)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                        alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  camFlipIcon:        { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  camError:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'],
                        backgroundColor: Colors.bg.primary },
  camErrorIcon:       { fontSize: 48, marginBottom: Spacing.lg },
  camErrorText:       { color: Colors.text.secondary, textAlign: 'center', fontSize: Typography.base,
                        lineHeight: 22, marginBottom: Spacing.xl },
  permBtn:            { backgroundColor: Colors.brand.indigo, borderRadius: Radius.full,
                        paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg,
                        marginBottom: Spacing.sm },
  permBtnText:        { color: Colors.text.primary, fontWeight: Typography.bold },
  cancelBtn:          { paddingVertical: Spacing.md },
  cancelBtnText:      { color: Colors.text.muted, fontSize: Typography.sm },
  camHeader:          { position: 'absolute', top: 0, left: 0, right: 0 },
  camHeaderRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  closeBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(8,14,26,0.8)',
                        borderWidth: 1, borderColor: Colors.border.default,
                        alignItems: 'center', justifyContent: 'center' },
  closeBtnText:       { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.bold },
  camTitleBox:        { backgroundColor: 'rgba(8,14,26,0.8)', borderRadius: Radius.full,
                        paddingHorizontal: Spacing.lg, paddingVertical: 6,
                        borderWidth: 1, borderColor: Colors.border.default },
  camTitle:           { color: Colors.brand.indigo, fontSize: Typography.sm, fontWeight: Typography.bold,
                        letterSpacing: Typography.wide },
  bottomActions:      { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  livenessBigBtn:     { backgroundColor: Colors.brand.emerald, borderRadius: Radius.full,
                        paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg },
  livenessBtnText:    { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.extrabold,
                        letterSpacing: Typography.wide },
  matchingRow:        { alignItems: 'center', gap: Spacing.sm },
  matchingText:       { color: Colors.text.secondary, fontSize: Typography.sm, fontWeight: Typography.medium },
});

export default AuthScreen;
