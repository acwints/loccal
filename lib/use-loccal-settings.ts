"use client";

import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_LOCCAL_SETTINGS,
  LOCCAL_SETTINGS_STORAGE_KEY,
  sanitizeSettings,
  type LoccalSettings
} from "@/lib/user-settings";

export function useLoccalSettings() {
  const [settings, setSettings] = useState<LoccalSettings>(DEFAULT_LOCCAL_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCCAL_SETTINGS_STORAGE_KEY);
      if (!raw) {
        setReady(true);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setSettings(sanitizeSettings(parsed));
    } catch {
      setSettings(DEFAULT_LOCCAL_SETTINGS);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(LOCCAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings, ready]);

  const helpers = useMemo(
    () => ({
      setHomeLocation(value: string) {
        setSettings((current) => ({
          ...current,
          homeLocation: value
        }));
      },
      upsertCityTheme(cityLabel: string, update: { icon?: string; background?: string; textColor?: string }) {
        setSettings((current) => ({
          ...current,
          cityThemeOverrides: {
            ...current.cityThemeOverrides,
            [cityLabel]: {
              ...current.cityThemeOverrides[cityLabel],
              ...update
            }
          }
        }));
      },
      removeCityTheme(cityLabel: string) {
        setSettings((current) => {
          const next = { ...current.cityThemeOverrides };
          delete next[cityLabel];
          return {
            ...current,
            cityThemeOverrides: next
          };
        });
      },
      resetAll() {
        setSettings(DEFAULT_LOCCAL_SETTINGS);
      }
    }),
    []
  );

  return {
    settings,
    setSettings,
    ready,
    ...helpers
  };
}
