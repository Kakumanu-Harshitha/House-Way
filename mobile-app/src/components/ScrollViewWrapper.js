/**
 * ScrollViewWrapper - Ensures consistent scrolling across web and mobile
 * Wraps content with proper ScrollView configuration
 */

import React from 'react';
import { ScrollView, Platform, RefreshControl } from 'react-native';

const ScrollViewWrapper = ({
  children,
  style = {},
  contentContainerStyle = {},
  onRefresh = null,
  isRefreshing = false,
  showIndicator = true,
  ...props
}) => {
  const scrollViewProps = {
    scrollEnabled: true,
    showsVerticalScrollIndicator: showIndicator,
    showsHorizontalScrollIndicator: false,
    keyboardDismissMode: 'interactive',
    keyboardShouldPersistTaps: 'handled',
    scrollEventThrottle: 16,
    bounces: Platform.OS !== 'web',
    nestedScrollEnabled: true,
    contentContainerStyle: {
      flexGrow: 1,
      paddingBottom: 20,
      ...contentContainerStyle,
    },
    ...props,
  };

  // Add refresh control for mobile
  if (onRefresh && Platform.OS !== 'web') {
    scrollViewProps.refreshControl = (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        colors={['#2196F3']}
        tintColor="#2196F3"
      />
    );
  }

  return (
    <ScrollView
      style={[
        {
          flex: 1,
          width: '100%',
        },
        style,
      ]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
};

export default ScrollViewWrapper;
