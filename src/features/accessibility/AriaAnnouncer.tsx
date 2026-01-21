"use client";
import { useEffect, useRef } from "react";

let announcer: ((message: string) => void) | null = null;

export function useAnnouncer() {
  const announceRef = useRef<string | null>(null);

  useEffect(() => {
    if (announcer) {
      announcer = (message: string) => {
        announceRef.current = message;
      };
    }
    return () => {
      if (announcer === announceRef) {
        announcer = null;
      }
    };
  }, []);

  return announceRef;
}

export function announce(message: string) {
  if (announcer) {
    announcer(message);
  }
}

export function AriaAnnouncer() {
  const announceRef = useRef<string | null>(null);

  useEffect(() => {
    announcer = (message: string) => {
      announceRef.current = message;
    };
    return () => {
      announcer = null;
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announceRef.current}
    </div>
  );
}
