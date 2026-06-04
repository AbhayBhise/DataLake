// ─── MetricCard Component ─────────────────────────────────────────────────────
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

interface MetricCardProps {
  value: number | string;
  label: string;
  icon: string;
  accentColor?: string;
  shadowColor?: string;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  icon,
  accentColor = Colors.brand.indigo,
  shadowColor = Colors.brand.indigo,
  delay = 0,
}) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, slideAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: accentColor + '33' },
        Shadow.sm,
        { shadowColor },
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}>
      <View style={[styles.iconContainer, { backgroundColor: accentColor + '22' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 22,
  },
  value: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.extrabold,
    marginBottom: 2,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    letterSpacing: Typography.wide,
    textTransform: 'uppercase',
    fontWeight: Typography.medium,
  },
});

export default MetricCard;
