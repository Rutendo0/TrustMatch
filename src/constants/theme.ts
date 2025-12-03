import { normalize } from '../hooks/useResponsive';

// TrustMatch Color Palette - Red & White Theme (Unique from Tinder)
// Using deeper, more sophisticated reds with elegant accents
export const COLORS = {
  // Primary colors - Deep Crimson Red (Trust & Passion)
  primary: '#DC2626', // Crimson Red - passion, trust
  primaryDark: '#B91C1C',
  primaryLight: '#EF4444',
  primarySoft: '#FEE2E2',
  
  // Secondary colors - Rose & Coral accents
  secondary: '#F43F5E', // Rose - warmth, connection
  secondaryDark: '#E11D48',
  secondaryLight: '#FB7185',
  
  // Accent colors - Deep Burgundy (Unique identifier)
  accent: '#9F1239', // Burgundy - elegant, unique
  accentDark: '#881337',
  accentLight: '#BE123C',
  
  // Neutrals - Clean whites and warm grays
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  background: '#FFFFFF', // Pure white background
  backgroundWarm: '#FEF2F2', // Warm red-tinted background
  backgroundGray: '#F9FAFB',
  card: '#FFFFFF',
  text: '#1F2937', // Dark gray
  textSecondary: '#6B7280', // Medium gray
  textLight: '#9CA3AF', // Light gray
  border: '#E5E7EB', // Light border
  borderLight: '#F3F4F6',
  
  // Status colors
  success: '#10B981', // Emerald
  successLight: '#D1FAE5',
  warning: '#F59E0B', // Amber
  warningLight: '#FEF3C7',
  error: '#DC2626', // Red (matches primary)
  errorLight: '#FEE2E2',
  info: '#3B82F6', // Blue
  infoLight: '#DBEAFE',
  
  // Trust & Verification
  verified: '#10B981',
  verifiedBg: 'rgba(16, 185, 129, 0.1)',
  unverified: '#F59E0B',
  trustScore: '#DC2626',
  trustScoreBg: 'rgba(220, 38, 38, 0.1)',
  
  // Premium/Gold
  premium: '#F59E0B',
  premiumBg: 'rgba(245, 158, 11, 0.1)',
  diamond: '#9F1239',
  diamondBg: 'rgba(159, 18, 57, 0.1)',
  
  // Unique gradients
  gradientStart: '#DC2626',
  gradientMiddle: '#E11D48',
  gradientEnd: '#F43F5E',
  
  // Safety colors
  trustShield: '#059669',
  safetyGreen: '#10B981',
  
  // Shadows
  shadow: '#000000',
  shadowLight: 'rgba(0, 0, 0, 0.08)',
  shadowMedium: 'rgba(0, 0, 0, 0.12)',
  shadowRed: 'rgba(220, 38, 38, 0.2)',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayRed: 'rgba(220, 38, 38, 0.1)',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    title: 40,
    hero: 48,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  redGlow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const RESPONSIVE_FONT_SIZES = {
  xs: normalize(12),
  sm: normalize(14),
  md: normalize(16),
  lg: normalize(18),
  xl: normalize(20),
  xxl: normalize(24),
  xxxl: normalize(32),
  title: normalize(40),
  hero: normalize(48),
};

export const RESPONSIVE_SPACING = {
  xs: normalize(4),
  sm: normalize(8),
  md: normalize(16),
  lg: normalize(24),
  xl: normalize(32),
  xxl: normalize(48),
  xxxl: normalize(64),
};

export const TOUCH_TARGET = {
  minSize: 44,
  minHeight: 44,
  minWidth: 44,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
};

// Animation durations
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150,
  },
};

// Gradients for unique styling - Red & White theme
export const GRADIENTS = {
  primary: ['#DC2626', '#E11D48', '#F43F5E'],
  secondary: ['#F43F5E', '#FB7185', '#FDA4AF'],
  trust: ['#10B981', '#059669', '#047857'],
  premium: ['#F59E0B', '#D97706', '#B45309'],
  burgundy: ['#9F1239', '#BE123C', '#E11D48'],
  sunset: ['#DC2626', '#F97316', '#FBBF24'],
  rose: ['#F43F5E', '#FB7185', '#FECDD3'],
  dark: ['#1F2937', '#374151', '#4B5563'],
  redWhite: ['#DC2626', '#FFFFFF'],
};
