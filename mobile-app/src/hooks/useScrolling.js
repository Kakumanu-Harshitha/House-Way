/**
 * useScrolling Hook
 * Provides scroll position management and scroll event handling
 */

import { useRef, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import ScrollingConfig from '../config/scrollingConfig';

/**
 * Hook for managing scroll position and scroll events
 * @param {string} screenKey - Unique key for storing scroll position
 * @param {Object} options - Configuration options
 * @returns {Object} Scroll handlers and utilities
 */
export const useScrolling = (screenKey, options = {}) => {
  const scrollViewRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const {
    onScroll = null,
    restorePosition = ScrollingConfig.RESTORE_SCROLL_POSITION,
    throttleScroll = true,
  } = options;

  // Restore scroll position on mount
  useEffect(() => {
    if (restorePosition && Platform.OS === 'web') {
      const savedPosition = window.sessionStorage?.getItem(
        `${ScrollingConfig.SCROLL_POSITION_STORAGE_KEY}_${screenKey}`
      );
      if (savedPosition && scrollViewRef.current) {
        const position = parseInt(savedPosition, 10);
        setTimeout(() => {
          if (Platform.OS === 'web') {
            window.scrollTo(0, position);
          } else if (scrollViewRef.current?.scrollTo) {
            scrollViewRef.current.scrollTo({ y: position, animated: false });
          }
        }, 0);
      }
    }

    return () => {
      // Save scroll position on unmount
      if (restorePosition && Platform.OS === 'web') {
        window.sessionStorage?.setItem(
          `${ScrollingConfig.SCROLL_POSITION_STORAGE_KEY}_${screenKey}`,
          String(scrollPosition)
        );
      }
    };
  }, [screenKey, restorePosition, scrollPosition]);

  // Handle scroll events
  const handleScroll = (event) => {
    const currentY = Platform.OS === 'web'
      ? window.pageYOffset || document.documentElement.scrollTop
      : event.nativeEvent.contentOffset.y;

    setScrollPosition(currentY);
    setCanScrollUp(currentY > 0);

    if (onScroll) {
      onScroll(currentY);
    }
  };

  // Scroll to top
  const scrollToTop = (animated = true) => {
    if (Platform.OS === 'web') {
      window.scrollTo({
        top: 0,
        behavior: animated ? 'smooth' : 'auto',
      });
    } else if (scrollViewRef.current?.scrollTo) {
      scrollViewRef.current.scrollTo({
        y: 0,
        animated,
      });
    }
  };

  // Scroll to position
  const scrollToPosition = (position, animated = true) => {
    if (Platform.OS === 'web') {
      window.scrollTo({
        top: position,
        behavior: animated ? 'smooth' : 'auto',
      });
    } else if (scrollViewRef.current?.scrollTo) {
      scrollViewRef.current.scrollTo({
        y: position,
        animated,
      });
    }
  };

  // Scroll to element (web only)
  const scrollToElement = (elementId, animated = true) => {
    if (Platform.OS === 'web') {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({
          behavior: animated ? 'smooth' : 'auto',
          block: 'nearest',
        });
      }
    }
  };

  // Get current scroll position
  const getCurrentPosition = () => scrollPosition;

  // Check if at top
  const isAtTop = () => scrollPosition === 0;

  // Check if scrolling
  const handleScrollBeginDrag = () => setIsScrolling(true);
  const handleScrollEndDrag = () => setIsScrolling(false);
  const handleMomentumScrollBegin = () => setIsScrolling(true);
  const handleMomentumScrollEnd = () => setIsScrolling(false);

  return {
    scrollViewRef,
    scrollPosition,
    isScrolling,
    canScrollUp,
    scrollToTop,
    scrollToPosition,
    scrollToElement,
    getCurrentPosition,
    isAtTop,
    handleScroll,
    handleScrollBeginDrag,
    handleScrollEndDrag,
    handleMomentumScrollBegin,
    handleMomentumScrollEnd,
  };
};

export default useScrolling;
