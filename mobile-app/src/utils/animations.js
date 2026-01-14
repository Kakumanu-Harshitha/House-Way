import { Animated, Easing } from 'react-native';

// Animation presets and utilities
export const AnimationPresets = {
  // Timing configurations
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  
  // Easing functions
  easing: {
    bounce: Easing.bounce,
    elastic: Easing.elastic(1.3),
    smooth: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    sharp: Easing.bezier(0.4, 0.0, 0.2, 1),
    standard: Easing.bezier(0.4, 0.0, 0.6, 1),
  },
};

// Fade animations
export const createFadeAnimation = (animatedValue, toValue = 1, duration = 300) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: AnimationPresets.easing.smooth,
    useNativeDriver: true,
  });
};

// Scale animations
export const createScaleAnimation = (animatedValue, toValue = 1, duration = 300) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: AnimationPresets.easing.elastic,
    useNativeDriver: true,
  });
};

// Slide animations
export const createSlideAnimation = (animatedValue, toValue = 0, duration = 300) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: AnimationPresets.easing.smooth,
    useNativeDriver: true,
  });
};

// Rotation animations
export const createRotationAnimation = (animatedValue, toValue = 1, duration = 1000) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.linear,
    useNativeDriver: true,
  });
};

// Spring animations
export const createSpringAnimation = (animatedValue, toValue = 1) => {
  return Animated.spring(animatedValue, {
    toValue,
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  });
};

// Sequence animations
export const createSequenceAnimation = (animations) => {
  return Animated.sequence(animations);
};

// Parallel animations
export const createParallelAnimation = (animations) => {
  return Animated.parallel(animations);
};

// Stagger animations
export const createStaggerAnimation = (animations, staggerTime = 100) => {
  return Animated.stagger(staggerTime, animations);
};

// Loop animations
export const createLoopAnimation = (animation, iterations = -1) => {
  return Animated.loop(animation, { iterations });
};

// Complex entrance animation
export const createEntranceAnimation = (fadeValue, scaleValue, slideValue) => {
  return Animated.parallel([
    createFadeAnimation(fadeValue, 1, 400),
    createSpringAnimation(scaleValue, 1),
    createSlideAnimation(slideValue, 0, 400),
  ]);
};

// Card flip animation
export const createCardFlipAnimation = (animatedValue, duration = 600) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: AnimationPresets.easing.smooth,
    useNativeDriver: true,
  });
};

// Pulse animation
export const createPulseAnimation = (animatedValue) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 1000,
        easing: AnimationPresets.easing.smooth,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        easing: AnimationPresets.easing.smooth,
        useNativeDriver: true,
      }),
    ])
  );
};

// Shake animation
export const createShakeAnimation = (animatedValue) => {
  return Animated.sequence([
    Animated.timing(animatedValue, { toValue: 10, duration: 100, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: 100, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 10, duration: 100, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 0, duration: 100, useNativeDriver: true }),
  ]);
};

// Wave animation
export const createWaveAnimation = (animatedValue) => {
  return Animated.loop(
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 2000,
      easing: Easing.sin,
      useNativeDriver: true,
    })
  );
};

// Morphing animation
export const createMorphAnimation = (animatedValue, toValue, duration = 500) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: AnimationPresets.easing.elastic,
    useNativeDriver: false, // Layout animations need this
  });
};

// Progress animation
export const createProgressAnimation = (animatedValue, toValue, duration = 1000) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: AnimationPresets.easing.smooth,
    useNativeDriver: false,
  });
};

// 3D Transform utilities
export const create3DTransform = (rotateX, rotateY, rotateZ, perspective = 1000) => {
  return {
    transform: [
      { perspective },
      { rotateX: `${rotateX}deg` },
      { rotateY: `${rotateY}deg` },
      { rotateZ: `${rotateZ}deg` },
    ],
  };
};

// Interpolation helpers
export const createInterpolation = (animatedValue, inputRange, outputRange, extrapolate = 'clamp') => {
  return animatedValue.interpolate({
    inputRange,
    outputRange,
    extrapolate,
  });
};

// Color interpolation
export const createColorInterpolation = (animatedValue, colors) => {
  const inputRange = colors.map((_, index) => index / (colors.length - 1));
  return animatedValue.interpolate({
    inputRange,
    outputRange: colors,
  });
};

// Animation hooks for React components
export const useAnimatedValue = (initialValue = 0) => {
  const animatedValue = new Animated.Value(initialValue);
  return animatedValue;
};

export const useAnimatedXY = (initialX = 0, initialY = 0) => {
  const animatedXY = new Animated.ValueXY({ x: initialX, y: initialY });
  return animatedXY;
};

// Gesture animations
export const createDragAnimation = (animatedXY, toValue = { x: 0, y: 0 }) => {
  return Animated.spring(animatedXY, {
    toValue,
    useNativeDriver: true,
  });
};

// Loading animations
export const createLoadingAnimation = (animatedValue) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        easing: AnimationPresets.easing.smooth,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0.3,
        duration: 800,
        easing: AnimationPresets.easing.smooth,
        useNativeDriver: true,
      }),
    ])
  );
};

export default {
  AnimationPresets,
  createFadeAnimation,
  createScaleAnimation,
  createSlideAnimation,
  createRotationAnimation,
  createSpringAnimation,
  createSequenceAnimation,
  createParallelAnimation,
  createStaggerAnimation,
  createLoopAnimation,
  createEntranceAnimation,
  createCardFlipAnimation,
  createPulseAnimation,
  createShakeAnimation,
  createWaveAnimation,
  createMorphAnimation,
  createProgressAnimation,
  create3DTransform,
  createInterpolation,
  createColorInterpolation,
  useAnimatedValue,
  useAnimatedXY,
  createDragAnimation,
  createLoadingAnimation,
};
