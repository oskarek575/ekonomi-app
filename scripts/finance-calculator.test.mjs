import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateFinanceSummary } from "../app/lib/finance-calculator.ts";

const month = "2026-07";
const today = new Date("2026-07-10T12:00:00");

function summary(overrides = {}) {
  return calculateFinanceSummary({
    month,
    today,
    transactions: [
      { id: "income", title: "Lön", category: "Lön", amount: 25_000, date: "2026-06-25", type: "income" },
      ...(overrides.transactions ?? []),
    ],
    budgets: overrides.budgets ?? [],
    subscriptions: overrides.subscriptions ?? [],
    savings: overrides.savings ?? [],
    travelBudgets: overrides.travelBudgets ?? [],
    openingBalance: overrides.openingBalance ?? 0,
  });
}

describe("finance calculator", () => {
  it("does not reduce free money for purchases that fit inside a budget", () => {
    const result = summary({
      budgets: [{ id: "food", category: "Mat", limit: 4_000 }],
      transactions: [
        { id: "ica", title: "ICA", category: "Mat", amount: 1_000, date: "2026-07-03", type: "expense", source: "budget" },
      ],
    });

    assert.equal(result.freeMoney, 21_000);
    assert.equal(result.budgetRows[0].remaining, 3_000);
  });

  it("keeps an unused budget fully reserved", () => {
    const result = summary({
      budgets: [{ id: "food", category: "Mat", limit: 4_000 }],
    });

    assert.equal(result.reservedRemaining, 4_000);
    assert.equal(result.expenses, 0);
    assert.equal(result.freeMoney, 21_000);
  });

  it("moves budget purchases from reserved remaining to expenses without reducing free money", () => {
    const result = summary({
      budgets: [{ id: "food", category: "Mat", limit: 4_000 }],
      transactions: [
        { id: "ica", title: "ICA", category: "Mat", amount: 1_000, date: "2026-07-03", type: "expense", source: "budget" },
      ],
    });

    assert.equal(result.reservedRemaining, 3_000);
    assert.equal(result.expenses, 1_000);
    assert.equal(result.freeMoney, 21_000);
  });

  it("reduces free money only by the overspend when a budget is exceeded", () => {
    const result = summary({
      budgets: [{ id: "food", category: "Mat", limit: 4_000 }],
      transactions: [
        { id: "ica", title: "ICA", category: "Mat", amount: 4_300, date: "2026-07-03", type: "expense", source: "budget" },
      ],
    });

    assert.equal(result.budgetOverspendTotal, 300);
    assert.equal(result.reservedRemaining, 0);
    assert.equal(result.freeMoney, 20_700);
  });

  it("reduces free money immediately for free purchases", () => {
    const result = summary({
      budgets: [{ id: "food", category: "Mat", limit: 4_000 }],
      transactions: [
        { id: "coffee", title: "Kaffe", category: "Fria köp", amount: 90, date: "2026-07-03", type: "expense", source: "free" },
      ],
    });

    assert.equal(result.freeMoney, 20_910);
  });

  it("includes free purchases in expenses and reduces free money", () => {
    const result = summary({
      transactions: [
        { id: "coffee", title: "Kaffe", category: "Fria köp", amount: 90, date: "2026-07-03", type: "expense", source: "free" },
      ],
    });

    assert.equal(result.expenses, 90);
    assert.equal(result.freeMoney, 24_910);
  });

  it("does not treat a savings account balance as a hidden period expense", () => {
    const result = summary({
      savings: [{ id: "savings", name: "Sparkonto", amount: 3_000, createdAt: "2026-07-03" }],
    });

    assert.equal(result.actualBalance, 25_000);
    assert.equal(result.savingsTotal, 3_000);
  });

  it("counts a savings transfer transaction once", () => {
    const result = summary({
      savings: [{ id: "savings", name: "Sparkonto", amount: 3_000, createdAt: "2026-07-03" }],
      transactions: [
        { id: "save", title: "Sparande till Sparkonto", category: "Sparkonto", amount: 3_000, date: "2026-07-03", type: "expense", source: "free" },
      ],
    });

    assert.equal(result.actualBalance, 22_000);
    assert.equal(result.freeMoney, 22_000);
  });

  it("does not mark a fixed expense as missing when it is linked by subscription id", () => {
    const result = summary({
      subscriptions: [
        { id: "spotify", name: "Spotify", plan: "Premium", amount: 129, day: 3, active: true },
      ],
      transactions: [
        { id: "spotify-transaction", title: "SPOTIFY AB", category: "Prenumerationer", amount: 129, date: "2026-07-03", type: "expense", source: "budget", subscriptionId: "spotify" },
      ],
    });

    assert.equal(result.fixedExpenseTotal, 129);
    assert.equal(result.fixedExpenseRemaining, 0);
    assert.equal(result.missingPostedFixedExpenses, 0);
    assert.equal(result.actualBalance, 24_871);
  });

  it("keeps an unpaid fixed expense in reserved remaining", () => {
    const result = summary({
      subscriptions: [
        { id: "rent", name: "Hyra", plan: "Boende", amount: 5_000, day: 15, active: true },
      ],
    });

    assert.equal(result.fixedExpenseTotal, 5_000);
    assert.equal(result.fixedExpenseRemaining, 5_000);
    assert.equal(result.reservedRemaining, 5_000);
    assert.equal(result.expenses, 0);
    assert.equal(result.freeMoney, 20_000);
  });

  it("removes a paid fixed expense from reserved remaining and counts it as an expense without reducing free money again", () => {
    const result = summary({
      subscriptions: [
        { id: "rent", name: "Hyra", plan: "Boende", amount: 5_000, day: 3, active: true },
      ],
      transactions: [
        { id: "rent-paid", title: "Hyra", category: "Prenumerationer", amount: 5_000, date: "2026-07-03", type: "expense", source: "budget", subscriptionId: "rent" },
      ],
    });

    assert.equal(result.fixedExpenseTotal, 5_000);
    assert.equal(result.fixedExpenseRemaining, 0);
    assert.equal(result.reservedRemaining, 0);
    assert.equal(result.expenses, 5_000);
    assert.equal(result.freeMoney, 20_000);
  });

  it("does not double count paid fixed expenses in actual balance", () => {
    const result = summary({
      subscriptions: [
        { id: "rent", name: "Hyra", plan: "Boende", amount: 5_000, day: 3, active: true },
      ],
      transactions: [
        { id: "rent-paid", title: "Hyra", category: "Prenumerationer", amount: 5_000, date: "2026-07-03", type: "expense", source: "budget", subscriptionId: "rent" },
      ],
    });

    assert.equal(result.expenses, 5_000);
    assert.equal(result.missingPostedFixedExpenses, 0);
    assert.equal(result.actualBalance, 20_000);
  });

  it("uses opening balance when calculating actual balance", () => {
    const result = summary({
      openingBalance: 1_500,
      transactions: [
        { id: "free", title: "Lunch", category: "Fria köp", amount: 200, date: "2026-07-03", type: "expense", source: "free" },
      ],
    });

    assert.equal(result.actualBalance, 26_300);
  });
});
