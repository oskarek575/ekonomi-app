export function parseMoneyToOre(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized || !/^-?\d+(\.\d{0,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || Math.abs(amount) > 1_000_000_000) return null;

  return Math.round(amount * 100);
}

export function formatOre(amountOre: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: amountOre % 100 === 0 ? 0 : 2,
  }).format(amountOre / 100);
}

export function multiplyBasisPoints(amountOre: number, basisPoints: number): number {
  return Math.round((amountOre * basisPoints) / 10_000);
}

