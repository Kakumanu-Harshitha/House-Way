/**
 * Scrolling Configuration for Houseway App
 * Centralized configuration for scroll behavior across web and mobile
 */

import { Platform } from 'react-native';

export const ScrollingConfig = {
  // Global scrolling settings
  ENABLED: true,
  SMOOTH_SCROLL: true,
  MOMENTUM_SCROLL: Platform.OS === 'ios',
  BOUNCES: Platform.OS !== 'web',
  
  // ScrollView default props for all screens
  DEFAULT_SCROLL_VIEW_PROPS: {
    scrollEnabled: true,
    showsVerticalScrollIndicator: true,
    showsHorizontalScrollIndicator: false,
    keyboardDismissMode: 'interactive',
    keyboardShouldPersistTaps: 'handled',
    scrollEventThrottle: 16,
    bounces: Platform.OS !== 'web',
    nestedScrollEnabled: true,
    ...(Platform.OS === 'web' && {
      contentInsetAdjustmentBehavior: 'automatic',
    }),
  },

  // Content container default styles
  DEFAULT_CONTENT_CONTAINER: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Platform-specific overrides
  PLATFORM_OVERRIDES: {
    web: {
      showsVerticalScrollIndicator: true,
      bounces: false,
      momentum: false,
    },
    ios: {
      showsVerticalScrollIndicator: true,
      bounces: true,
      momentum: true,
    },
    android: {
      showsVerticalScrollIndicator: true,
      bounces: false,
      momentum: true,
    },
  },

  // Refresh control colors
  REFRESH_COLORS: ['#2196F3', '#1976D2'],
  REFRESH_TINT_COLOR: '#2196F3',

  // Keyboard avoiding behavior
  KEYBOARD_AVOIDING: {
    ENABLED: Platform.OS !== 'web',
    BEHAVIOR: Platform.OS === 'ios' ? 'padding' : 'height',
    DISMISS_MODE: 'interactive',
  },

  // Scroll position restoration
  RESTORE_SCROLL_POSITION: true,
  SCROLL_POSITION_STORAGE_KEY: 'houseway_scroll_positions',

  // Inertia/momentum settings
  INERTIA_ENABLED: Platform.OS !== 'web',
  DECELERATION_RATE: Platform.OS === 'ios' ? 0.998 : 0.95,

  // Pull-to-refresh
  PULL_TO_REFRESH: {
    ENABLED: true,
    THRESHOLD: 50,
    TITLE: 'Release to refresh...',
    LOADING_TITLE: 'Loading...',
  },

  // Performance settings
  PERFORMANCE: {
    SCROLL_EVENT_THROTTLE: 16,
    MAX_SCROLL_EVENT_CALLBACKS: 10,
    ENABLE_VIRTUALIZATION: true, // For large lists
    LIST_ITEM_HEIGHT: 60, // For FlatList optimization
  },

  // Custom hooks for scroll handling
  onScroll: null,
  onScrollBeginDrag: null,
  onScrollEndDrag: null,
  onMomentumScrollBegin: null,
  onMomentumScrollEnd: null,

  // Animation settings for scroll
  SCROLL_ANIMATION: {
    DURATION: 300,
    EASING: 'ease-in-out',
  },

  // Accessibility
  ACCESSIBILITY: {
    ANNOUNCE_SCROLL_POSITION: false,
    HIGH_CONTRAST_SCROLLBAR: false,
  },

  /**
   * Get merged scroll props for a screen
   * @param {Object} customProps - Custom props to override defaults
   * @returns {Object} Merged scroll view props
   */
  getScrollProps: (customProps = {}) => {
    const platformOverrides = ScrollingConfig.PLATFORM_OVERRIDES[Platform.OS] || {};
    return {
      ...ScrollingConfig.DEFAULT_SCROLL_VIEW_PROPS,
      ...platformOverrides,
      ...customProps,
    };
  },

  /**
   * Get merged content container style
   * @param {Object} customStyle - Custom style to override defaults
   * @returns {Object} Merged content container style
   */
  getContentContainerStyle: (customStyle = {}) => {
    return {
      ...ScrollingConfig.DEFAULT_CONTENT_CONTAINER,
      ...customStyle,
    };
  },
};

export default ScrollingConfig;
