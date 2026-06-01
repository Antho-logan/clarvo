"use client";

import { useEffect } from "react";

/**
 * Landing-only smooth anchor scrolling.
 *
 * Manual wheel/trackpad scrolling stays native because that is the most
 * responsive feel across devices. This component only improves in-page anchor
 * jumps from the nav so they glide instead of snapping.
 */
export function SmoothScroll() {
  useEffect(() => {
    const canMatchMedia = typeof window.matchMedia === "function";
    const reduceMotion =
      canMatchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      el.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    };

    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
    };
  }, []);

  return null;
}
