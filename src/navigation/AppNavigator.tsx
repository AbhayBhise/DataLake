// ─── Navigation Stack ─────────────────────────────────────────────────────────
// React Navigation v7 with @react-navigation/stack (JS-based)
// Typed routes, dark theme, gesture navigation, per-screen animations

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import {
  createStackNavigator,
  CardStyleInterpolators,
  StackScreenProps,
  TransitionPresets,
} from '@react-navigation/stack';
import { Colors } from '../theme';

// ── Screens ───────────────────────────────────────────────────────────────────
import SplashScreen    from '../screens/SplashScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AuthScreen      from '../screens/AuthScreen';
import RegisterScreen  from '../screens/RegisterScreen';
import LogsScreen      from '../screens/LogsScreen';

// ── Route param types ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Splash:    undefined;
  Dashboard: undefined;
  Auth:      undefined;
  Register:  undefined;
  Logs:      undefined;
};

// Re-export the props type for screens
export type { StackScreenProps };

const Stack = createStackNavigator<RootStackParamList>();

// Custom dark navigation theme
const DarkNavTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary:      Colors.brand.indigo,
    background:   Colors.bg.primary,
    card:         Colors.bg.secondary,
    text:         Colors.text.primary,
    border:       Colors.border.subtle,
    notification: Colors.brand.red,
  },
};

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer theme={DarkNavTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown:    false,    // All screens manage their own headers
          gestureEnabled: true,
          cardStyle:      { backgroundColor: Colors.bg.primary },
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}>

        {/* Splash — fade in, no swipe back */}
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{
            gestureEnabled: false,
            cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
          }}
        />

        {/* Dashboard — fade from centre (replaces splash) */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            gestureEnabled: false,
            cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
          }}
        />

        {/* Auth — slide up from bottom (modal feel) */}
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{
            ...TransitionPresets.ModalSlideFromBottomIOS,
            gestureEnabled: true,
          }}
        />

        {/* Register — slide up from bottom */}
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            ...TransitionPresets.ModalSlideFromBottomIOS,
            gestureEnabled: true,
          }}
        />

        {/* Logs — slide from right (standard push) */}
        <Stack.Screen
          name="Logs"
          component={LogsScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            gestureEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
