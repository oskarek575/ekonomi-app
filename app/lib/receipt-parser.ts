export type ParsedReceipt = {
  merchant: string;
  total: number | null;
  date: string;
};

const totalKeywords = [
  { pattern: /att\s+betala/i, score: 50 },
  { pattern: /kortbelopp/i, score: 45 },
  { pattern: /totalt?/i, score: 40 },
  { pattern: /summa/i, score: 35 },
  { pattern: /belopp/i, score: 25 },
];

const merchantNoise = /\b(kvitto|org\.?\s*nr|moms|kassa|terminal|butik|telefon|tel\.?|datum|tid|summa|totalt?|att betala|kort|godkänd|tack för|öppet köp)\b/i;

function validIsoDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function findReceiptDate(text: string, fallbackDate: string) {
  const yearFirst = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (yearFirst) {
    return validIsoDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3])) ?? fallbackDate;
  }

  const compact = text.match(/\b(20\d{2})(\d{2})(\d{2})\b/);
  if (compact) {
    return validIsoDate(Number(compact[1]), Number(compact[2]), Number(compact[3])) ?? fallbackDate;
  }

  const dayFirst = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/);
  if (dayFirst) {
    const shortYear = Number(dayFirst[3]);
    const year = shortYear < 100 ? 2000 + shortYear : shortYear;
    return validIsoDate(year, Number(dayFirst[2]), Number(dayFirst[1])) ?? fallbackDate;
  }

  return fallbackDate;
}

function parseAmount(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const amount = Number(normalized);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function amountsInLine(line: string) {
  const matches = line.match(/\d{1,3}(?:[ .]\d{3})*[,.]\d{2}|\d+[,.]\d{2}/g) ?? [];

  return matches
    .map(parseAmount)
    .filter((amount): amount is number => amount !== null);
}

function findReceiptTotal(lines: string[]) {
  const candidates: { amount: number; score: number }[] = [];

  lines.forEach((line, index) => {
    const amounts = amountsInLine(line);
    if (!amounts.length) return;

    const keyword = totalKeywords.find(({ pattern }) => pattern.test(line));
    const hasCurrency = /\bkr\b|sek/i.test(line);
    if (!keyword && !hasCurrency) return;

    amounts.forEach((amount) => {
      candidates.push({
        amount,
        score: (keyword?.score ?? 10) + index / Math.max(lines.length, 1),
      });
    });
  });

  return candidates.sort((a, b) => b.score - a.score || b.amount - a.amount)[0]?.amount ?? null;
}

function cleanMerchant(line: string) {
  return line
    .replace(/^välkommen\s+till\s+/i, "")
    .replace(/[^A-Za-zÅÄÖåäöÉéÜü&'. -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMerchant(lines: string[]) {
  for (const line of lines.slice(0, 10)) {
    const merchant = cleanMerchant(line);
    const letters = merchant.match(/[A-Za-zÅÄÖåäöÉéÜü]/g)?.length ?? 0;

    if (
      merchant.length >= 3 &&
      merchant.length <= 50 &&
      letters >= 3 &&
      !merchantNoise.test(merchant)
    ) {
      return merchant;
    }
  }

  return "";
}

export function parseReceiptText(text: string, fallbackDate: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return {
    merchant: findMerchant(lines),
    total: findReceiptTotal(lines),
    date: findReceiptDate(text, fallbackDate),
  };
}
