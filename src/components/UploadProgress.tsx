"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  active: boolean;
}

export default function UploadProgress({ active }: Props) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setProgress(0);
      let current = 0;
      intervalRef.current = setInterval(() => {
        // Fast at start, slows down as it approaches 90%
        const remaining = 90 - current;
        const increment = Math.max(0.3, remaining * 0.04);
        current = Math.min(90, current + increment);
        setProgress(Math.round(current));
      }, 150);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (progress > 0) {
        // Jump to 100% on completion
        setProgress(100);
        const timeout = setTimeout(() => setProgress(0), 600);
        return () => clearTimeout(timeout);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (progress === 0 && !active) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">
          {progress < 100 ? "Processing file..." : "Complete!"}
        </p>
        <p className="text-xs font-medium text-gray-700">{progress}%</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-300 ease-out ${
            progress < 100
              ? "bg-gradient-to-r from-blue-600 to-blue-400"
              : "bg-green-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
