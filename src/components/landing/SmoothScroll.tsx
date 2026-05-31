"use client";

import { useEffect } from "react";

/**
 * Dependency-free, Lenis-style momentum smooth scroll for the landing page.
 *
 * Hijacks wheel input and eases the real window scroll position toward a target
 * with a per-frame lerp, producing the gliding "premium" feel. It stays out of
 * the way where native scrolling is already good or expected:
 *   - touch / coarse-pointer devices keep native momentum scrolling
 *   - `prefers-reduced-motion: reduce` disables smoothing entirely
 *   - keyboard and scrollbar scrolling stay in sync via a resync guard
 *   - nested scroll areas (open modal, mobile menu) keep native scrolling
 *
 * Renders nothing; it only wires up listeners for its lifetime.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    // Leave native scrolling untouched on touch devices or when the user has
    // asked for reduced motion.
    if (reduceMotion || coarsePointer) {
      return;
    }

    const html = document.documentElement;
    // `scroll-smooth` (CSS scroll-behavior) on <html> would fight our own
    // programmatic scrollTo calls. Switch it off while we drive scrolling.
    const previousScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    // Smoothing factor per frame. Lower = longer, glassier glide.
    const LERP = 0.09;
    const STOP_THRESHOLD = 0.4;

    let target = window.scrollY;
    let current = target;
    let rafId = 0;
    // Rounded position we last wrote, so the scroll listener can tell our own
    // programmatic scroll apart from an external one (scrollbar / keyboard).
    let lastWrittenY = Math.round(current);

    const maxScroll = () => Math.max(0, html.scrollHeight - window.innerHeight);
    const clamp = (value: number) => Math.min(Math.max(value, 0), maxScroll());

    const loop = () => {
      current += (target - current) * LERP;

      if (Math.abs(target - current) <= STOP_THRESHOLD) {
        current = target;
        lastWrittenY = Math.round(current);
        window.scrollTo(0, current);
        rafId = 0;
        return;
      }

      lastWrittenY = Math.round(current);
      window.scrollTo(0, current);
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (rafId === 0) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const stop = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const onWheel = (event: WheelEvent) => {
      // Let the browser handle pinch-zoom and any nested scrollable region
      // (open modal, mobile menu) instead of stealing the gesture.
      if (event.ctrlKey) {
        return;
      }
      const node = event.target as HTMLElement | null;
      if (
        node?.closest(
          "[data-native-scroll], .lead-modal-backdrop, .mobile-menu.is-active",
        )
      ) {
        return;
      }

      event.preventDefault();

      let delta = event.deltaY;
      if (event.deltaMode === 1) {
        delta *= 16; // lines -> approximate pixels
      } else if (event.deltaMode === 2) {
        delta *= window.innerHeight; // pages -> pixels
      }

      target = clamp(target + delta);
      start();
    };

    const onScroll = () => {
      // Ignore the scroll events our own scrollTo produces.
      if (Math.round(window.scrollY) === lastWrittenY) {
        return;
      }
      // External scroll (scrollbar drag, keyboard, find-in-page): resync and
      // let it land where the browser put it.
      stop();
      target = window.scrollY;
      current = window.scrollY;
      lastWrittenY = Math.round(current);
    };

    const onAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) {
        return;
      }
      const el = document.getElementById(id);
      if (!el) {
        return;
      }
      event.preventDefault();
      target = clamp(el.getBoundingClientRect().top + window.scrollY);
      start();
    };

    const onResize = () => {
      target = clamp(target);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("click", onAnchorClick);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", onAnchorClick);
      stop();
      html.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  return null;
}
