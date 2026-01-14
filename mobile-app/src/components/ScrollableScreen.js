import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';

/**
 * ScrollableScreen Component
 * A wrapper component that ensures scrolling works properly on both web and mobile
 * Handles keyboard avoiding, refresh control, and proper ScrollView setup
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Screen content
 * @param {Function} props.onRefresh - Optional refresh handler
 * @param {boolean} props.isRefreshing - Optional refresh state
 * @param {Object} props.style - Optional container style
 * @param {Object} props.contentStyle - Optional content style
 * @param {boolean} props.avoidKeyboard - Whether to use KeyboardAvoidingView (default: true on mobile)
 * @param {string} props.behavior - KeyboardAvoidingView behavior ('padding', 'height', 'position')
 * @param {boolean} props.enableScrolling - Enable scrolling (default: true)
 */
const ScrollableScreen = ({
  children,
  onRefresh,
  isRefreshing = false,
  refreshing = false,
  style = {},
  contentStyle = {},
  avoidKeyboard = Platform.OS !== 'web',
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  enableScrolling = true,
  scrollEventThrottle = 16,
  bounces = true,
}) => {
  const containerStyle = [styles.container, style];
  const contentContainerStyle = [styles.contentContainer, contentStyle];
  const isRefreshingState = isRefreshing || refreshing; // Support both prop names

  const scrollViewProps = {
    scrollEnabled: enableScrolling,
    showsVerticalScrollIndicator: true,
    showsHorizontalScrollIndicator: false,
    keyboardDismissMode: 'interactive',
    keyboardShouldPersistTaps: 'handled',
    scrollEventThrottle,
    bounces: Platform.OS !== 'web' ? bounces : false,
    contentContainerStyle: contentContainerStyle,
    ...(onRefresh && Platform.OS !== 'web' && {
      refreshControl: (
        <RefreshControl
          refreshing={isRefreshingState}
          onRefresh={onRefresh}
          colors={['#2196F3']}
          tintColor="#2196F3"
        />
      ),
    }),
  };

  // On web, ensure proper scrolling with additional styles
  if (Platform.OS === 'web') {
    return (
      <ScrollView
        style={[containerStyle, styles.webScroll]}
        {...scrollViewProps}
        contentInsetAdjustmentBehavior="automatic"
        nestedScrollEnabled={true}
      >
        <View style={[styles.webContentWrapper, contentContainerStyle]}>
          {children}
        </View>
      </ScrollView>
    );
  }

  // On mobile, use KeyboardAvoidingView if needed
  if (avoidKeyboard) {
    return (
      <KeyboardAvoidingView
        style={containerStyle}
        behavior={behavior}
        enabled={avoidKeyboard}
      >
        <ScrollView {...scrollViewProps}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={containerStyle} {...scrollViewProps}>
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  webScroll: {
    width: '100%',
    ...Platform.select({
      web: {
        overflowY: 'auto',
        overflowX: 'hidden', // Prevent horizontal scrolling/shaking
        WebkitOverflowScrolling: 'touch',
        // Enable smooth scrolling on web
        scrollBehavior: 'smooth',
        // Prevent scrollbar from causing layout shifts
        scrollbarGutter: 'stable',
      },
    }),
  },
  webContentWrapper: {
    minHeight: '100vh',
    width: '100%',
    maxWidth: '100%', // Prevent content from overflowing
    boxSizing: 'border-box',
  },
});

export default ScrollableScreen;
