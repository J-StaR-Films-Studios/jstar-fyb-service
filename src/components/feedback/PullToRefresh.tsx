"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  isPulling: boolean;
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
  children: React.ReactNode;
}

export function PullToRefresh({
  isPulling,
  pullDistance,
  pullProgress,
  isRefreshing,
  children,
}: PullToRefreshProps) {
  return (
    <div className="relative w-full">
      {(isPulling || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 transition-transform duration-100 ease-out"
          style={{
            transform: `translateY(${pullDistance > 80 ? 80 : pullDistance}px)`,
            opacity: pullProgress,
          }}
        >
          <div className="bg-dark/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-medium text-white">
                  Refreshing...
                </span>
              </>
            ) : (
              <>
                <Loader2
                  className={cn(
                    "w-4 h-4 text-primary transition-transform duration-100",
                    pullProgress >= 1 && "animate-spin",
                  )}
                  style={{ transform: `rotate(${pullProgress * 360}deg)` }}
                />
                <span className="text-xs font-medium text-white">
                  {pullProgress >= 1 ? "Release to refresh" : "Pull to refresh"}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
