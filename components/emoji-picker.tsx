"use client";

import { useEffect, useRef, useState } from "react";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "City",
    emojis: [
      "🏙️", "🌆", "🌇", "🏛️", "🏢", "🏗️", "🏠", "🏡",
      "🏘️", "🏰", "🏯", "🗽", "🗼", "⛪", "🕌", "🕍"
    ]
  },
  {
    label: "Travel",
    emojis: [
      "✈️", "🚗", "🚆", "🚢", "🚁", "🛳️", "🚂", "🚌",
      "🛫", "🛬", "📍", "🧭", "🗺️", "🧳", "🎒", "🏨"
    ]
  },
  {
    label: "Nature",
    emojis: [
      "🌴", "🏔️", "🌊", "🏖️", "🌿", "🌸", "🍂", "❄️",
      "☀️", "🌙", "⭐", "🌈", "🌺", "🌲", "🏝️", "🌾"
    ]
  },
  {
    label: "Fun",
    emojis: [
      "🎭", "🎪", "🎡", "🎢", "⛱️", "🎶", "🍕", "🍜",
      "☕", "🍷", "🎉", "❤️", "💎", "🔥", "🐻", "🦅"
    ]
  }
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div className="emoji-picker-wrap" ref={wrapRef}>
      <button
        type="button"
        className="emoji-picker-btn"
        onClick={() => setOpen(!open)}
        aria-label="Pick emoji"
      >
        <span className="emoji-picker-current">{value || "📍"}</span>
        <span className="emoji-picker-caret">▾</span>
      </button>
      {open && (
        <div className="emoji-picker-dropdown">
          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <div className="emoji-picker-cat">{cat.label}</div>
              <div className="emoji-picker-grid">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-picker-item${emoji === value ? " active" : ""}`}
                    onClick={() => {
                      onChange(emoji);
                      setOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
