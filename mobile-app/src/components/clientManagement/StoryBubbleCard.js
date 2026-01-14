import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const StoryBubbleCard = ({
  type,
  title,
  time,
  onPress,
  subtitle,
  icon,
  badge,
  gradientColors,
}) => {
  const getDefaultColors = () => {
    const colors = {
      milestone: ['#7DB87A', '#6BA869'],
      update: ['#3E60D8', '#566FE0'],
      media: ['#E8B25D', '#D4A34D'],
      invoice: ['#D75A5A', '#C74A4A'],
      note: ['#7487C1', '#6475B1'],
    };
    return colors[type] || colors.update;
  };

  const getIcon = () => {
    const icons = {
      milestone: 'flag',
      update: 'bell',
      media: 'image',
      invoice: 'file-text',
      note: 'edit-3',
    };
    return icons[type] || 'bell';
  };

  const colors = gradientColors || getDefaultColors();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Gradient Background */}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Icon Section */}
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            {icon || <Feather name={getIcon()} size={24} color="#fff" />}
          </View>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>

        {/* Text Section */}
        <View style={styles.textSection}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          <Text style={styles.time}>{time}</Text>
        </View>

        {/* Arrow Indicator */}
        <View style={styles.arrowContainer}>
          <Feather name="arrow-right" size={20} color="rgba(255, 255, 255, 0.8)" />
        </View>
      </View>

      {/* Decorative elements */}
      <View style={[styles.decorationCircle, styles.circle1]} />
      <View style={[styles.decorationCircle, styles.circle2]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.9,
    height: 100,
    borderRadius: 20,
    marginHorizontal: width * 0.05,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconSection: {
    position: 'relative',
    marginRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1B2540',
  },
  textSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorationCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 80,
    height: 80,
    top: -30,
    left: -20,
  },
  circle2: {
    width: 60,
    height: 60,
    bottom: -20,
    right: -15,
  },
});

export default StoryBubbleCard;