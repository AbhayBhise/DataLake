import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';

interface NHAILogoProps {
  size?: number; // Size of the shield/seal (width/height)
  compact?: boolean; // If true, only show the icon/shield without text titles
}

export const NHAILogo: React.FC<NHAILogoProps> = ({ size = 80, compact = false }) => {
  // We can scale dimensions dynamically based on size
  const scale = size / 80;

  // Render the shield
  return (
    <View style={[styles.container, compact && styles.rowLayout]}>
      <View
        style={[
          styles.shieldOuter,
          {
            width: size,
            height: size * 1.15,
            borderTopLeftRadius: 12 * scale,
            borderTopRightRadius: 12 * scale,
            borderBottomLeftRadius: 36 * scale,
            borderBottomRightRadius: 36 * scale,
            borderWidth: 2.5 * scale,
          },
        ]}
      >
        {/* Saffron accent bar at the top representing India's national colors */}
        <View style={[styles.saffronBar, { height: 6 * scale }]} />

        {/* Concentric fingerprint biometric arcs */}
        <View style={[styles.arcsContainer, { height: size * 0.65, marginTop: 4 * scale }]}>
          <View style={[styles.arc, { width: 50 * scale, height: 50 * scale, borderRadius: 25 * scale, borderBottomColor: 'transparent', borderWidth: 2.5 * scale, top: 4 * scale }]} />
          <View style={[styles.arc, { width: 34 * scale, height: 34 * scale, borderRadius: 17 * scale, borderBottomColor: 'transparent', borderWidth: 2.5 * scale, top: 12 * scale }]} />
          <View style={[styles.arc, { width: 18 * scale, height: 18 * scale, borderRadius: 9 * scale, borderBottomColor: 'transparent', borderWidth: 2.5 * scale, top: 20 * scale }]} />
        </View>

        {/* Small verified green checkmark badge at the bottom of the shield */}
        <View
          style={[
            styles.checkBadge,
            {
              width: 20 * scale,
              height: 20 * scale,
              borderRadius: 10 * scale,
              borderWidth: 1.5 * scale,
              bottom: 8 * scale,
            },
          ]}
        >
          <Text style={[styles.checkText, { fontSize: 10 * scale, lineHeight: 11 * scale }]}>✓</Text>
        </View>
      </View>

      {!compact && (
        <View style={styles.textContainer}>
          <Text style={styles.wordmark}>DATALAKE EDGE</Text>
          <Text style={styles.tagline}>SECURE • OFFLINE • VERIFIED</Text>
          <Text style={styles.footerText}>National Highways Authority of India</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldOuter: {
    backgroundColor: '#1A4BA0', // Royal blue branding from NHAI
    borderColor: '#C9921A', // Amber/gold border
    position: 'relative',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#1A4BA0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  saffronBar: {
    width: '100%',
    backgroundColor: '#FF9933', // Saffron orange
  },
  arcsContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  arc: {
    position: 'absolute',
    borderColor: '#7AADFF', // Light blue fingerprint color
  },
  checkBadge: {
    position: 'absolute',
    backgroundColor: '#10B981', // Emerald green
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  textContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia', // Serif font for authoritative look
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C9921A', // Gold/amber
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  footerText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 6,
    letterSpacing: 0.5,
  },
});

export default NHAILogo;
