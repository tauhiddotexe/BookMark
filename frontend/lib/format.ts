export function formatStars(value: number | string) {
  const rating = typeof value === "string" ? Number(value) : value;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return `${"★".repeat(full)}${half ? "½" : ""}${"·".repeat(Math.max(0, 5 - full - half))}`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
