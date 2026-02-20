"use client";

import { useMemo, useState } from "react";

import { CitySearchInput } from "@/components/city-search-input";
import { EmojiPicker } from "@/components/emoji-picker";
import { GradientPicker } from "@/components/gradient-picker";
import { useLoccalSettings } from "@/lib/use-loccal-settings";
import {
  DEFAULT_CITY_THEMES,
  normalizeCityKey,
  toCityStateLabel
} from "@/lib/user-settings";

function titleCaseKey(normalized: string) {
  return normalized
    .split(",")
    .map((segment) =>
      segment
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    )
    .join(", ");
}

export function SettingsScreen() {
  const { ready, settings, setHomeLocation, upsertCityTheme, removeCityTheme, resetAll } =
    useLoccalSettings();
  const [cityLabelInput, setCityLabelInput] = useState("");
  const [iconInput, setIconInput] = useState("📍");
  const [backgroundInput, setBackgroundInput] = useState("linear-gradient(145deg, #f7f2e4, #ece4d1)");
  const [textColorInput, setTextColorInput] = useState("#1d3a27");

  const sortedOverrides = useMemo(
    () => Object.entries(settings.cityThemeOverrides).sort(([a], [b]) => a.localeCompare(b)),
    [settings.cityThemeOverrides]
  );

  function saveOverride() {
    const normalized = normalizeCityKey(toCityStateLabel(cityLabelInput));
    if (!normalized) return;

    upsertCityTheme(normalized, {
      icon: iconInput.trim() || undefined,
      background: backgroundInput.trim() || undefined,
      textColor: textColorInput.trim() || undefined
    });

    setCityLabelInput("");
  }

  return (
    <main className="page-shell settings-shell">
      <section className="settings-hero">
        <p className="eyebrow">Preferences</p>
        <h1>Settings</h1>
        <p>
          Customize day-cell visuals by city and set a default home location for days with no
          inferred travel.
        </p>
      </section>

      {!ready ? <p className="status">Loading settings…</p> : null}

      <section className="settings-card">
        <h2>Home Location</h2>
        <p className="settings-help">Used when a day has no inferred city.</p>
        <div className="settings-row">
          <CitySearchInput
            value={settings.homeLocation}
            onChange={setHomeLocation}
            placeholder="San Francisco, CA"
          />
        </div>
      </section>

      <section className="settings-card">
        <h2>City Theme Overrides</h2>
        <p className="settings-help">
          Override default city visuals. Enter city/state (for example, `San Francisco, CA`).
        </p>

        <div className="settings-grid">
          <input
            className="settings-input"
            type="text"
            placeholder="City, ST"
            value={cityLabelInput}
            onChange={(event) => setCityLabelInput(event.target.value)}
          />
          <EmojiPicker value={iconInput} onChange={setIconInput} />
          <GradientPicker value={backgroundInput} onChange={setBackgroundInput} />
          <div className="color-picker-wrap">
            <label className="color-picker-label">Text color</label>
            <input
              type="color"
              value={textColorInput}
              onChange={(e) => setTextColorInput(e.target.value)}
            />
          </div>
        </div>

        <div
          className="theme-preview-card"
          style={{ background: backgroundInput, color: textColorInput }}
        >
          <div className="day-cell-head">
            <div className="day-label">15</div>
            {iconInput ? <span className="day-icon">{iconInput}</span> : null}
          </div>
          <div className="city-list">
            <span className="city-pill">
              {cityLabelInput || "City, ST"}
            </span>
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="primary-btn" onClick={saveOverride}>
            Save override
          </button>
          <button type="button" className="ghost-btn" onClick={resetAll}>
            Reset all settings
          </button>
        </div>

        {sortedOverrides.length === 0 ? (
          <p className="settings-help">No custom overrides yet.</p>
        ) : (
          <ul className="override-list">
            {sortedOverrides.map(([cityKey, override]) => (
              <li key={cityKey} className="override-item">
                <div>
                  <p className="override-city">{titleCaseKey(cityKey)}</p>
                  <p className="override-meta">
                    {override.icon ? `Icon: ${override.icon}` : "Icon: default"} ·{" "}
                    {override.textColor ? `Text: ${override.textColor}` : "Text: default"}
                  </p>
                </div>
                <button type="button" className="ghost-btn" onClick={() => removeCityTheme(cityKey)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="settings-card">
        <h2>Default City Themes</h2>
        <p className="settings-help">Built-in visuals for major cities.</p>
        <div className="default-theme-grid">
          {Object.entries(DEFAULT_CITY_THEMES)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cityKey, theme]) => (
              <article
                key={cityKey}
                className="default-theme-item"
                style={{
                  background: theme.background,
                  color: theme.textColor
                }}
              >
                <span className="default-theme-icon">{theme.icon}</span>
                <span>{titleCaseKey(cityKey)}</span>
              </article>
            ))}
        </div>
      </section>
    </main>
  );
}
