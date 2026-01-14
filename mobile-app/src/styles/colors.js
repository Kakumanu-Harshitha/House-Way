/**
 * GLOBAL COLOR PALETTE - Houseway App
 * White Theme with Gold Accents - Premium home design
 * 
 * Usage: import { COLORS } from '../styles/colors';
 */

// Premium White Theme with Yellow Fade Accents
export const COLORS = {
    // Primary - Yellow Fade (brand color)
    primary: '#F4D03F',           // Vibrant Yellow
    primaryDark: '#E6BC00',       // Dark Yellow
    primaryLight: '#FFF9E6',      // Very light yellow
    primaryMuted: 'rgba(244, 208, 63, 0.12)',  // Very light yellow for backgrounds

    // Secondary - Warm Neutrals
    secondary: '#F9E79F',         // Light golden yellow
    secondaryDark: '#F7DC6F',     // Medium yellow
    secondaryLight: '#FFFFCC',    // Pale yellow

    // Background colors - Clean White with Yellow Fade
    background: '#FFFFFF',        // Clean white background
    backgroundSecondary: '#FFFEF5', // Off-white with yellow tint
    backgroundTertiary: '#FFFAEB', // Very light yellow
    backgroundLight: '#FFFFFF',   // Light background for gradients
    surface: '#FFFFFF',           // Cards and surfaces
    card: '#FFFFFF',              // Card backgrounds
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays

    // Decorative Circle Colors (for background decorations)
    circleLight: 'rgba(244, 208, 63, 0.08)',   // Very light yellow circle
    circleMedium: 'rgba(244, 208, 63, 0.12)',  // Medium yellow circle
    circleDark: 'rgba(244, 208, 63, 0.18)',    // Darker yellow circle
    circleGradient: ['rgba(244, 208, 63, 0.1)', 'rgba(255, 248, 230, 0.08)'], // Circle gradient

    // Backward compatibility aliases
    cardBg: '#FFFFFF',            // Alias for card
    cardBorder: 'rgba(244, 208, 63, 0.15)', // Light yellow border

    // Text colors
    text: '#1A1A1A',              // Primary text - near black
    textSecondary: '#4A4A4A',     // Secondary text
    textTertiary: '#666666',      // Tertiary text
    textMuted: '#999999',         // Muted/placeholder text
    textLight: '#FFFFFF',         // White text for dark backgrounds
    textBrand: '#D4AF37',         // Gold brand text

    // Status colors - Modern palette
    success: '#22C55E',           // Green for success
    successLight: '#DCFCE7',      // Light green background
    warning: '#F59E0B',           // Amber for warnings
    warningLight: '#FEF3C7',      // Light amber background
    error: '#EF4444',             // Red for errors
    errorLight: '#FEE2E2',        // Light red background
    info: '#3B82F6',              // Blue for info
    infoLight: '#DBEAFE',         // Light blue background

    // Backward compatibility for status
    danger: '#EF4444',            // Alias for error

    // Tab colors
    activeTab: '#D4AF37',         // Active tab color (gold)
    pastTab: '#666666',           // Inactive/past tab color

    // Neutral colors
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',

    // Input field colors
    inputBg: '#FFFAEB',           // Light yellow background
    inputBorder: 'rgba(244, 208, 63, 0.15)', // Input border

    // Additional text aliases
    textDim: '#999999',           // Alias for textMuted

    // Border colors
    border: 'rgba(244, 208, 63, 0.15)',        // Light yellow border
    borderLight: 'rgba(244, 208, 63, 0.08)',   // Very subtle yellow border
    borderMedium: 'rgba(244, 208, 63, 0.12)',  // Medium yellow border
    borderDark: 'rgba(244, 208, 63, 0.2)',     // Dark yellow border
    borderPrimary: '#F4D03F',                  // Yellow border
    borderFocus: '#E6BC00',                    // Focused input border

    // Special colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',

    // Gradient support (use with LinearGradient)
    gradientPrimary: ['#F4D03F', '#FFE680'],
    gradientSecondary: ['#FFE680', '#FFF9E6'],
};

// Complete theme object for more structured usage
export const theme = {
    colors: COLORS,

    // Typography
    fonts: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
    },

    fontSizes: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 18,
        xxl: 20,
        xxxl: 24,
        display: 28,
        displayLg: 32,
    },

    // Spacing
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
        xxxl: 32,
        xxxxl: 40,
    },

    // Border Radius
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        xxl: 20,
        full: 9999,
    },

    // Shadows (React Native style)
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
        },
    },
};

export default COLORS;
