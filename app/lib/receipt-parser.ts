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

const merchantNoise = /\b(kvitto|org\.?\s*nr|moms|kassa|terminal|telefon|tel\.?|datum|tid|summa|totalt?|att betala|kort|godkänd|tack|öppet köp|kund|artikel|rabatt|växel|betalsätt|kontant|bankomat|visa|mastercard)\b/i;
const addressNoise = /\b(gatan|vägen|gränd|torget|centrum|box|postnummer|postnr)\b/i;

const knownMerchants = [
  { name: "ICA Maxi", pattern: /\b[i1l]\s*c\s*a\s+maxi\b/i, priority: 30 },
  { name: "ICA Kvantum", pattern: /\b[i1l]\s*c\s*a\s+kvantum\b/i, priority: 30 },
  { name: "ICA Supermarket", pattern: /\b[i1l]\s*c\s*a\s+supermarket\b/i, priority: 30 },
  { name: "ICA Nära", pattern: /\b[i1l]\s*c\s*a\s+n[äa]ra\b/i, priority: 30 },
  { name: "Stora Coop", pattern: /\bstora\s+co+o*p\b/i, priority: 30 },
  { name: "Willys Hemma", pattern: /\bwillys\s+hemma\b/i, priority: 30 },
  { name: "Apotek Hjärtat", pattern: /\bapotek(?:et)?\s+hj[äa]rtat\b/i, priority: 25 },
  { name: "Kronans Apotek", pattern: /\bkronans\s+apotek\b/i, priority: 25 },
  { name: "Kjell & Company", pattern: /\bkjell\s*(?:&|och)\s*company\b/i, priority: 25 },
  { name: "Clas Ohlson", pattern: /\bclas\s+ohlson\b/i, priority: 25 },
  { name: "City Gross", pattern: /\bcity\s+gross\b/i, priority: 25 },
  { name: "Burger King", pattern: /\bburger\s+king\b/i, priority: 25 },
  { name: "Circle K", pattern: /\bcircle\s+k\b/i, priority: 25 },
  { name: "7-Eleven", pattern: /\b7[\s-]*eleven\b/i, priority: 25 },
  { name: "Systembolaget", pattern: /\bsystembolaget\b/i, priority: 20 },
  { name: "Pressbyrån", pattern: /\bpressbyr[åa]n\b/i, priority: 20 },
  { name: "McDonald's", pattern: /\bmcdonald'?s\b/i, priority: 20 },
  { name: "Hemköp", pattern: /\bhemk[öo]p\b/i, priority: 20 },
  { name: "Willys", pattern: /\bwillys\b/i, priority: 20 },
  { name: "Coop", pattern: /\bco+o*p\b/i, priority: 20 },
  { name: "Lidl", pattern: /\blidl\b/i, priority: 20 },
  { name: "Apoteket", pattern: /\bapoteket\b/i, priority: 20 },
  { name: "Biltema", pattern: /\bbiltema\b/i, priority: 20 },
  { name: "Rusta", pattern: /\brusta\b/i, priority: 20 },
  { name: "Jula", pattern: /\bjula\b/i, priority: 20 },
  { name: "Normal", pattern: /\bnormal\b/i, priority: 20 },
  { name: "IKEA", pattern: /\bikea\b/i, priority: 20 },
  { name: "ÖoB", pattern: /\b[öo]o\s*&?\s*b\b/i, priority: 20 },
  { name: "OKQ8", pattern: /\bok\s*q8\b/i, priority: 20 },
  { name: "Preem", pattern: /\bpreem\b/i, priority: 20 },
  { name: "Ingo", pattern: /\bingo\b/i, priority: 20 },
  { name: "St1", pattern: /\bst\s*1\b/i, priority: 20 },
  { name: "ICA", pattern: /\b[i1l]\s*c\s*a\b/i, priority: 10 },
] as const;

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

function findKnownMerchant(lines: string[]) {
  const matches: { name: string; score: number }[] = [];

  lines.slice(0, 15).forEach((line, lineIndex) => {
    knownMerchants.forEach((merchant) => {
      if (merchant.pattern.test(line)) {
        matches.push({
          name: merchant.name,
          score: merchant.priority - lineIndex,
        });
      }
    });
  });

  return matches.sort((a, b) => b.score - a.score)[0]?.name ?? "";
}

function merchantCandidateScore(line: string, index: number, nextLine: string) {
  const merchant = cleanMerchant(line);
  const letters = merchant.match(/[A-Za-zÅÄÖåäöÉéÜü]/g)?.length ?? 0;
  const originalCharacters = line.replace(/\s/g, "").length;
  const letterRatio = originalCharacters ? letters / originalCharacters : 0;

  if (
    merchant.length < 3 ||
    merchant.length > 50 ||
    letters < 3 ||
    letterRatio < 0.55 ||
    merchantNoise.test(line) ||
    addressNoise.test(line) ||
    /(?:https?:\/\/|www\.|@|\b\d{3}\s?\d{2}\b)/i.test(line) ||
    amountsInLine(line).length > 0
  ) {
    return null;
  }

  let score = 40 - index * 3;
  if (/\b(?:ab|hb|butik)\b/i.test(merchant)) score += 10;
  if (/org\.?\s*nr/i.test(nextLine)) score += 25;
  if (/^[A-ZÅÄÖÉÜ0-9 &'’.-]+$/.test(line)) score += 5;
  if (merchant.split(" ").length <= 5) score += 3;

  return { merchant, score };
}

function findMerchant(lines: string[]) {
  const knownMerchant = findKnownMerchant(lines);
  if (knownMerchant) return knownMerchant;

  const candidates = lines
    .slice(0, 12)
    .map((line, index) => merchantCandidateScore(line, index, lines[index + 1] ?? ""))
    .filter((candidate): candidate is { merchant: string; score: number } => candidate !== null)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.merchant ?? "";
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
