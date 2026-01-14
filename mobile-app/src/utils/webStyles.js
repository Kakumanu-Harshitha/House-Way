import { Platform } from 'react-native';

// Web-safe style utilities to prevent CSS property errors
export const createWebSafeStyles = (styles) => {
  if (Platform.OS !== 'web') {
    return styles;
  }

  // Clean up styles for web compatibility
  const webSafeStyles = { ...styles };

  // Remove React Native specific properties that cause issues on web
  const problematicProps = [
    'shadowColor',
    'shadowOffset', 
    'shadowOpacity',
    'shadowRadius',
    'elevation',
  ];

  const cleanStyle = (styleObj) => {
    if (!styleObj || typeof styleObj !== 'object') {
      return styleObj;
    }

    const cleaned = { ...styleObj };
    
    problematicProps.forEach(prop => {
      if (cleaned[prop] !== undefined) {
        delete cleaned[prop];
      }
    });

    // Convert shadow properties to boxShadow for web
    if (styleObj.shadowColor && styleObj.shadowOffset && styleObj.shadowOpacity && styleObj.shadowRadius) {
      const { shadowColor, shadowOffset, shadowOpacity, shadowRadius } = styleObj;
      const { width = 0, height = 0 } = shadowOffset;
      
      // Convert to rgba if needed
      let color = shadowColor;
      if (color === '#000' || color === 'black') {
        color = `rgba(0, 0, 0, ${shadowOpacity})`;
      } else if (color.startsWith('#')) {
        // Simple hex to rgba conversion
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        color = `rgba(${r}, ${g}, ${b}, ${shadowOpacity})`;
      }
      
      cleaned.boxShadow = `${width}px ${height}px ${shadowRadius}px ${color}`;
    }

    return cleaned;
  };

  // Process all styles
  Object.keys(webSafeStyles).forEach(key => {
    webSafeStyles[key] = cleanStyle(webSafeStyles[key]);
  });

  return webSafeStyles;
};

// Utility to create platform-specific styles
export const platformStyles = {
  web: (styles) => Platform.OS === 'web' ? styles : {},
  mobile: (styles) => Platform.OS !== 'web' ? styles : {},
  ios: (styles) => Platform.OS === 'ios' ? styles : {},
  android: (styles) => Platform.OS === 'android' ? styles : {},
};

// Safe shadow utility
export const createShadow = (options = {}) => {
  const {
    color = '#000',
    offset = { width: 0, height: 2 },
    opacity = 0.1,
    radius = 4,
    elevation = 3,
  } = options;

  return {
    // Mobile shadows
    ...platformStyles.mobile({
      shadowColor: color,
      shadowOffset: offset,
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    }),
    // Web shadows
    ...platformStyles.web({
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    }),
  };
};

// Safe transform utility - handles both Animated.Value and regular values
export const createTransform = (transforms) => {
  if (Platform.OS !== 'web') {
    return { transform: transforms };
  }

  // For web, we need to handle this differently for Animated values
  // Return the original transform for Animated components on web
  // React Native Web will handle the conversion
  return { transform: transforms };
};

// Alternative: Create web-safe static transforms (for non-animated styles)
export const createStaticTransform = (transforms) => {
  if (Platform.OS === 'web') {
    // Convert React Native transform array to CSS transform string
    const transformString = transforms
      .map(transform => {
        const [key, value] = Object.entries(transform)[0];

        // Skip if value is an Animated.Value
        if (value && typeof value === 'object' && value._value !== undefined) {
          return '';
        }

        switch (key) {
          case 'scale':
            return `scale(${value})`;
          case 'scaleX':
            return `scaleX(${value})`;
          case 'scaleY':
            return `scaleY(${value})`;
          case 'translateX':
            return `translateX(${typeof value === 'number' ? `${value}px` : value})`;
          case 'translateY':
            return `translateY(${typeof value === 'number' ? `${value}px` : value})`;
          case 'rotate':
            return `rotate(${value})`;
          case 'rotateX':
            return `rotateX(${value})`;
          case 'rotateY':
            return `rotateY(${value})`;
          case 'rotateZ':
            return `rotateZ(${value})`;
          case 'skewX':
            return `skewX(${value})`;
          case 'skewY':
            return `skewY(${value})`;
          default:
            return '';
        }
      })
      .filter(Boolean)
      .join(' ');

    return transformString ? { transform: transformString } : {};
  }

  return { transform: transforms };
};

// Utility to handle gradient backgrounds safely
export const createGradient = (colors, direction = '135deg') => {
  if (Platform.OS === 'web') {
    return {
      backgroundImage: `linear-gradient(${direction}, ${colors.join(', ')})`,
    };
  }
  
  // For mobile, return colors array for LinearGradient component
  return { colors };
};

export default {
  createWebSafeStyles,
  platformStyles,
  createShadow,
  createTransform,
  createGradient,
};
