// Warm Cream & Amber Dashboard Theme
export const colors = {
  // Primary Amber Colors (for buttons and highlights)
  primary: {
    50: '#FDFCF0',
    100: '#FAF7E1',
    200: '#F5F5F0', // Beige
    300: '#E6D7BB',
    400: '#D4AF37', // Gold
    500: '#D4AF37', // Dark Golden Rod
    600: '#A67C00',
    700: '#8B6508',
    800: '#6B4E06',
    900: '#4A3604',
  },

  // Secondary Soft Beige Colors (for accents)
  secondary: {
    50: '#FFF9EB',
    100: '#FDF3E7',
    200: '#F7E9D8',
    300: '#EFE0C9',
    400: '#E6D7BB',
    500: '#D9CBB0',
    600: '#CBBFA4',
    700: '#B5A78E',
    800: '#9F917A',
    900: '#8A7C67',
  },

  // Success Colors - Green
  success: {
    50: '#e8f5e8',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',    // Main success green
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },

  // Error Colors - Red
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',    // Main error red
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },

  // Warning Colors - Orange
  warning: {
    50: '#fff3e0',
    100: '#ffe0b2',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800',
    600: '#fb8c00',
    700: '#f57c00',
    800: '#ef6c00',
    900: '#e65100',
  },

  // Neutral/Gray Colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    white: '#ffffff',
    black: '#000000',
  },

  // Background Colors - Warm, light, and clean
  background: {
    primary: '#FFFFFF', // Clean White
    secondary: '#FFFFFF',
    tertiary: '#FAFAFA',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.4)',
    accent: '#FFF8E7', // Light gold tint
    dark: '#1A1A1A',
  },

  // Text Colors - High contrast on light backgrounds
  text: {
    primary: '#1A1A1A',
    secondary: '#4A4A4A',
    tertiary: '#666666',
    muted: '#999999',
    white: '#FFFFFF',
    inverse: '#FFFFFF',
    brand: '#D4AF37',
    success: '#388E3C',
    warning: '#F57C00',
    error: '#D32F2F',
  },

  // Border Colors - Subtle on light background
  border: {
    light: 'rgba(184, 134, 11, 0.1)',
    medium: 'rgba(184, 134, 11, 0.2)',
    dark: 'rgba(184, 134, 11, 0.3)',
    primary: '#D4AF37',
    focus: '#A67C00',
  },
};



// Typography
export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
  },
  fontWeights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};

// Border Radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 50,
};

// Shadows - Web and Mobile Compatible
export const shadows = {
  sm: {
    // Mobile shadows
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    // Web shadows
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  md: {
    // Mobile shadows
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    // Web shadows
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
  },
  lg: {
    // Mobile shadows
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    // Web shadows
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  },
};

// Card Styles - Creative and Standardized
export const cardStyles = {
  default: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  elevated: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  accent: {
    backgroundColor: colors.secondary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
    ...shadows.sm,
  },
  primary: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  secondary: {
    backgroundColor: colors.secondary[100],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.secondary[300],
  },
};

// Component Styles
export const components = {
  button: {
    primary: {
      backgroundColor: colors.primary[500],
      borderColor: colors.primary[500],
      color: colors.text.white,
    },
    secondary: {
      backgroundColor: colors.secondary[500],
      borderColor: colors.secondary[500],
      color: colors.text.primary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: colors.primary[500],
      color: colors.primary[500],
    },
  },
  card: {
    default: {
      backgroundColor: colors.background.card,
      borderColor: colors.border.light,
      shadowColor: colors.neutral[900],
    },
    elevated: {
      backgroundColor: colors.background.card,
      ...shadows.md,
    },
  },
  input: {
    default: {
      backgroundColor: colors.background.secondary,
      borderColor: colors.border.light,
      color: colors.text.primary,
      placeholderColor: colors.text.muted,
    },
    focused: {
      borderColor: colors.primary[500],
      backgroundColor: colors.neutral.white,
    },
  },
};

// Status Colors for Different States - Solid Colors Only
export const statusColors = {
  project: {
    planning: colors.primary[500],
    'in-progress': colors.secondary[600],
    completed: colors.success[500],
    'on-hold': colors.warning[500],
    cancelled: colors.error[500],
  },
  priority: {
    low: colors.success[500],
    medium: colors.warning[500],
    high: colors.error[500],
  },
  material: {
    pending: colors.warning[500],
    approved: colors.success[500],
    rejected: colors.error[500],
  },
};

export default {
  colors,
  cardStyles,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  statusColors,
};
