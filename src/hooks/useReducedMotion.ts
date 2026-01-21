"use client";
import { useState, useEffect } from "react";

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}
