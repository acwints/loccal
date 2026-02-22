export interface CityTheme {
  icon?: string;
  background?: string;
  textColor?: string;
}

export interface LoccalSettings {
  homeLocation: string;
  cityThemeOverrides: Record<string, CityTheme>;
}

export const LOCCAL_SETTINGS_STORAGE_KEY = "loccal.settings.v1";

export const DEFAULT_LOCCAL_SETTINGS: LoccalSettings = {
  homeLocation: "",
  cityThemeOverrides: {}
};

export const DEFAULT_CITY_THEMES: Record<string, Required<CityTheme>> = {
  "san francisco, ca": {
    icon: "🌉",
    background: "linear-gradient(145deg, #ede9fe, #ddd6fe)",
    textColor: "#3b0764"
  },
  "new york, ny": {
    icon: "🗽",
    background: "linear-gradient(145deg, #e0e7ff, #c7d2fe)",
    textColor: "#1e1b4b"
  },
  "los angeles, ca": {
    icon: "🌴",
    background: "linear-gradient(145deg, #fce7f3, #f5d0fe)",
    textColor: "#4a044e"
  },
  "chicago, il": {
    icon: "🏙️",
    background: "linear-gradient(145deg, #e2e8f0, #cbd5e1)",
    textColor: "#1e293b"
  },
  "seattle, wa": {
    icon: "☕",
    background: "linear-gradient(145deg, #d1fae5, #a7f3d0)",
    textColor: "#064e3b"
  },
  "miami, fl": {
    icon: "🌴",
    background: "linear-gradient(145deg, #cffafe, #a5f3fc)",
    textColor: "#164e63"
  },
  "austin, tx": {
    icon: "🎸",
    background: "linear-gradient(145deg, #fef3c7, #fde68a)",
    textColor: "#78350f"
  },
  "london, uk": {
    icon: "🏰",
    background: "linear-gradient(145deg, #e8e4f0, #d4cde6)",
    textColor: "#2e1065"
  },
  "paris, france": {
    icon: "🗼",
    background: "linear-gradient(145deg, #ffe4e6, #fecdd3)",
    textColor: "#4c0519"
  },
  "tokyo, japan": {
    icon: "🗼",
    background: "linear-gradient(145deg, #ede9fe, #c4b5fd)",
    textColor: "#2e1065"
  }
};

export const HOME_THEME: Required<CityTheme> = {
  icon: "🏡",
  background: "linear-gradient(145deg, #f0ebff, #e4dbff)",
  textColor: "#3b0764"
};

export function normalizeCityKey(cityLabel: string) {
  return cityLabel.trim().replace(/\s+/g, " ").toLowerCase();
}

export function toCityStateLabel(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return location.trim();
}

export function getCityTheme(
  cityLabel: string,
  settings: LoccalSettings,
  isHomeFallback = false
): Required<CityTheme> {
  const normalized = normalizeCityKey(cityLabel);
  const defaultTheme = DEFAULT_CITY_THEMES[normalized];
  const override = settings.cityThemeOverrides[normalized];

  if (isHomeFallback) {
    return {
      ...HOME_THEME,
      ...settings.cityThemeOverrides.home,
      // When home is set to a known city, use that city's icon.
      icon: override?.icon ?? defaultTheme?.icon ?? settings.cityThemeOverrides.home?.icon ?? HOME_THEME.icon
    };
  }

  return {
    icon: override?.icon ?? defaultTheme?.icon ?? "📍",
    background:
      override?.background ??
      defaultTheme?.background ??
      "linear-gradient(145deg, #f0ecf9, #e4ddf3)",
    textColor: override?.textColor ?? defaultTheme?.textColor ?? "#1e1b4b"
  };
}

export function sanitizeSettings(input: unknown): LoccalSettings {
  if (!input || typeof input !== "object") return DEFAULT_LOCCAL_SETTINGS;

  const candidate = input as Partial<LoccalSettings>;
  const homeLocation =
    typeof candidate.homeLocation === "string" ? candidate.homeLocation.slice(0, 120) : "";
  const overridesInput = candidate.cityThemeOverrides;
  const cityThemeOverrides: Record<string, CityTheme> = {};

  if (overridesInput && typeof overridesInput === "object") {
    for (const [rawKey, rawTheme] of Object.entries(overridesInput)) {
      const key = normalizeCityKey(rawKey);
      if (!key) continue;
      if (!rawTheme || typeof rawTheme !== "object") continue;

      const themeCandidate = rawTheme as CityTheme;
      cityThemeOverrides[key] = {
        icon: typeof themeCandidate.icon === "string" ? themeCandidate.icon.slice(0, 8) : undefined,
        background:
          typeof themeCandidate.background === "string"
            ? themeCandidate.background.slice(0, 180)
            : undefined,
        textColor:
          typeof themeCandidate.textColor === "string"
            ? themeCandidate.textColor.slice(0, 24)
            : undefined
      };
    }
  }

  return {
    homeLocation,
    cityThemeOverrides
  };
}
