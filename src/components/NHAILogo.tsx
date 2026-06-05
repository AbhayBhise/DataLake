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

        {/* Bounding Box / Viewfinder Brackets around Face Scan */}
        <View style={[styles.scannerContainer, { width: size * 0.7, height: size * 0.7, marginTop: 8 * scale }]}>
          {/* Top-Left Bracket */}
          <View style={[styles.bracket, styles.topLeft, { width: 10 * scale, height: 10 * scale, borderWidth: 2 * scale }]} />
          {/* Top-Right Bracket */}
          <View style={[styles.bracket, styles.topRight, { width: 10 * scale, height: 10 * scale, borderWidth: 2 * scale }]} />
          {/* Bottom-Left Bracket */}
          <View style={[styles.bracket, styles.bottomLeft, { width: 10 * scale, height: 10 * scale, borderWidth: 2 * scale }]} />
          {/* Bottom-Right Bracket */}
          <View style={[styles.bracket, styles.bottomRight, { width: 10 * scale, height: 10 * scale, borderWidth: 2 * scale }]} />

          {/* Stylized Facial Profile Outline */}
          <View style={styles.faceIconContainer}>
            {/* Head */}
            <View style={[styles.faceHead, { width: 20 * scale, height: 24 * scale, borderRadius: 10 * scale, borderWidth: 2 * scale }]} />
            {/* Shoulders */}
            <View style={[styles.faceShoulders, { width: 32 * scale, height: 12 * scale, borderTopLeftRadius: 16 * scale, borderTopRightRadius: 16 * scale, borderWidth: 2 * scale }]} />
          </View>

          {/* Scanning Laser Line */}
          <View style={[styles.scanLine, { height: 2 * scale, top: size * 0.32 }]} />
        </View>

        {/* Small verified green checkmark badge at the bottom of the shield */}
        <View
          style={[
            styles.checkBadge,
            {
              width: 18 * scale,
              height: 18 * scale,
              borderRadius: 9 * scale,
              borderWidth: 1.5 * scale,
              bottom: 8 * scale,
            },
          ]}
        >
          <Text style={[styles.checkText, { fontSize: 9 * scale, lineHeight: 10 * scale }]}>✓</Text>
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
  scannerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracket: {
    position: 'absolute',
    borderColor: '#7AADFF', // Light blue scanning bracket
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  faceIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceHead: {
    borderColor: '#7AADFF',
    backgroundColor: 'transparent',
  },
  faceShoulders: {
    borderColor: '#7AADFF',
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    marginTop: 2,
  },
  scanLine: {
    position: 'absolute',
    width: '80%',
    backgroundColor: '#FF9933', // Saffron scanning laser line
    shadowColor: '#FF9933',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
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
