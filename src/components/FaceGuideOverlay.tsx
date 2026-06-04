// ─── FaceGuideOverlay Component ───────────────────────────────────────────────
// The camera overlay: oval guide ring, challenge prompt, progress steps

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width: W } = Dimensions.get('window');
const RING_SIZE = W * 0.65;

export type ScanStep = 'align' | 'challenge' | 'matching' | 'done' | 'failed';

interface FaceGuideOverlayProps {
  scanStep: ScanStep;
  promptMessage: string;
  sequenceTotal?: number;
  sequenceCurrent?: number;
}

const STEP_COLORS: Record<ScanStep, string> = {
  align:     Colors.border.default,
  challenge: Colors.brand.indigo,
  matching:  Colors.brand.amber,
  done:      Colors.brand.emerald,
  failed:    Colors.brand.red,
};

const FaceGuideOverlay: React.FC<FaceGuideOverlayProps> = ({
  scanStep,
  promptMessage,
  sequenceTotal = 3,
  sequenceCurrent = 0,
}) => {
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseRef   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    pulseRef.current?.stop();

    if (scanStep === 'challenge') {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.00, duration: 800, useNativeDriver: true }),
        ]),
      );
      pulseRef.current.start();
    } else if (scanStep === 'matching') {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseRef.current.start();
    } else {
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }

    return () => { pulseRef.current?.stop(); };
  }, [scanStep, pulseAnim, opacityAnim]);

  const ringColor = STEP_COLORS[scanStep];

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top prompt box */}
      <View style={styles.promptContainer}>
        <View style={[styles.promptBox, scanStep === 'done' && styles.promptBoxSuccess, scanStep === 'failed' && styles.promptBoxFailed]}>
          <Text style={styles.promptText}>{promptMessage}</Text>
          {/* Step dots */}
          {scanStep === 'challenge' && sequenceTotal > 0 && (
            <View style={styles.dotsRow}>
              {Array.from({ length: sequenceTotal }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < sequenceCurrent
                      ? styles.dotDone
                      : i === sequenceCurrent
                      ? styles.dotActive
                      : styles.dotPending,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Face guide ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />

      {/* Scanning lines effect when matching */}
      {scanStep === 'matching' && (
        <View style={styles.scanLineContainer}>
          <View style={styles.scanLine} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptContainer: {
    position: 'absolute',
    top: 40,
    left: Spacing['2xl'],
    right: Spacing['2xl'],
    alignItems: 'center',
  },
  promptBox: {
    backgroundColor: 'rgba(8,14,26,0.88)',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    width: '100%',
  },
  promptBoxSuccess: {
    borderColor: Colors.brand.emerald,
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  promptBoxFailed: {
    borderColor: Colors.brand.red,
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  promptText: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotDone: {
    backgroundColor: Colors.brand.emerald,
  },
  dotActive: {
    backgroundColor: Colors.brand.indigo,
    transform: [{ scale: 1.3 }],
  },
  dotPending: {
    backgroundColor: Colors.border.default,
  },
  ring: {
    borderWidth: 3,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  scanLineContainer: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.brand.amber + '99',
  },
});

export default FaceGuideOverlay;
