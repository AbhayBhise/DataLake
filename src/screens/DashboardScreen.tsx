// ─── Dashboard Screen ─────────────────────────────────────────────────────────
// Main hub: metrics, recent logs, quick actions, network toggle, sync

// ── Sync endpoint — swap this one line when AWS Lambda URL is ready ────────────
const SYNC_ENDPOINT = 'https://httpbin.org/post'; // TODO: replace with real AWS API Gateway URL

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Switch,
  Animated,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import MetricCard from '../components/MetricCard';
import LogItem from '../components/LogItem';
import DatabaseService, { AttendanceLog } from '../services/database';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Dashboard'>;

const NHAI_SITES = [
  'NH-44 Toll Plaza, Delhi', 'NH-48 Entry Gate, Gurugram',
  'NH-8 Field Station, Jaipur', 'NH-19 Booth #14, Agra',
  'NH-27 Checkpoint, Lucknow', 'NH-52 Gate #3, Chandigarh',
];

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [logs,           setLogs]          = useState<AttendanceLog[]>([]);
  const [stats,          setStats]         = useState({ total: 0, success: 0, failed: 0 });
  const [employeeCount,  setEmployeeCount] = useState(0);
  const [isOffline,      setIsOffline]     = useState(true);
  const [syncing,        setSyncing]       = useState(false);
  const [refreshing,     setRefreshing]    = useState(false);

  const syncProgress = useRef(new Animated.Value(0)).current;
  const headerAnim   = useRef(new Animated.Value(-30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [recentLogs, logStats, empCount] = await Promise.all([
        DatabaseService.getLogs(10),
        DatabaseService.getLogStats(),
        DatabaseService.getEmployeeCount(),
      ]);
      setLogs(recentLogs);
      setStats(logStats);
      setEmployeeCount(empCount);
    } catch (err) {
      console.error('[Dashboard] loadData error:', err);
    }
  }, []);

  // Reload every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, headerOpacity]);

  // ── Pull to refresh ───────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Sync & Purge ──────────────────────────────────────────────────────────
  const handleSync = () => {
    if (isOffline) {
      Alert.alert(
        'Offline Mode Active',
        'Switch to Online mode using the toggle above, then sync your logs.',
        [{ text: 'OK', style: 'default' }],
      );
      return;
    }
    if (stats.total === 0) {
      Alert.alert('Nothing to Sync', 'There are no local logs to synchronise.');
      return;
    }
    Alert.alert(
      'Sync & Purge Logs',
      `This will upload ${stats.total} log(s) to AWS and permanently delete them locally. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync Now',
          style: 'destructive',
          onPress: async () => {
            setSyncing(true);
            syncProgress.setValue(0);

            // Animate progress bar while upload is in-flight
            Animated.timing(syncProgress, {
              toValue: 0.85,
              duration: 1800,
              useNativeDriver: false,
            }).start();

            try {
              // Fetch ALL logs from SQLite and map to the AWS payload schema
              const allLogs = await DatabaseService.getLogs(1000);
              const deviceId = `NHAI-DEVICE-${Math.abs(
                allLogs[0]?.id ?? Date.now(),
              ).toString(16).toUpperCase()}`;

              const records = allLogs.map(log => ({
                userId:        log.employee_id,
                employeeName:  log.employee_id,   // name stored in employees table; id is the key
                timestamp:     new Date(log.timestamp).toISOString(),
                location:      log.location || 'NHAI Site',
                checkInType:   'face_recognition' as const,
                deviceId,
              }));

              console.log(
                `[Sync] Uploading ${records.length} record(s) to ${SYNC_ENDPOINT}`,
              );

              const response = await fetch(SYNC_ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ records }),
              });

              console.log(`[Sync] HTTP response status: ${response.status}`);

              if (response.ok) {
                // ✅ Upload confirmed — now safe to purge local records
                Animated.timing(syncProgress, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: false,
                }).start();
                await DatabaseService.deleteAllLogs();
                await loadData();
                console.log(`[Sync] SUCCESS — ${records.length} record(s) purged from local DB`);
                Alert.alert(
                  '✓ Sync Successful',
                  `${records.length} record(s) uploaded to AWS and purged from local storage.`,
                );
              } else {
                // ❌ Server error — do NOT purge; data stays safe locally
                console.warn(`[Sync] FAILED — server returned ${response.status}`);
                Alert.alert(
                  'Sync Failed',
                  `Server returned ${response.status}. Records kept locally — will retry when connected.`,
                );
              }
            } catch (err) {
              // ❌ Network error — do NOT purge
              console.error('[Sync] Network error:', err);
              Alert.alert(
                'Sync Failed',
                'No response from server. Records kept locally — will retry when connected.',
              );
            } finally {
              setSyncing(false);
              syncProgress.setValue(0);
            }
          },
        },
      ],
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const ListHeader = (
    <>
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { transform: [{ translateY: headerAnim }], opacity: headerOpacity },
        ]}>
        <View>
          <Text style={styles.headerTitle}>DATALAKE EDGE</Text>
          <Text style={styles.headerSub}>Hackathon 7.0 • NHAI</Text>
        </View>
        <View style={styles.networkBadge}>
          <View
            style={[
              styles.networkDot,
              { backgroundColor: isOffline ? Colors.status.offline : Colors.status.online },
            ]}
          />
          <Text style={styles.networkText}>{isOffline ? 'OFFLINE' : 'ONLINE'}</Text>
        </View>
      </Animated.View>

      {/* ── Network toggle card ────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.cardTitle}>Zero-Network Mode</Text>
            <Text style={styles.cardSub}>Fully local — no internet required</Text>
          </View>
          <Switch
            trackColor={{ false: Colors.bg.elevated, true: Colors.brand.emerald + '88' }}
            thumbColor={isOffline ? Colors.brand.emerald : Colors.text.muted}
            onValueChange={v => setIsOffline(v)}
            value={isOffline}
          />
        </View>
        {/* Sync progress bar */}
        {syncing && (
          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: syncProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* ── Metrics row ────────────────────────────────────────────────── */}
      <View style={styles.metricsRow}>
        <MetricCard value={employeeCount} label="Enrolled"    icon="👤" accentColor={Colors.brand.indigo}  delay={0}   />
        <View style={{ width: Spacing.sm }} />
        <MetricCard value={stats.success} label="Verified"    icon="✅" accentColor={Colors.brand.emerald} delay={80}  />
        <View style={{ width: Spacing.sm }} />
        <MetricCard value={stats.failed}  label="Rejected"    icon="🚫" accentColor={Colors.brand.red}     delay={160} />
      </View>

      {/* ── Action buttons ────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary, Shadow.brand]}
          onPress={() => navigation.navigate('Auth')}
          accessibilityRole="button"
          accessibilityLabel="Verify Face Check-In">
          <Text style={styles.actionIcon}>🔒</Text>
          <Text style={styles.actionLabel}>Verify Check-In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary, Shadow.sm]}
          onPress={() => navigation.navigate('Register')}
          accessibilityRole="button"
          accessibilityLabel="Enroll new face">
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionLabel}>Enroll Face</Text>
        </TouchableOpacity>
      </View>

      {/* ── Extra actions ─────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnTertiary, Shadow.sm]}
          onPress={() => navigation.navigate('Logs')}
          accessibilityRole="button">
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionLabel}>View All Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            syncing ? styles.actionBtnDisabled : styles.actionBtnSync,
            Shadow.sm,
          ]}
          onPress={handleSync}
          disabled={syncing}
          accessibilityRole="button"
          accessibilityLabel="Sync logs to AWS">
          {syncing
            ? <ActivityIndicator size="small" color={Colors.brand.emerald} />
            : <Text style={styles.actionIcon}>☁</Text>
          }
          <Text style={[styles.actionLabel, syncing && { color: Colors.text.muted }]}>
            {syncing ? 'Syncing...' : 'Sync & Purge'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Logs section header ────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Logs ({stats.total})</Text>
        {stats.total > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Logs')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />
      <FlatList
        data={logs}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <LogItem item={item} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.indigo}
            colors={[Colors.brand.indigo]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No logs yet</Text>
            <Text style={styles.emptySubtitle}>
              Verify a check-in or enroll a face profile to get started.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg.primary },
  listContent:  { paddingBottom: Spacing['3xl'] },
  // Header
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
                  borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  headerTitle:  { color: Colors.text.primary, fontSize: Typography.lg, fontWeight: Typography.extrabold,
                  letterSpacing: Typography.wider },
  headerSub:    { color: Colors.text.muted, fontSize: Typography.xs, marginTop: 2 },
  networkBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg.tertiary,
                  paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full,
                  gap: 6, borderWidth: 1, borderColor: Colors.border.default },
  networkDot:   { width: 8, height: 8, borderRadius: 4 },
  networkText:  { color: Colors.text.secondary, fontSize: Typography.xs, fontWeight: Typography.bold, letterSpacing: Typography.wide },
  // Card
  card:         { backgroundColor: Colors.bg.tertiary, marginHorizontal: Spacing.lg,
                  marginTop: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.lg,
                  borderWidth: 1, borderColor: Colors.border.default },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:    { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.bold },
  cardSub:      { color: Colors.text.muted, fontSize: Typography.xs, marginTop: 2 },
  // Progress
  progressContainer: { height: 4, backgroundColor: Colors.bg.elevated, borderRadius: 2,
                       marginTop: Spacing.md, overflow: 'hidden' },
  progressBar:  { height: '100%', backgroundColor: Colors.brand.emerald, borderRadius: 2 },
  // Metrics
  metricsRow:   { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.lg },
  // Actions
  actionsRow:   { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.sm, gap: Spacing.sm },
  actionBtn:    { flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing.lg,
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                  borderWidth: 1, minHeight: 80 },
  actionBtnPrimary:   { backgroundColor: Colors.brand.indigoDark, borderColor: Colors.brand.indigo },
  actionBtnSecondary: { backgroundColor: Colors.bg.elevated,      borderColor: Colors.border.strong },
  actionBtnTertiary:  { backgroundColor: Colors.bg.tertiary,      borderColor: Colors.border.default },
  actionBtnSync:      { backgroundColor: Colors.bg.tertiary,      borderColor: Colors.brand.emerald + '66' },
  actionBtnDisabled:  { backgroundColor: Colors.bg.tertiary,      borderColor: Colors.border.subtle, opacity: 0.5 },
  actionIcon:   { fontSize: 22 },
  actionLabel:  { color: Colors.text.primary, fontSize: Typography.sm, fontWeight: Typography.semibold, textAlign: 'center' },
  // Section
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  marginHorizontal: Spacing.lg, marginTop: Spacing['2xl'], marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.bold },
  seeAll:       { color: Colors.brand.indigo, fontSize: Typography.sm, fontWeight: Typography.semibold },
  // Empty
  emptyState:   { alignItems: 'center', paddingVertical: Spacing['4xl'], paddingHorizontal: Spacing['3xl'] },
  emptyIcon:    { fontSize: 48, marginBottom: Spacing.lg },
  emptyTitle:   { color: Colors.text.primary, fontSize: Typography.lg, fontWeight: Typography.bold, marginBottom: Spacing.sm },
  emptySubtitle:{ color: Colors.text.muted, fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
});

export default DashboardScreen;
