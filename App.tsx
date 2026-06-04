// ─── App Entry Point ──────────────────────────────────────────────────────────
// Slim bootstrap: wraps the navigation stack in ErrorBoundary + GestureHandler

import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, LogBox } from 'react-native';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator  from './src/navigation/AppNavigator';

// Ignore specific warnings from third-party libraries (e.g. Navigation)
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <AppNavigator />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;
