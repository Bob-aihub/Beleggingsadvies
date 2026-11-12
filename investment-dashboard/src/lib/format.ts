const EUR = "EUR";

export function fmtEur(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "onbekend";
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: EUR,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "onbekend";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "onbekend";
  return new Intl.NumberFormat("nl-BE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "onbekend";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "onbekend";
  return new Intl.DateTimeFormat("nl-BE", { dateStyle: "long" }).format(d);
}

export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "onbekend";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "onbekend";
  return new Intl.DateTimeFormat("nl-BE", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export function fmtSignedEur(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "onbekend";
  return (value >= 0 ? "+" : "") + fmtEur(value, digits);
}
