"use client";

function parseGradient(value: string): [string, string] {
  const match = value.match(/#[0-9a-fA-F]{3,8}/g);
  if (match && match.length >= 2) return [match[0], match[1]];
  if (match && match.length === 1) return [match[0], match[0]];
  return ["#f7f2e4", "#ece4d1"];
}

function toGradientCSS(c1: string, c2: string) {
  return `linear-gradient(145deg, ${c1}, ${c2})`;
}

interface GradientPickerProps {
  value: string;
  onChange: (gradient: string) => void;
}

export function GradientPicker({ value, onChange }: GradientPickerProps) {
  const [color1, color2] = parseGradient(value);

  function handleChange(idx: 0 | 1, hex: string) {
    const next: [string, string] = idx === 0 ? [hex, color2] : [color1, hex];
    onChange(toGradientCSS(next[0], next[1]));
  }

  return (
    <div className="gradient-picker-row">
      <div className="color-picker-wrap">
        <label className="color-picker-label">Stop 1</label>
        <input
          type="color"
          value={color1}
          onChange={(e) => handleChange(0, e.target.value)}
        />
      </div>
      <div
        className="gradient-swatch"
        style={{ background: toGradientCSS(color1, color2) }}
      />
      <div className="color-picker-wrap">
        <label className="color-picker-label">Stop 2</label>
        <input
          type="color"
          value={color2}
          onChange={(e) => handleChange(1, e.target.value)}
        />
      </div>
    </div>
  );
}
