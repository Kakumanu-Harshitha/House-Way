import React from 'react';
import { View, ScrollView, Platform } from 'react-native';

// Ultra-safe View component that prevents ALL CSS errors
// Now supports optional scrolling with scrollable prop
const SafeView = ({ style, children, scrollable = false, ...props }) => {
  // Clean styles to prevent CSS errors
  const cleanStyle = (styleObj) => {
    if (!styleObj) return {};
    
    if (Array.isArray(styleObj)) {
      // Flatten style arrays and clean each one
      return styleObj.reduce((acc, s) => ({ ...acc, ...cleanStyle(s) }), {});
    }
    
    if (typeof styleObj !== 'object') return {};
    
    const cleaned = {};
    
    // Only allow these absolutely safe CSS properties
    const allowedProps = [
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'marginHorizontal', 'marginVertical',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'paddingHorizontal', 'paddingVertical',
      'backgroundColor', 'color',
      'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
      'textAlign', 'textDecorationLine', 'textTransform',
      'borderRadius', 'borderWidth', 'borderColor',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'position', 'top', 'right', 'bottom', 'left',
      'flex', 'flexDirection', 'justifyContent', 'alignItems', 'alignSelf',
      'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis',
      'display', 'overflow', 'zIndex', 'opacity'
    ];
    
    Object.keys(styleObj).forEach(key => {
      const value = styleObj[key];
      
      // Only allow safe properties with safe values
      if (allowedProps.includes(key) && 
          typeof value !== 'object' && 
          !Array.isArray(value) &&
          value !== null &&
          value !== undefined) {
        cleaned[key] = value;
      }
    });
    
    return cleaned;
  };
  
  const safeStyle = cleanStyle(style);
  
  // If scrollable is enabled, wrap in ScrollView
  if (scrollable) {
    return (
      <ScrollView 
        style={safeStyle} 
        showsVerticalScrollIndicator={true}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
  
  return (
    <View style={safeStyle} {...props}>
      {children}
    </View>
  );
};

export default SafeView;
