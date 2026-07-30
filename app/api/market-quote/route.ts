import { NextResponse } from "next/server";

function normalizeStooqSymbol(symbol: string) {
  const trimmed = symbol.trim().toLowerCase();

  if (!trimmed) return "";

  return trimmed
    .replace(".sto", ".st")
    .replace(".stockholm", ".st")
    .replace(/\s+/g, "");
}

function parseStooqCsv(csv: string) {
  const [, row] = csv.trim().split(/\r?\n/);
  if (!row) return null;

  const [symbol, date, time, open, high, low, close, volume] = row.split(",");
  const price = Number(close);

  if (!Number.isFinite(price) || close === "N/D") {
    return null;
  }

  return {
    symbol,
    price,
    currency: "SEK",
    source: "Stooq",
    delayed: true,
    updatedAt: date && time ? `${date}T${time}` : new Date().toISOString(),
    open: Number(open),
    high: Number(high),
    low: Number(low),
    volume: Number(volume),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSymbol = searchParams.get("symbol") ?? "";
  const symbol = normalizeStooqSymbol(rawSymbol);

  if (!symbol) {
    return NextResponse.json(
      { error: "Saknar symbol." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`,
      { next: { revalidate: 900 } }
    );

    if (!response.ok) {
      throw new Error(`Market data failed: ${response.status}`);
    }

    const quote = parseStooqCsv(await response.text());

    if (!quote) {
      return NextResponse.json(
        { error: "Kunde inte hitta kursen. Testa t.ex. inve-b.st eller skriv kursen manuellt." },
        { status: 404 }
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Kursdata kunde inte hämtas just nu." },
      { status: 502 }
    );
  }
}
