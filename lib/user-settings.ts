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
    background: "linear-gradient(145deg, #f8eecf, #f2d7a6)",
    textColor: "#1f3f2a"
  },
  "new york, ny": {
    icon: "🗽",
    background: "linear-gradient(145deg, #dde7f5, #c5d4ea)",
    textColor: "#1d3047"
  },
  "los angeles, ca": {
    icon: "🌴",
    background: "linear-gradient(145deg, #fde7c7, #ffd2a1)",
    textColor: "#4b2f1e"
  },
  "chicago, il": {
    icon: "🏙️",
    background: "linear-gradient(145deg, #e7ecf1, #d1d8e0)",
    textColor: "#243447"
  },
  "seattle, wa": {
    icon: "☕",
    background: "linear-gradient(145deg, #e1efe9, #c8ddd4)",
    textColor: "#1f4f44"
  },
  "miami, fl": {
    icon: "🌴",
    background: "linear-gradient(145deg, #d8f4f0, #bfece6)",
    textColor: "#0f4c47"
  },
  "austin, tx": {
    icon: "🎸",
    background: "linear-gradient(145deg, #f8ead6, #f1d9b9)",
    textColor: "#4a3117"
  },
  "london, uk": {
    icon: "🏰",
    background: "linear-gradient(145deg, #e9e6f6, #d9d3ef)",
    textColor: "#2f2951"
  },
  "paris, france": {
    icon: "🗼",
    background: "linear-gradient(145deg, #f8e2e6, #f1ccd3)",
    textColor: "#5a2834"
  },
  "tokyo, japan": {
    icon: "🗼",
    background: "linear-gradient(145deg, #f0e6ff, #e0d3ff)",
    textColor: "#3a2469"
  }
};

export const HOME_THEME: Required<CityTheme> = {
  icon: "🏡",
  background: "linear-gradient(145deg, #e8f3e6, #d9e9d6)",
  textColor: "#1e4a2b"
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
      "linear-gradient(145deg, #f7f2e4, #ece4d1)",
    textColor: override?.textColor ?? defaultTheme?.textColor ?? "#1d3a27"
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
