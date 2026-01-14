import { Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Web-specific style utilities
export const isWeb = Platform.OS === 'web';
export const isLargeScreen = width > 768;
export const isMediumScreen = width > 480 && width <= 768;
export const isSmallScreen = width <= 480;

// Responsive breakpoints
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1200,
};

// Web-specific styles
export const webStyles = {
  // Container styles for web
  webContainer: {
    ...(isWeb && {
      maxWidth: isLargeScreen ? 1200 : '100%',
      marginHorizontal: 'auto',
      minHeight: '100vh',
    }),
  },
  
  // Card styles with better web shadows
  webCard: {
    ...(isWeb && {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderRadius: 8,
      backgroundColor: '#fff',
    }),
  },
  
  // Button styles for web
  webButton: {
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      userSelect: 'none',
    }),
  },
  
  // Input styles for web
  webInput: {
    ...(isWeb && {
      outline: 'none',
      transition: 'border-color 0.2s ease',
    }),
  },
  
  // Navigation styles for web
  webNavigation: {
    ...(isWeb && isLargeScreen && {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 20,
    }),
  },
  
  // Grid layout for web
  webGrid: {
    ...(isWeb && {
      display: 'flex',
      flexDirection: isLargeScreen ? 'row' : 'column',
      flexWrap: 'wrap',
      gap: 20,
    }),
  },
  
  // Sidebar for web
  webSidebar: {
    ...(isWeb && isLargeScreen && {
      width: 250,
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      borderRightWidth: 1,
      borderRightColor: '#e9ecef',
    }),
  },
  
  // Main content area for web
  webMainContent: {
    ...(isWeb && isLargeScreen && {
      flex: 1,
      paddingLeft: 20,
    }),
  },
  
  // Header styles for web
  webHeader: {
    ...(isWeb && {
      paddingHorizontal: isLargeScreen ? 40 : 20,
      paddingVertical: 20,
    }),
  },
  
  // Form styles for web
  webForm: {
    ...(isWeb && {
      maxWidth: isMediumScreen ? 400 : 600,
      marginHorizontal: 'auto',
      padding: isLargeScreen ? 40 : 20,
    }),
  },
  
  // Table styles for web
  webTable: {
    ...(isWeb && {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: '#fff',
    }),
  },
  
  // Modal styles for web
  webModal: {
    ...(isWeb && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }),
  },
  
  // Responsive text sizes
  webText: {
    ...(isWeb && {
      fontSize: isLargeScreen ? 16 : isMediumScreen ? 14 : 12,
      lineHeight: isLargeScreen ? 24 : isMediumScreen ? 20 : 18,
    }),
  },
  
  // Hover effects for web
  webHover: {
    ...(isWeb && {
      ':hover': {
        opacity: 0.8,
        transform: 'translateY(-1px)',
      },
    }),
  },
};

// Utility functions for responsive design
export const getResponsiveValue = (mobile, tablet, desktop) => {
  if (isLargeScreen) return desktop || tablet || mobile;
  if (isMediumScreen) return tablet || mobile;
  return mobile;
};

export const getResponsiveWidth = (percentage = 100) => {
  if (isLargeScreen) return `${Math.min(percentage, 80)}%`;
  if (isMediumScreen) return `${Math.min(percentage, 90)}%`;
  return `${percentage}%`;
};

export const getResponsivePadding = () => {
  return getResponsiveValue(10, 20, 30);
};

export const getResponsiveMargin = () => {
  return getResponsiveValue(5, 10, 15);
};

// Web-specific component wrappers
export const WebContainer = ({ children, style, ...props }) => {
  return (
    <div style={{...webStyles.webContainer, ...style}} {...props}>
      {children}
    </div>
  );
};

export const WebCard = ({ children, style, ...props }) => {
  return (
    <div style={{...webStyles.webCard, ...style}} {...props}>
      {children}
    </div>
  );
};

// CSS-in-JS helper for web
export const webCSS = `
  /* Web-specific global styles */
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background-color: #FDFBF7;
  }
  
  * {
    box-sizing: border-box;
  }
  
  /* Scrollbar styling for web */
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
  
  /* Focus styles for accessibility */
  button:focus,
  input:focus,
  textarea:focus {
    outline: 2px solid #2196F3;
    outline-offset: 2px;
  }
  
  /* Print styles */
  @media print {
    body {
      background: white;
    }
    
    .no-print {
      display: none !important;
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .card {
      border: 2px solid #000;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export default webStyles;
