import { useState, useEffect } from "react";

/**
 * Smart Navbar scroll hook (LeetCode style hide-on-scroll-down, reveal-on-scroll-up).
 * 
 * @param {Object} options
 * @param {number} [options.threshold=8] Minimum scroll delta in pixels to trigger state change.
 * @param {number} [options.topOffset=50] Distance from top in pixels where navbar is always visible.
 * @param {boolean} [options.isPinned=false] Override to force navbar visible (e.g. drawer/dropdown open).
 * @returns {{ isVisible: boolean, isScrolled: boolean, isMounted: boolean }}
 */
export function useSmartNavbar({ threshold = 8, topOffset = 50, isPinned = false } = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(() => {
    if (typeof window !== "undefined") {
      return window.scrollY > topOffset;
    }
    return false;
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined") return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const nextScrolled = currentScrollY > topOffset;

      setIsScrolled((prev) => (prev !== nextScrolled ? nextScrolled : prev));

      if (isPinned) {
        setIsVisible((prev) => (!prev ? true : prev));
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      // Always visible near top of page
      if (currentScrollY <= topOffset) {
        setIsVisible((prev) => (!prev ? true : prev));
      } else {
        const diff = currentScrollY - lastScrollY;

        // Scrolling DOWN -> hide navbar (LeetCode pattern)
        if (diff > threshold) {
          setIsVisible((prev) => (prev ? false : prev));
        }
        // Scrolling UP -> show navbar
        else if (diff < -threshold) {
          setIsVisible((prev) => (!prev ? true : prev));
        }
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    
    // Check initial scroll state
    setIsScrolled(window.scrollY > topOffset);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold, topOffset, isPinned]);

  return { isVisible: isPinned ? true : isVisible, isScrolled, isMounted };
}

export default useSmartNavbar;
