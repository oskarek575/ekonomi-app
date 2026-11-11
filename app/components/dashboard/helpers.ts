// Rena hjälpfunktioner för dashboarden (utbrutna ur Dashboard.tsx).

import type {
  TransactionType,
  PurchaseSource,
  SubscriptionFrequency,
  Transaction,
  Subscription,
  Goal,
  SavingsAccount,
  Loan,
  TravelBudget,
  AffordabilityResult,
  RemotePurchase,
} from "./types";
import {
  getCurrentFinancialMonth,
  getFinancialPeriod as calculateFinancialPeriod,
} from "../../lib/finance-calculator";

export const salaryDay = 25;

export const subscriptionFrequencies: { id: SubscriptionFrequency; label: string; months: number }[] = [
  { id: "monthly", label: "Varje månad", months: 1 },
  { id: "quarterly", label: "Varje kvartal", months: 3 },
  { id: "semiannual", label: "Varje halvår", months: 6 },
  { id: "yearly", label: "Varje år", months: 12 },
  { id: "custom", label: "Eget intervall", months: 1 },
];

export function kr(value: number) {
  if (!Number.isFinite(value)) return "0 kr";
  return `${Math.round(value).toLocaleString("sv-SE")} kr`;
}

export function estimateLoanMonths(loan: Pick<Loan, "remainingAmount" | "monthlyPayment" | "interestRate">) {
  if (loan.remainingAmount <= 0) return 0;
  if (loan.monthlyPayment <= 0) return Infinity;

  const monthlyRate = Math.max(0, loan.interestRate) / 100 / 12;

  if (!monthlyRate) {
    return Math.ceil(loan.remainingAmount / loan.monthlyPayment);
  }

  const monthlyInterest = loan.remainingAmount * monthlyRate;
  if (loan.monthlyPayment <= monthlyInterest) return Infinity;

  return Math.ceil(
    Math.log(loan.monthlyPayment / (loan.monthlyPayment - loan.remainingAmount * monthlyRate))
    / Math.log(1 + monthlyRate)
  );
}

export function formatLoanTime(months: number) {
  if (!Number.isFinite(months)) return "Betalningen täcker inte räntan";
  if (months <= 0) return "Klart";

  const years = Math.floor(months / 12);
  const restMonths = months % 12;

  if (!years) return `${months} mån`;
  if (!restMonths) return `${years} år`;

  return `${years} år ${restMonths} mån`;
}

export function parseMoney(value: string) {
  const withoutCurrency = value.replace(/kr/gi, "").trim();
  const normalized = withoutCurrency
    .replace(/\s/g, "")
    .replace(",", ".");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : NaN;
}

export function capitalizeFirst(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function defaultTravelForm() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    name: "",
    budget: "",
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
    separateFromFreeMoney: true,
  };
}

export function defaultSubscriptionForm() {
  return {
    name: "",
    plan: "",
    amount: "",
    day: "1",
    frequency: "monthly" as SubscriptionFrequency,
    intervalMonths: "2",
    startDate: formatDateInput(new Date()),
  };
}

export function currentMonthValue(date = new Date()) {
  return getCurrentFinancialMonth(date, salaryDay);
}

export function getFinancialPeriod(month: string) {
  return calculateFinancialPeriod(month, salaryDay);
}

export function isInFinancialPeriod(date: string, month: string) {
  const { start, end } = getFinancialPeriod(month);
  const transactionDate = new Date(`${date}T12:00:00`);

  return transactionDate >= start && transactionDate < end;
}

export function dateForPeriodDay(month: string, day: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const targetMonthIndex = day >= salaryDay ? monthNumber - 2 : monthNumber - 1;

  return formatDateInput(new Date(year, targetMonthIndex, day));
}

export function clampPaymentDay(day: number) {
  if (!Number.isFinite(day)) return 1;

  return Math.min(28, Math.max(1, Math.round(day)));
}

export function getSubscriptionIntervalMonths(subscription: Pick<Subscription, "frequency" | "intervalMonths">) {
  if (subscription.frequency === "custom") {
    return Math.max(1, Math.round(subscription.intervalMonths ?? 1));
  }

  return subscriptionFrequencies.find((frequency) => frequency.id === (subscription.frequency ?? "monthly"))?.months ?? 1;
}

export function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

export function defaultDateForPeriod(month: string) {
  const today = new Date();

  if (isInFinancialPeriod(formatDateInput(today), month)) {
    return formatDateInput(today);
  }

  return formatDateInput(getFinancialPeriod(month).start);
}

export function toRemoteId(id: string) {
  const numericId = Number(id);

  return Number.isInteger(numericId) ? numericId : null;
}

export function toDateTime(date: string) {
  return `${date}T12:00:00`;
}

