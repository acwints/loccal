export function initialsFromName(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "");
    return parts.join("") || "U";
  }
  return email?.[0]?.toUpperCase() ?? "U";
}

export function titleCaseKey(normalized: string): string {
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
