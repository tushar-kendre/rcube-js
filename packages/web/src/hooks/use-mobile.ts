import * as React from "react";

// Breakpoint for mobile detection (768px and below)
const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect mobile viewport sizes
 *
 * Uses media query matching to determine if the current viewport
 * is below the mobile breakpoint (768px). Automatically updates
 * when the window is resized.
 *
 * @returns boolean indicating if the current viewport is mobile-sized
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    // Create media query for mobile breakpoint
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    /**
     * Handler for media query changes
     */
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set up event listener for viewport changes
    mql.addEventListener("change", onChange);

    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Cleanup event listener on unmount
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
