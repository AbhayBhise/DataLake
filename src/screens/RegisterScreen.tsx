// ─── Register Screen ──────────────────────────────────────────────────────────
// Face enrollment: capture photo, run FaceAuthModule.registerFace,
// save employee record to SQLite

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, StatusBar, PermissionsAndroid, Linking, Animated,
  BackHandler, ActivityIndicator, ScrollView, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Tts from 'react-native-tts';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import FaceGuideOverlay from '../components/FaceGuideOverlay';
import FaceAuthService from '../services/faceAuth';
import DatabaseService from '../services/database';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Register'>;

const DESIGNATIONS = ['Engineer', 'Supervisor', 'Inspector', 'Technician', 'Security', 'Manager', 'Driver'];

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const device    = useCameraDevice(cameraPosition);
  const cameraRef = useRef<Camera>(null);

  const toggleCamera = useCallback(() => {
    setCameraPosition(prev => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const [hasCamPerm, setHasCamPerm] = useState(false);
  const [phase, setPhase]           = useState<'form' | 'camera'>('form');
  const [processing, setProcessing] = useState(false);
  const [captureReady, setCaptureReady] = useState(false);

  // Form fields
  const [employeeId,   setEmployeeId]   = useState('');
  const [name,         setName]         = useState('');
  const [designation,  setDesignation]  = useState('');
  const [showDesgMenu, setShowDesgMenu] = useState(false);

  const slideAnim   = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<any>(null);

  const checkPermission = useCallback(async () => {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    setHasCamPerm(granted);
  }, []);

  useEffect(() => {
    checkPermission();
    Tts.setDefaultLanguage('en-IN');
    Tts.setDefaultRate(0.5);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    return () => {
      Tts.stop();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [checkPermission, slideAnim, opacityAnim]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'camera') { cancelCamera(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [phase]);

  const requestPermission = async () => {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Required',
        message: 'DatalakeEdge needs camera access to enrol your face profile.',
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
        'Permission Required',
        'Please enable camera in device Settings.',
        [{ text: 'Open Settings', onPress: () => Linking.openSettings() }],
      );
    }
    return false;
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const handleProceed = async () => {
    Keyboard.dismiss();
    if (!employeeId.trim()) {
      Alert.alert('Required', 'Please enter an Employee ID.');
      return;
    }
    if (!/^[A-Z0-9\-]{3,16}$/.test(employeeId.trim().toUpperCase())) {
      Alert.alert(
        'Invalid ID',
        'Employee ID must be 3–16 characters (letters, numbers, hyphens only).',
      );
      return;
    }

    const id = employeeId.trim().toUpperCase();

    // Check if already registered
    const exists = await DatabaseService.employeeExists(id);
    if (exists) {
      Alert.alert(
        'Already Registered',
        `Employee "${id}" is already enrolled. Re-enrolling will overwrite the existing face profile.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-enrol', style: 'destructive', onPress: openCamera },
        ],
      );
      return;
    }

    openCamera();
  };

  const openCamera = async () => {
    const permitted = hasCamPerm || await requestPermission();
    if (!permitted) return;
    setCaptureReady(false);
    setPhase('camera');
    Tts.speak('Position your face inside the oval guide and tap capture when ready.');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCaptureReady(true);
      timerRef.current = null;
    }, 1500);
  };

  const cancelCamera = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPhase('form');
    setCaptureReady(false);
    Tts.stop();
  };

  // ── Capture & Register ─────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    Tts.speak('Capturing…');

    try {
      const photo   = await cameraRef.current.takePhoto({ flash: 'off' });
      const fileUri = `file://${photo.path}`;
      const id      = employeeId.trim().toUpperCase();

      const result = await FaceAuthService.registerFace(fileUri, id);

      if (result.success) {
        // Persist employee to DB
        await DatabaseService.registerEmployee({
          employeeId:  id,
          name:        name.trim() || undefined,
          designation: designation || undefined,
        });

        Tts.speak(`Face profile enrolled successfully for ${id}.`);
        setPhase('form');

        Alert.alert(
          '✓ Enrolled Successfully',
          `Face profile for "${id}" has been saved locally.\n\nThis employee can now authenticate using biometric verification.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        Tts.speak('Capture failed. Please try again.');
        Alert.alert(
          'Enrollment Failed',
          result.message || 'No face was detected in the photo. Ensure your face is well-lit and clearly visible.',
        );
      }
    } catch (err: any) {
      console.error('[Register] capture error:', err);
      Alert.alert(
        'Error',
        err?.message ?? 'An unexpected error occurred during enrollment.',
      );
    } finally {
      setProcessing(false);
    }
  };

  // ── Render: Form phase ─────────────────────────────────────────────────────
  if (phase === 'form') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />

        {/* Header */}
        <View style={styles.screenHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Enrol Face Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.ScrollView
          style={[{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Badge */}
          <View style={styles.iconBadge}>
            <Text style={styles.bigIcon}>➕</Text>
          </View>
          <Text style={styles.formTitle}>New Face Profile</Text>
          <Text style={styles.formDesc}>
            Fill in the employee details and capture a clear photo of their face to enrol them in
            the offline biometric system.
          </Text>

          {/* Employee ID */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMPLOYEE ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. EMP-1001"
              placeholderTextColor={Colors.text.muted}
              value={employeeId}
              onChangeText={t => setEmployeeId(t.toUpperCase().replace(/[^A-Z0-9\-]/g, ''))}
              autoCapitalize="characters"
              maxLength={16}
            />
          </View>

          {/* Name (optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rajesh Kumar"
              placeholderTextColor={Colors.text.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Designation (optional dropdown) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DESIGNATION (OPTIONAL)</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowDesgMenu(v => !v)}>
              <Text style={designation ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                {designation || 'Select Designation'}
              </Text>
              <Text style={styles.dropdownArrow}>{showDesgMenu ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showDesgMenu && (
              <View style={styles.dropdownMenu}>
                {DESIGNATIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dropdownItem, designation === d && styles.dropdownItemActive]}
                    onPress={() => { setDesignation(d); setShowDesgMenu(false); }}>
                    <Text style={[styles.dropdownItemText, designation === d && styles.dropdownItemTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Instructions card */}
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>📸 Capture Tips</Text>
            <Text style={styles.instructionItem}>• Ensure face is well-lit (avoid backlight)</Text>
            <Text style={styles.instructionItem}>• Look directly at the camera</Text>
            <Text style={styles.instructionItem}>• Remove sunglasses or face coverings</Text>
            <Text style={styles.instructionItem}>• Hold device steady at face level</Text>
          </View>

          {/* Proceed button */}
          <TouchableOpacity
            style={[styles.proceedBtn, Shadow.brand]}
            onPress={handleProceed}
            accessibilityRole="button">
            <Text style={styles.proceedBtnText}>📸  Open Camera</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Camera phase ───────────────────────────────────────────────────
  return (
    <View style={styles.cameraContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />

      {!device || !hasCamPerm ? (
        <View style={styles.camError}>
          <Text style={styles.camErrorText}>Camera unavailable or permission denied.</Text>
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
            onError={err => {
              console.error('[Camera] Error:', err);
              Alert.alert('Camera Error', err.message ?? 'Camera failed to start.');
              cancelCamera();
            }}
          />

          {/* Camera flip button — always visible during enrollment */}
          <TouchableOpacity
            style={styles.camFlipBtn}
            onPress={toggleCamera}
            accessibilityRole="button"
            accessibilityLabel="Switch camera">
            <Text style={styles.camFlipIcon}>⇄</Text>
          </TouchableOpacity>

          {/* Overlay */}
          <FaceGuideOverlay
            scanStep={processing ? 'matching' : captureReady ? 'align' : 'align'}
            promptMessage={
              processing
                ? 'Processing face embedding…'
                : captureReady
                ? 'Position face and tap Capture'
                : 'Preparing camera…'
            }
          />

          {/* Top header */}
          <SafeAreaView style={styles.camHeader} edges={['top']}>
            <View style={styles.camHeaderRow}>
              <TouchableOpacity style={styles.closeBtn} onPress={cancelCamera}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.camTitleBox}>
                <Text style={styles.camTitle}>Enrol: {employeeId.toUpperCase()}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>

          {/* Capture button */}
          <View style={styles.bottomActions}>
            {processing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="large" color={Colors.brand.indigo} />
                <Text style={styles.processingText}>Generating face embedding…</Text>
              </View>
            ) : captureReady ? (
              <TouchableOpacity
                style={[styles.captureBtn, Shadow.brand]}
                onPress={handleCapture}
                accessibilityRole="button"
                accessibilityLabel="Capture face">
                <Text style={styles.captureBtnText}>📸  Capture Embedding</Text>
              </TouchableOpacity>
            ) : (
              <ActivityIndicator size="small" color={Colors.text.muted} />
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg.primary },
  screenHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                      borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: Colors.bg.tertiary, borderRadius: Radius.md },
  backIcon:         { color: Colors.text.primary, fontSize: Typography.lg, fontWeight: Typography.bold },
  screenTitle:      { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.bold },
  formContent:      { padding: Spacing.xl, alignItems: 'center' },
  iconBadge:        { width: 80, height: 80, borderRadius: 22, backgroundColor: Colors.bg.tertiary,
                      borderWidth: 2, borderColor: Colors.brand.emerald + '66',
                      alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
                      ...Shadow.emerald },
  bigIcon:          { fontSize: 36 },
  formTitle:        { fontSize: Typography.xl, fontWeight: Typography.extrabold, color: Colors.text.primary,
                      marginBottom: Spacing.sm, textAlign: 'center' },
  formDesc:         { fontSize: Typography.sm, color: Colors.text.muted, textAlign: 'center',
                      lineHeight: 20, marginBottom: Spacing['2xl'] },
  fieldGroup:       { width: '100%', marginBottom: Spacing.lg },
  fieldLabel:       { fontSize: Typography.xs, color: Colors.brand.indigo, fontWeight: Typography.bold,
                      letterSpacing: Typography.wider, marginBottom: Spacing.xs },
  input:            { backgroundColor: Colors.bg.tertiary, color: Colors.text.primary,
                      borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                      fontSize: Typography.base, borderWidth: 1, borderColor: Colors.border.default },
  dropdownBtn:      { backgroundColor: Colors.bg.tertiary, borderRadius: Radius.lg,
                      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                      borderWidth: 1, borderColor: Colors.border.default,
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownSelected: { color: Colors.text.primary, fontSize: Typography.base },
  dropdownPlaceholder: { color: Colors.text.muted, fontSize: Typography.base },
  dropdownArrow:    { color: Colors.text.muted, fontSize: Typography.sm },
  dropdownMenu:     { backgroundColor: Colors.bg.elevated, borderRadius: Radius.md, marginTop: 4,
                      borderWidth: 1, borderColor: Colors.border.default, overflow: 'hidden' },
  dropdownItem:     { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  dropdownItemActive: { backgroundColor: Colors.brand.indigo + '33' },
  dropdownItemText: { color: Colors.text.secondary, fontSize: Typography.base },
  dropdownItemTextActive: { color: Colors.brand.indigo, fontWeight: Typography.bold },
  instructionCard:  { width: '100%', backgroundColor: Colors.bg.tertiary, borderRadius: Radius.lg,
                      padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.default,
                      marginBottom: Spacing['2xl'] },
  instructionTitle: { color: Colors.text.secondary, fontSize: Typography.sm, fontWeight: Typography.bold,
                      marginBottom: Spacing.sm },
  instructionItem:  { color: Colors.text.muted, fontSize: Typography.xs, lineHeight: 20 },
  proceedBtn:       { width: '100%', backgroundColor: Colors.brand.indigo, borderRadius: Radius.full,
                      paddingVertical: Spacing.lg, alignItems: 'center' },
  proceedBtnText:   { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.extrabold },
  // Camera
  cameraContainer:  { flex: 1, backgroundColor: Colors.bg.primary },
  camFlipBtn:       { position: 'absolute', top: 16, right: 16, width: 50, height: 50,
                      borderRadius: 25, backgroundColor: 'rgba(8,14,26,0.65)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                      alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  camFlipIcon:      { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  camError:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'] },
  camErrorText:     { color: Colors.text.secondary, textAlign: 'center', fontSize: Typography.base, marginBottom: Spacing.xl },
  cancelBtn:        { paddingVertical: Spacing.md },
  cancelBtnText:    { color: Colors.text.muted, fontSize: Typography.sm },
  camHeader:        { position: 'absolute', top: 0, left: 0, right: 0 },
  camHeaderRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  closeBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(8,14,26,0.8)',
                      borderWidth: 1, borderColor: Colors.border.default,
                      alignItems: 'center', justifyContent: 'center' },
  closeBtnText:     { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.bold },
  camTitleBox:      { backgroundColor: 'rgba(8,14,26,0.8)', borderRadius: Radius.full,
                      paddingHorizontal: Spacing.lg, paddingVertical: 6,
                      borderWidth: 1, borderColor: Colors.border.default },
  camTitle:         { color: Colors.brand.emerald, fontSize: Typography.sm, fontWeight: Typography.bold },
  bottomActions:    { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  captureBtn:       { backgroundColor: Colors.brand.indigo, borderRadius: Radius.full,
                      paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg },
  captureBtnText:   { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.extrabold },
  processingRow:    { alignItems: 'center', gap: Spacing.sm },
  processingText:   { color: Colors.text.secondary, fontSize: Typography.sm },
});

export default RegisterScreen;