export function daysLeftInTravel(startDate: string, endDate: string) {
  const oneDay = 86400000;
  const today = new Date();
  const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const lastTravelDayEnd = new Date(end.getTime() + oneDay);

  if (todayAtNoon < start) {
    return Math.max(1, Math.ceil((lastTravelDayEnd.getTime() - start.getTime()) / oneDay));
  }

  if (todayAtNoon > lastTravelDayEnd) {
    return 1;
  }

  return Math.max(1, Math.ceil((lastTravelDayEnd.getTime() - todayAtNoon.getTime()) / oneDay));
}

export function isTravelActive(travel: TravelBudget) {
  const today = formatDateInput(new Date());

  return today >= travel.startDate && today <= travel.endDate;
}

export function isFreePurchase(
  item: Pick<Transaction, "type" | "source" | "category" | "subscriptionId">,
  budgetCategorySet?: Set<string>
) {
  if (item.type !== "expense") return false;
  if (item.source === "free" || item.category === "Fria köp") return true;
  if (item.subscriptionId) return false;
  if (item.source === "budget") {
    return budgetCategorySet ? !budgetCategorySet.has(normalizeCategory(item.category)) : false;
  }

  return budgetCategorySet ? !budgetCategorySet.has(normalizeCategory(item.category)) : false;
}

export function sourceFromRemotePurchase(
  purchase: RemotePurchase,
  budgetCategorySet?: Set<string>
): PurchaseSource {
  if (purchase.source === "free" || purchase.source === "budget") {
    return purchase.source;
  }

  return purchase.kategori === "Fria köp" || (budgetCategorySet && !budgetCategorySet.has(normalizeCategory(purchase.kategori)))
    ? "free"
    : "budget";
}

export function transactionFromRemotePurchase(
  purchase: RemotePurchase,
  budgetCategorySet: Set<string>
): Transaction {
  const type: TransactionType = purchase.kategori === "Lön" ? "income" : "expense";

  return {
    id: String(purchase.id),
    title: purchase.beskrivning,
    amount: Number(purchase.belopp),
    category: purchase.kategori,
    date: purchase.created_at.slice(0, 10),
    type,
    source: type === "expense" ? sourceFromRemotePurchase(purchase, budgetCategorySet) : undefined,
    subscriptionId: purchase.subscription_id ? String(purchase.subscription_id) : undefined,
  };
}

export function previousFinancialMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const previous = new Date(year, monthNumber - 2, 1);

  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

export function percentageTrend(current: number, previous: number, comparisonReady: boolean) {
  if (!comparisonReady) return { label: "Jämförelse saknas", tone: "neutral" } as const;
  if (previous === 0 && current === 0) return { label: "0% mot föregående", tone: "neutral" } as const;
  if (previous === 0) return { label: "Nytt mot föregående", tone: "positive" } as const;

  const percentage = Math.round(((current - previous) / Math.abs(previous)) * 100);

  return {
    label: `${percentage > 0 ? "+" : ""}${percentage}% mot föregående`,
    tone: percentage > 0 ? "positive" : percentage < 0 ? "negative" : "neutral",
  } as const;
}

export function getExpenseSourceForCategory(category: string, budgetCategorySet: Set<string>): PurchaseSource {
  return category === "Fria köp" || !budgetCategorySet.has(normalizeCategory(category))
    ? "free"
    : "budget";
}

export function putFreePurchasesFirst(categories: string[]) {
  return [...categories].sort((a, b) => {
    if (a === "Fria köp") return -1;
    if (b === "Fria köp") return 1;

    return 0;
  });
}

export function getSavingsTransactionTitle(name: string) {
  return `Sparande till ${name}`;
}

export function isAppSavingsTransaction(transaction: Transaction) {
  return transaction.type === "expense" && transaction.title.trim().toLowerCase().startsWith("sparande till ");
}

export function findLinkedSavingsTransaction(saving: SavingsAccount, transactions: Transaction[]) {
  const savingName = normalizeCategory(saving.name);
  const exactTitle = normalizeCategory(getSavingsTransactionTitle(saving.name));
  const candidates = transactions.filter((transaction) =>
    isAppSavingsTransaction(transaction)
    && (
      normalizeCategory(transaction.title) === exactTitle
      || normalizeCategory(transaction.category) === savingName
    )
  );

  if (!candidates.length) return null;

  const createdDateMatch = saving.createdAt
    ? candidates.find((transaction) => transaction.date === saving.createdAt)
    : undefined;

  return createdDateMatch ?? candidates[0];
}

export function findSavingsAccountForTransaction(transaction: Transaction, savings: SavingsAccount[]) {
  if (transaction.type !== "expense") return null;

  const normalizedCategory = normalizeCategory(transaction.category);
  const titlePrefix = "sparande till ";
  const normalizedTitle = transaction.title.trim().toLowerCase();
  const titleSavingsName = normalizedTitle.startsWith(titlePrefix)
    ? normalizeCategory(transaction.title.slice(titlePrefix.length))
    : "";

  return savings.find((saving) => {
    const normalizedSavingName = normalizeCategory(saving.name);

    return normalizedSavingName === normalizedCategory || (titleSavingsName && normalizedSavingName === titleSavingsName);
  }) ?? null;
}

