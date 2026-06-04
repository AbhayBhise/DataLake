// ─── DatalakeEdge Design System ─────────────────────────────────────────────
// NHAI Hackathon 7.0 — Premium dark theme with indigo/emerald palette

export const Colors = {
  // Background layers
  bg: {
    primary:   '#080E1A',   // Deepest background
    secondary: '#0F172A',   // Main surface
    tertiary:  '#1E293B',   // Card surface
    elevated:  '#263345',   // Elevated card
    overlay:   'rgba(8,14,26,0.92)',
  },
  // Brand
  brand: {
    indigo:    '#6366F1',
    indigoLight:'#818CF8',
    indigoDark: '#4F46E5',
    emerald:   '#10B981',
    emeraldLight:'#34D399',
    emeraldDark:'#059669',
    amber:     '#F59E0B',
    red:       '#EF4444',
    redDark:   '#B91C1C',
  },
  // Text
  text: {
    primary:   '#F8FAFC',
    secondary: '#CBD5E1',
    muted:     '#64748B',
    disabled:  '#334155',
    inverse:   '#0F172A',
  },
  // Borders
  border: {
    subtle:    '#1E293B',
    default:   '#334155',
    strong:    '#475569',
    brand:     '#6366F1',
    success:   '#10B981',
    danger:    '#EF4444',
  },
  // Status
  status: {
    success:   '#10B981',
    warning:   '#F59E0B',
    danger:    '#EF4444',
    info:      '#6366F1',
    offline:   '#EF4444',
    online:    '#10B981',
  },
  // Gradients (start/end for LinearGradient)
  gradient: {
    brand:   ['#6366F1', '#4F46E5'],
    emerald: ['#10B981', '#059669'],
    danger:  ['#EF4444', '#B91C1C'],
    dark:    ['#1E293B', '#0F172A'],
    hero:    ['#080E1A', '#0F172A'],
  },
};

export const Typography = {
  // Font sizes
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 42,
  // Font weights (React Native uses string)
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  extrabold:'800' as const,
  // Letter spacing
  tight:  -0.5,
  normal: 0,
  wide:   1.0,
  wider:  1.5,
  widest: 2.5,
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
};

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  '2xl': 28,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  brand: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  emerald: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  danger: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
};

export const Theme = {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadow,
};

export default Theme;
