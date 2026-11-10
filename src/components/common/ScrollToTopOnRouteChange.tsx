/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Reusable utility hook & component to immediately restore scroll position to top (0, 0)
 * on route change, tab change, or browser back/forward navigation.
 * Uses instantaneous 'auto' behavior (zero delay) across window, document body/documentElement,
 * and internal scroll containers.
 */

import React, { useEffect } from 'react';

export interface ScrollToTopOptions {
  triggerKey: any;
  containerRefs?: (React.RefObject<HTMLElement | null> | React.MutableRefObject<HTMLElement | null>)[];
}

/**
 * Resets window, document, and container scroll positions to top (0,0) immediately.
 * Zero smooth-scroll delay; guaranteed instantaneous jump.
 */
export function resetScrollPosition(
  containerRefs: (React.RefObject<HTMLElement | null> | React.MutableRefObject<HTMLElement | null>)[] = []
) {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
  if (typeof document !== 'undefined') {
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }
  containerRefs.forEach(ref => {
    if (ref?.current) {
      ref.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      ref.current.scrollTop = 0;
    }
  });
}

/**
 * Custom React Hook to immediately restore scroll position to top on route or tab change
 * and on browser back/forward history navigation.
 */
export function useScrollToTopOnRouteChange(
  triggerKey: any,
  containerRefs: (React.RefObject<HTMLElement | null> | React.MutableRefObject<HTMLElement | null>)[] = []
) {
  useEffect(() => {
    // 1. Immediate reset
    resetScrollPosition(containerRefs);

    // 2. Also run in requestAnimationFrame after DOM has rendered the new route/tab contents
    const rafId = requestAnimationFrame(() => {
      resetScrollPosition(containerRefs);
    });

    return () => cancelAnimationFrame(rafId);
  }, [triggerKey, ...containerRefs]);
}

/**
 * Reusable component to declare in route/layout components
 */
export const ScrollToTopOnRouteChange: React.FC<ScrollToTopOptions> = ({
  triggerKey,
  containerRefs = []
}) => {
  useScrollToTopOnRouteChange(triggerKey, containerRefs);
  return null;
};
