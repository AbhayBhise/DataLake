// ─── LogItem Component ────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import type { AttendanceLog } from '../services/database';

interface LogItemProps {
  item: AttendanceLog;
}

const STATUS_CONFIG = {
  SUCCESS:           { color: Colors.brand.emerald,   bg: Colors.brand.emerald + '22',   label: '✓ SUCCESS',  icon: '🟢' },
  FAILED:            { color: Colors.brand.red,        bg: Colors.brand.red + '22',        label: '✗ FAILED',   icon: '🔴' },
  SPOOFING_REJECTED: { color: Colors.brand.amber,      bg: Colors.brand.amber + '22',      label: '⚠ SPOOFED',  icon: '🟠' },
} as const;

const LogItem: React.FC<LogItemProps> = ({ item }) => {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.FAILED;

  return (
    <View style={styles.container}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

      <View style={styles.content}>
        {/* Top row */}
        <View style={styles.topRow}>
          <Text style={styles.employeeId}>{item.employee_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + '66' }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Time + challenge */}
        <Text style={styles.timestamp}>🕐 {item.timestamp}</Text>
        <Text style={styles.detail}>{item.challenge_type || 'Liveness Sequence'}</Text>

        {/* Location */}
        {item.location ? (
          <Text style={styles.location} numberOfLines={1}>📍 {item.location}</Text>
        ) : null}

        {/* Performance metrics (if available) */}
        {item.inference_ms > 0 ? (
          <View style={styles.metricsRow}>
            <View style={styles.metricBadge}>
              <Text style={styles.metricText}>⚡ {item.inference_ms.toFixed(0)}ms</Text>
            </View>
            {item.confidence > 0 ? (
              <View style={styles.metricBadge}>
                <Text style={styles.metricText}>
                  🎯 {(item.confidence * 100).toFixed(1)}%
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.lg,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  employeeId: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text.primary,
    letterSpacing: Typography.tight,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    letterSpacing: Typography.wide,
  },
  timestamp: {
    fontSize: Typography.xs,
    color: Colors.text.muted,
  },
  detail: {
    fontSize: Typography.xs,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  location: {
    fontSize: Typography.xs,
    color: Colors.text.muted,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  metricBadge: {
    backgroundColor: Colors.bg.elevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  metricText: {
    fontSize: Typography.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.medium,
  },
});

export default LogItem;
