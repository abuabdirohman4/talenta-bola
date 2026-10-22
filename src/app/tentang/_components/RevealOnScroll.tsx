"use client";

import { useEffect } from "react";

// Elemen [data-reveal] naik + muncul saat masuk layar (pola LP Better Planner); tanpa JS, isi tetap terlihat.
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    root.setAttribute("data-reveal-ready", "");
    return () => {
      io.disconnect();
      root.removeAttribute("data-reveal-ready");
    };
  }, []);

  return null;
}
