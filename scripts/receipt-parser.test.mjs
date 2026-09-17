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
      merchant: "ICA KVANTUM MALMÖ",
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

    assert.equal(result.merchant, "WILLYS");
    assert.equal(result.total, 1249);
    assert.equal(result.date, "2026-08-05");
  });

  it("uses the selected date and leaves total empty when OCR is incomplete", () => {
    const result = parseReceiptText("COOP\nTack för ditt köp", "2026-09-18");

    assert.equal(result.merchant, "COOP");
    assert.equal(result.total, null);
    assert.equal(result.date, "2026-09-18");
  });
});
