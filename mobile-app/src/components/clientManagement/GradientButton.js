import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Animated,
  useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';

const GradientButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  height = 56,
  width,
  gradientColors = ['#3E60D8', '#566FE0'],
  borderRadius = 16,
  fontSize = 16,
  fontWeight = '600',
  icon,
  iconPosition = 'left',
  rippleEffect = true,
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const { width: screenWidth } = useWindowDimensions();

  const handlePressIn = () => {
    if (rippleEffect && !disabled && !loading) {
      Animated.spring(scaleValue, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (rippleEffect && !disabled && !loading) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
        tension: 40,
      }).start();
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  const buttonStyle = [
    styles.button,
    {
      height,
      borderRadius,
      width: width === 'full' ? screenWidth - 40 : width,
    },
    disabled && styles.disabledButton,
    style,
  ];

  const textStyles = [
    styles.text,
    {
      fontSize,
      fontWeight,
    },
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={disabled ? ['#E0E0E0', '#D0D0D0'] : gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={styles.loader}
            />
          ) : (
            <>
              {icon && iconPosition === 'left' && (
                <View style={styles.iconLeft}>
                  {icon}
                </View>
              )}

              <Text style={textStyles} numberOfLines={1}>
                {title}
              </Text>

              {icon && iconPosition === 'right' && (
                <View style={styles.iconRight}>
                  {icon}
                </View>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  loader: {
    marginHorizontal: 8,
  },
  iconLeft: {
    marginRight: 12,
  },
  iconRight: {
    marginLeft: 12,
  },
});

export default GradientButton;