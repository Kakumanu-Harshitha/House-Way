import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';

const { width } = Dimensions.get('window');

const WaveHeader = ({
  title,
  subtitle,
  height = 180,
  showBackButton = false,
  backButtonPress,
  rightComponent,
}) => {
  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.backgroundLight, '#FAF9F6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { height }]}
    >
      {/* Decorative circles - pointerEvents="none" ensures they don't block touches */}
      <View pointerEvents="none" style={[styles.floatingCircle, styles.circle1]} />
      <View pointerEvents="none" style={[styles.floatingCircle, styles.circle2]} />
      <View pointerEvents="none" style={[styles.floatingCircle, styles.circle3]} />

      {/* Gold accent line at top */}
      <View style={styles.accentLine} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={backButtonPress}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color="#000000" />
            </TouchableOpacity>
          )}

          {rightComponent && (
            <View style={styles.rightComponent}>
              {rightComponent}
            </View>
          )}
        </View>

        <View style={showBackButton ? styles.textContainerCentered : styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      {/* Bottom gold accent */}
      <View style={styles.bottomAccent} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  textContainerCentered: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  rightComponent: {
    zIndex: 10,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: COLORS.primary,
  },
  circle1: {
    width: 140,
    height: 140,
    opacity: 0.12,
    top: -40,
    left: -30,
  },
  circle2: {
    width: 100,
    height: 100,
    opacity: 0.15,
    top: 30,
    right: -25,
  },
  circle3: {
    width: 60,
    height: 60,
    opacity: 0.1,
    bottom: 20,
    left: '35%',
  },
  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,193,7,0.25)',
  },
});

export default WaveHeader;
