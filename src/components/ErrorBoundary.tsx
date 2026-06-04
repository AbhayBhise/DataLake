// ─── Error Boundary ──────────────────────────────────────────────────────────
// Catches unhandled React render errors and shows a graceful fallback UI

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    this.setState({ errorInfo: info.componentStack ?? '' });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo } = this.state;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>⚠</Text>
        </View>

        <Text style={styles.title}>Something Went Wrong</Text>
        <Text style={styles.subtitle}>
          The application encountered an unexpected error. Your data is safe and
          your offline logs have not been affected.
        </Text>

        {/* Error Detail */}
        <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailContent}>
          <Text style={styles.detailLabel}>Error:</Text>
          <Text style={styles.detailText}>{error?.message ?? 'Unknown error'}</Text>
          {__DEV__ && errorInfo ? (
            <>
              <Text style={[styles.detailLabel, { marginTop: 12 }]}>Stack:</Text>
              <Text style={[styles.detailText, { fontSize: Typography.xs }]}>{errorInfo}</Text>
            </>
          ) : null}
        </ScrollView>

        {/* Actions */}
        <TouchableOpacity style={styles.resetBtn} onPress={this.handleReset} accessibilityRole="button">
          <Text style={styles.resetBtnText}>↺  Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.brand.amber,
    marginBottom: Spacing.xl,
  },
  iconText: {
    fontSize: 36,
    color: Colors.brand.amber,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['2xl'],
  },
  detailBox: {
    maxHeight: 180,
    width: '100%',
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing['2xl'],
  },
  detailContent: {
    padding: Spacing.md,
  },
  detailLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.brand.amber,
    marginBottom: 4,
    letterSpacing: Typography.wide,
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: Typography.sm,
    color: Colors.text.muted,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  resetBtn: {
    backgroundColor: Colors.brand.indigo,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.lg,
    borderRadius: Radius.full,
    minWidth: 180,
    alignItems: 'center',
  },
  resetBtnText: {
    color: Colors.text.primary,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    letterSpacing: Typography.normal,
  },
});

export default ErrorBoundary;