export function getSavingsAdjustments(previous: Transaction | null, next: Transaction | null, savings: SavingsAccount[]) {
  const adjustments = new Map<string, number>();

  const addAdjustment = (saving: SavingsAccount | null, delta: number) => {
    if (!saving || !delta) return;
    adjustments.set(saving.id, (adjustments.get(saving.id) ?? 0) + delta);
  };

  if (previous) {
    addAdjustment(findSavingsAccountForTransaction(previous, savings), -previous.amount);
  }

  if (next) {
    addAdjustment(findSavingsAccountForTransaction(next, savings), next.amount);
  }

  return adjustments;
}

export function applySavingsAdjustments(savings: SavingsAccount[], adjustments: Map<string, number>) {
  if (!adjustments.size) return savings;

  return savings.map((saving) => {
    const delta = adjustments.get(saving.id) ?? 0;

    return delta ? { ...saving, amount: Math.max(0, saving.amount + delta) } : saving;
  });
}

export function findLinkedSavingsForGoal(goal: Goal, savings: SavingsAccount[]) {
  if (goal.linkedSavingsId) {
    const linkedById = savings.find((saving) => saving.id === goal.linkedSavingsId);
    if (linkedById) return linkedById;
  }

  const normalizedTitle = normalizeCategory(goal.title);
  const titleWords = normalizedTitle.split(/\s+/).filter((word) => word.length > 2);
  const exactNameMatch = savings.find((saving) => normalizeCategory(saving.name) === normalizedTitle);

  if (exactNameMatch) return exactNameMatch;

  return savings.find((saving) => {
    const normalizedSavingName = normalizeCategory(saving.name);
    const savingWords = normalizedSavingName.split(/\s+/).filter((word) => word.length > 2);

    return normalizedSavingName.includes(normalizedTitle)
      || normalizedTitle.includes(normalizedSavingName)
      || titleWords.some((word) => savingWords.includes(word));
  }) ?? null;
}

export function getGoalSavedAmount(goal: Goal, savings: SavingsAccount[]) {
  return findLinkedSavingsForGoal(goal, savings)?.amount ?? goal.saved;
}

export function getGoalDisplaySavedAmount(goal: Goal, goals: Goal[], savings: SavingsAccount[]) {
  if (goals.length === 1) {
    const linkedSaving = findLinkedSavingsForGoal(goal, savings);
    const standaloneSavings = savings
      .filter((saving) => saving.id !== linkedSaving?.id)
      .reduce((sum, saving) => sum + saving.amount, 0);

    return getGoalSavedAmount(goal, savings) + standaloneSavings;
  }

  return getGoalSavedAmount(goal, savings);
}

export function getAffordabilityResult({
  title,
  amount,
  freeMoney,
  remainingDays,
}: {
  title: string;
  amount: number;
  freeMoney: number;
  remainingDays: number;
}): AffordabilityResult | null {
  if (!title.trim() && (!Number.isFinite(amount) || amount <= 0)) {
    return null;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      answer: "Nej",
      tone: "bad",
      summary: "Skriv ett giltigt pris först.",
      details: ["Exempel: 499 eller 499,90."],
    };
  }

  const remainingAfterPurchase = freeMoney - amount;
  const dailyMoneyBefore = freeMoney / remainingDays;
  const dailyMoneyAfter = remainingAfterPurchase / remainingDays;
  const safetyBuffer = Math.max(500, dailyMoneyBefore * 2);
  const purchaseName = title.trim() || "detta";

  if (amount > freeMoney) {
    return {
      answer: "Nej",
      tone: "bad",
      summary: `Nej, ${purchaseName} är för dyrt just nu.`,
      details: [
        `Det kostar ${kr(amount)}, men du har ${kr(freeMoney)} fria pengar.`,
        `Du skulle hamna på ${kr(remainingAfterPurchase)} efter köpet.`,
        `Det är ${remainingDays} dagar kvar i perioden.`,
      ],
    };
  }

  if (remainingAfterPurchase < safetyBuffer) {
    return {
      answer: "Ja, men tajt",
      tone: "warning",
      summary: `Du har råd med ${purchaseName}, men marginalen blir låg.`,
      details: [
        `Efter köpet har du ${kr(remainingAfterPurchase)} kvar i fria pengar.`,
        `Det blir ungefär ${kr(dailyMoneyAfter)} per dag i ${remainingDays} dagar.`,
        `Jag hade helst sett en buffert på minst ${kr(safetyBuffer)}.`,
      ],
    };
  }

  return {
    answer: "Ja",
    tone: "good",
    summary: `Ja, ${purchaseName} ser rimligt ut.`,
    details: [
      `Köpet kostar ${kr(amount)} och du har ${kr(freeMoney)} fria pengar.`,
      `Efter köpet har du ${kr(remainingAfterPurchase)} kvar.`,
      `Det blir ungefär ${kr(dailyMoneyAfter)} per dag tills perioden är slut.`,
    ],
  };
}

