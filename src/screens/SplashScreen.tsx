// ─── Splash Screen ────────────────────────────────────────────────────────────
// Animated splash with NHAI branding, initialises DB, then navigates to Dashboard

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing } from '../theme';
import DatabaseService from '../services/database';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import NHAILogo from '../components/NHAILogo';

const { width: W } = Dimensions.get('window');

type Props = StackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  // Animation refs
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide  = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth   = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Step 1: Initialise database
    const initDB = async () => {
      try {
        await DatabaseService.init();
      } catch (err) {
        console.warn('[Splash] DB init failed, continuing:', err);
      }
    };

    initDB();

    // Step 2: Run entrance animations
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Title slides up
      Animated.parallel([
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      // Divider line expands
      Animated.timing(lineWidth, {
        toValue: W * 0.5,
        duration: 400,
        useNativeDriver: false,
      }),
      // Subtitle + tagline fade in
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Small delay before dots appear
      Animated.delay(300),
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after animation completes
    const timer = setTimeout(() => {
      navigation.replace('Dashboard');
    }, 3200);

    return () => clearTimeout(timer);
  }, [navigation, logoScale, logoOpacity, titleSlide, titleOpacity,
      subtitleOpacity, lineWidth, taglineOpacity, dotsOpacity]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />

      {/* Background glow */}
      <View style={styles.glowCircle} />

      {/* Logo / Badge */}
      <Animated.View
        style={[
          styles.logoBadge,
          { transform: [{ scale: logoScale }], opacity: logoOpacity },
        ]}>
        <NHAILogo size={80} compact={true} />
      </Animated.View>

      {/* App title */}
      <Animated.Text
        style={[
          styles.title,
          {
            transform: [{ translateY: titleSlide }],
            opacity: titleOpacity,
          },
        ]}>
        DATALAKE
        <Text style={styles.titleAccent}> EDGE</Text>
      </Animated.Text>

      {/* Divider */}
      <Animated.View style={[styles.divider, { width: lineWidth }]} />

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        SECURE • OFFLINE • VERIFIED
      </Animated.Text>

      {/* NHAI Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        National Highways Authority of India
      </Animated.Text>

      {/* Loading dots */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[
              styles.dot,
              i === 1 && styles.dotCenter,
            ]}
          />
        ))}
      </Animated.View>

      {/* Version */}
      <Text style={styles.version}>v1.0.0 — Hackathon 7.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.brand.indigo,
    opacity: 0.06,
    top: '20%',
  },
  logoBadge: {
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia',
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: Colors.text.primary,
    letterSpacing: Typography.wider,
    textAlign: 'center',
  },
  titleAccent: {
    color: '#C9921A', // Gold/amber accent
  },
  divider: {
    height: 2,
    backgroundColor: '#C9921A', // Gold/amber divider
    borderRadius: 1,
    marginVertical: Spacing.lg,
    opacity: 0.7,
  },
  subtitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: '#C9921A', // Gold/amber
    letterSpacing: Typography.wider,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: Typography.sm,
    color: Colors.text.secondary,
    letterSpacing: Typography.wide,
    textAlign: 'center',
    marginBottom: Spacing['4xl'],
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing['3xl'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border.default,
  },
  dotCenter: {
    backgroundColor: Colors.brand.indigo,
    width: 24,
    borderRadius: 4,
  },
  version: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    fontSize: Typography.xs,
    color: Colors.text.muted,
    letterSpacing: Typography.wide,
  },
});

export default SplashScreen;
