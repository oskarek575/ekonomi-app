import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReceiptText } from "../app/lib/receipt-parser.ts";

describe("receipt parser", () => {
  it("extracts merchant, total and Swedish receipt date", () => {
    const result = parseReceiptText(`
      ICA KVANTUM MALMÖ
      Org.nr 556000-0000
      17.09.2026 18:42
      SUMMA 923,40
      ATT BETALA 842,50 SEK
    `, "2026-09-18");

    assert.deepEqual(result, {
      merchant: "ICA Kvantum",
      total: 842.5,
      date: "2026-09-17",
    });
  });

  it("supports year-first dates and dot thousand separators", () => {
    const result = parseReceiptText(`
      WILLYS
      Datum 2026-08-05
      TOTALT 1.249,00 kr
    `, "2026-09-18");

    assert.equal(result.merchant, "Willys");
    assert.equal(result.total, 1249);
    assert.equal(result.date, "2026-08-05");
  });

  it("uses the selected date and leaves total empty when OCR is incomplete", () => {
    const result = parseReceiptText("COOP\nTack för ditt köp", "2026-09-18");

    assert.equal(result.merchant, "Coop");
    assert.equal(result.total, null);
    assert.equal(result.date, "2026-09-18");
  });

  it("ignores noisy headings and prioritizes a known merchant", () => {
    const result = parseReceiptText(`
      # VÄLKOMMEN!
      ÖPPET ALLA DAGAR
      1 C A MAXI STORMARKNAD
      Kundkvitto
      TOTALT 349,50 kr
    `, "2026-09-18");

    assert.equal(result.merchant, "ICA Maxi");
  });

  it("finds an unknown merchant near the organisation number", () => {
    const result = parseReceiptText(`
      VÄLKOMMEN
      BAGERI SOLROSEN AB
      Org.nr 556123-4567
      Storgatan 4
      ATT BETALA 129,00 SEK
    `, "2026-09-18");

    assert.equal(result.merchant, "BAGERI SOLROSEN AB");
  });

  it("does not mistake an address or receipt label for the merchant", () => {
    const result = parseReceiptText(`
      KVITTO
      Storgatan 14
      Torgets Livs AB
      Org.nr 556123-4567
      SUMMA 89,90 kr
    `, "2026-09-18");

    assert.equal(result.merchant, "Torgets Livs AB");
  });
});
