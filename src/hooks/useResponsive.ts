import { Dimensions, PixelRatio, Platform, ScaledSize } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const wp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
};

export const hp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
};

export const normalize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

export const isMediumDevice = (): boolean => {
  return SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
};

export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH >= 414;
};

export const isTablet = (): boolean => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 600 || aspectRatio < 1.6;
};

export interface ResponsiveData {
  width: number;
  height: number;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
  normalize: (size: number) => number;
}

export const useResponsive = (): ResponsiveData => {
  const [dimensions, setDimensions] = useState<ScaledSize>(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isLandscape = width > height;

  const responsiveWp = useCallback((percentage: number): number => {
    return PixelRatio.roundToNearestPixel((width * percentage) / 100);
  }, [width]);

  const responsiveHp = useCallback((percentage: number): number => {
    return PixelRatio.roundToNearestPixel((height * percentage) / 100);
  }, [height]);

  const responsiveNormalize = useCallback((size: number): number => {
    const scale = width / BASE_WIDTH;
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }, [width]);

  return useMemo(() => ({
    width,
    height,
    isSmall: width < 375,
    isMedium: width >= 375 && width < 414,
    isLarge: width >= 414,
    isTablet: width >= 600 || height / width < 1.6,
    isLandscape,
    wp: responsiveWp,
    hp: responsiveHp,
    normalize: responsiveNormalize,
  }), [width, height, isLandscape, responsiveWp, responsiveHp, responsiveNormalize]);
};

export const RESPONSIVE_SPACING = {
  xs: normalize(4),
  sm: normalize(8),
  md: normalize(16),
  lg: normalize(24),
  xl: normalize(32),
  xxl: normalize(48),
};

export const RESPONSIVE_FONTS = {
  xs: normalize(12),
  sm: normalize(14),
  md: normalize(16),
  lg: normalize(18),
  xl: normalize(20),
  xxl: normalize(24),
  xxxl: normalize(32),
  title: normalize(40),
};

export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
export const MIN_TOUCH_SIZE = 44;
