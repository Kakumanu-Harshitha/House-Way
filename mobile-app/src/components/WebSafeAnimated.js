import React from 'react';
import { Platform, View, Animated } from 'react-native';

// EXTREMELY aggressive style cleaning - only allow basic CSS properties
const cleanStylesForWeb = (style) => {
  if (!style) return {};

  if (Array.isArray(style)) {
    return style.map(cleanStylesForWeb).reduce((acc, s) => ({ ...acc, ...s }), {});
  }

  if (typeof style === 'object') {
    const cleaned = {};

    // WHITELIST: Only allow these safe CSS properties
    const safeProps = [
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'marginHorizontal', 'marginVertical',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'paddingHorizontal', 'paddingVertical',
      'backgroundColor', 'color',
      'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
      'textAlign', 'textDecorationLine',
      'borderRadius', 'borderWidth', 'borderColor',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'position', 'top', 'right', 'bottom', 'left',
      'flex', 'flexDirection', 'justifyContent', 'alignItems', 'alignSelf',
      'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis',
      'display', 'overflow', 'zIndex', 'opacity'
    ];

    // Only keep whitelisted properties
    Object.keys(style).forEach(key => {
      if (safeProps.includes(key) && typeof style[key] !== 'object' && !Array.isArray(style[key])) {
        cleaned[key] = style[key];
      }
    });

    return cleaned;
  }

  return {};
};

// Ultra-safe component that only allows basic CSS properties
export const WebSafeAnimatedView = ({ style, children, ...props }) => {
  // ALWAYS use aggressive cleaning on ALL platforms to prevent any issues
  const cleanedStyle = cleanStylesForWeb(style);

  return (
    <View style={cleanedStyle} {...props}>
      {children}
    </View>
  );
};

// Alternative: Simple wrapper that avoids transform arrays on web
export const SafeAnimatedView = ({ style, children, ...props }) => {
  if (Platform.OS === 'web') {
    // For web, extract transform and handle it separately
    const styleArray = Array.isArray(style) ? style : [style];
    const flatStyle = styleArray.reduce((acc, s) => ({ ...acc, ...s }), {});
    const { transform, ...safeStyle } = flatStyle;
    
    // If there's a transform, try to apply it safely
    if (transform && Array.isArray(transform)) {
      // For now, just skip complex transforms on web to avoid errors
      return (
        <Animated.View style={safeStyle} {...props}>
          {children}
        </Animated.View>
      );
    }
    
    return (
      <Animated.View style={style} {...props}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={style} {...props}>
      {children}
    </Animated.View>
  );
};

export default WebSafeAnimatedView;
