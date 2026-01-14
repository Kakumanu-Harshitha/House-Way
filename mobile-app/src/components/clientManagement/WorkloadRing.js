import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

const WorkloadRing = ({
  percentage = 0,
  label,
  color = '#3E60D8',
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  animated = true,
  subtitle,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: percentage,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(percentage);
    }
  }, [percentage, animated]);

  const animatedStrokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const getSecondaryColor = () => {
    const colors = {
      '#3E60D8': '#E8EEF4',
      '#7DB87A': '#E8F5E8',
      '#E8B25D': '#FEF5E7',
      '#D75A5A': '#FDE8E8',
      '#7487C1': '#E8E8F4',
    };
    return colors[color] || '#E8EEF4';
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getSecondaryColor()}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={animatedStrokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {showPercentage && (
          <>
            <Animated.Text
              style={[
                styles.percentage,
                {
                  color: color,
                  fontSize: size * 0.22,
                },
              ]}
            >
              {animated ? Math.round(animatedValue._value) : percentage}%
            </Animated.Text>
            <Text style={styles.label} numberOfLines={2}>
              {label}
            </Text>
          </>
        )}

        {!showPercentage && (
          <>
            <Text style={[styles.mainLabel, { color, fontSize: size * 0.18 }]}>
              {label}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  percentage: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7487C1',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  mainLabel: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7487C1',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default WorkloadRing;