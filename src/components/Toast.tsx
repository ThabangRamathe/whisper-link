"use client";

import React, { useEffect } from "react";

type ToastProps = {
  message: string | null;
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, onClose, duration = 2000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose(), duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className="fixed right-4 bottom-6 z-50 fade-in">
      <div className="max-w-xs rounded-md px-4 py-2 shadow-lg transition-opacity duration-200 opacity-100 bg-surface border border-border text-foreground">
        {message}
      </div>
    </div>
  );
}
