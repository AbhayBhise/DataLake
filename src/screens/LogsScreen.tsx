// ─── Logs Screen ─────────────────────────────────────────────────────────────
// Full log viewer with filter, search, stats summary, and export info

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import LogItem from '../components/LogItem';
import DatabaseService, { AttendanceLog } from '../services/database';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props   = StackScreenProps<RootStackParamList, 'Logs'>;
type Filter  = 'ALL' | 'SUCCESS' | 'FAILED' | 'SPOOFING_REJECTED';

const FILTERS: { label: string; value: Filter; icon: string }[] = [
  { label: 'All',      value: 'ALL',              icon: '📋' },
  { label: 'Verified', value: 'SUCCESS',           icon: '✅' },
  { label: 'Failed',   value: 'FAILED',            icon: '❌' },
  { label: 'Spoofed',  value: 'SPOOFING_REJECTED', icon: '⚠️' },
];

const LogsScreen: React.FC<Props> = ({ navigation }) => {
  const [allLogs,    setAllLogs]    = useState<AttendanceLog[]>([]);
  const [filtered,   setFiltered]   = useState<AttendanceLog[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
  const [searchQuery, setSearchQuery]   = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stats,      setStats]      = useState({ total: 0, success: 0, failed: 0 });

  // Average inference time from logs that have it
  const avgInferenceMs = allLogs.length
    ? (allLogs.filter(l => l.inference_ms > 0).reduce((s, l) => s + l.inference_ms, 0) /
       (allLogs.filter(l => l.inference_ms > 0).length || 1))
    : 0;

  const loadLogs = useCallback(async () => {
    try {
      const [logs, logStats] = await Promise.all([
        DatabaseService.getLogs(100),
        DatabaseService.getLogStats(),
      ]);
      setAllLogs(logs);
      setStats(logStats);
    } catch (err) {
      console.error('[Logs] loadLogs error:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { loadLogs(); }, [loadLogs]),
  );

  // Apply filter + search
  useEffect(() => {
    let result = allLogs;
    if (activeFilter !== 'ALL') {
      result = result.filter(l => l.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      result = result.filter(l =>
        l.employee_id.toUpperCase().includes(q) ||
        l.timestamp.toUpperCase().includes(q) ||
        (l.location ?? '').toUpperCase().includes(q),
      );
    }
    setFiltered(result);
  }, [allLogs, activeFilter, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Logs',
      'This will permanently delete all local attendance logs. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteAllLogs();
              await loadLogs();
            } catch (err) {
              Alert.alert('Error', 'Failed to clear logs.');
            }
          },
        },
      ],
    );
  };

  const successRate = stats.total > 0
    ? ((stats.success / stats.total) * 100).toFixed(1)
    : '—';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Ledger</Text>
        {allLogs.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 50 }} />}
      </View>

      {/* Stats summary bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.brand.emerald }]}>{stats.success}</Text>
          <Text style={styles.statLabel}>Success</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.brand.red }]}>{stats.failed}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.brand.indigo }]}>{successRate}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
        {avgInferenceMs > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.brand.amber }]}>
                {avgInferenceMs.toFixed(0)}ms
              </Text>
              <Text style={styles.statLabel}>Avg Speed</Text>
            </View>
          </>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Employee ID, date, location…"
          placeholderTextColor={Colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, activeFilter === f.value && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.value)}>
            <Text style={styles.filterIcon}>{f.icon}</Text>
            <Text
              style={[
                styles.filterLabel,
                activeFilter === f.value && styles.filterLabelActive,
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Log list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <LogItem item={item} />}
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
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              {searchQuery || activeFilter !== 'ALL' ? '🔍' : '📭'}
            </Text>
            <Text style={styles.emptyTitle}>
              {searchQuery || activeFilter !== 'ALL' ? 'No matching logs' : 'No logs yet'}
            </Text>
            <Text style={styles.emptyDesc}>
              {searchQuery || activeFilter !== 'ALL'
                ? 'Try a different filter or search term.'
                : 'Authenticate a check-in to start recording logs here.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg.primary },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                    borderBottomWidth: 1, borderBottomColor: Colors.border.subtle },
  backBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: Colors.bg.tertiary, borderRadius: Radius.md },
  backIcon:       { color: Colors.text.primary, fontSize: Typography.lg, fontWeight: Typography.bold },
  headerTitle:    { color: Colors.text.primary, fontSize: Typography.base, fontWeight: Typography.bold },
  clearBtn:       { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  clearBtnText:   { color: Colors.brand.red, fontSize: Typography.sm, fontWeight: Typography.semibold },
  // Stats
  statsBar:       { flexDirection: 'row', backgroundColor: Colors.bg.tertiary, margin: Spacing.lg,
                    borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border.default },
  statItem:       { flex: 1, alignItems: 'center' },
  statValue:      { fontSize: Typography.lg, fontWeight: Typography.extrabold, color: Colors.text.primary },
  statLabel:      { fontSize: Typography.xs, color: Colors.text.muted, marginTop: 2, letterSpacing: Typography.wide },
  statDivider:    { width: 1, backgroundColor: Colors.border.subtle, marginVertical: 4 },
  // Search
  searchRow:      { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  searchInput:    { backgroundColor: Colors.bg.tertiary, color: Colors.text.primary,
                    borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                    fontSize: Typography.sm, borderWidth: 1, borderColor: Colors.border.default },
  // Filters
  filterRow:      { flexDirection: 'row', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm },
  filterChip:     { flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: Spacing.sm, paddingVertical: 6,
                    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border.default,
                    backgroundColor: Colors.bg.tertiary },
  filterChipActive: { borderColor: Colors.brand.indigo, backgroundColor: Colors.brand.indigo + '22' },
  filterIcon:     { fontSize: 12 },
  filterLabel:    { fontSize: Typography.xs, color: Colors.text.muted, fontWeight: Typography.medium },
  filterLabelActive: { color: Colors.brand.indigo, fontWeight: Typography.bold },
  // List
  listContent:    { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  // Empty
  empty:          { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  emptyIcon:      { fontSize: 40, marginBottom: Spacing.lg },
  emptyTitle:     { color: Colors.text.primary, fontSize: Typography.lg, fontWeight: Typography.bold, marginBottom: Spacing.sm },
  emptyDesc:      { color: Colors.text.muted, fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
});

export default LogsScreen;
