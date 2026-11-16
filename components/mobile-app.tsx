"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function MobileApp() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) document.documentElement.dataset.native = "true";
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Loccal offline support could not start", error);
      });
    }
  }, []);

  return null;
}
