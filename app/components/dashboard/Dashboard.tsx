"use client";

import { CSSProperties, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import packageInfo from "../../../package.json";
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  ChevronDown, ChevronRight, CircleCheck, Crosshair, Edit3, Lightbulb,
  Database, Download, MessageSquare, PiggyBank, Plane, Plus,
  RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Users, WalletCards,
} from "lucide-react";
import {
  addBudget as addRemoteBudget,
  addCategory as addRemoteCategory,
  addFeedback as addRemoteFeedback,
  addGoal as addRemoteGoal,
  addLoan as addRemoteLoan,
  addPurchase as addRemotePurchase,
  addSavingsAccount as addRemoteSavingsAccount,
  addSubscription as addRemoteSubscription,
  addTravelBudget as addRemoteTravelBudget,
  addTravelPurchase as addRemoteTravelPurchase,
  deleteBudget as deleteRemoteBudget,
  deleteCategoryByName as deleteRemoteCategoryByName,
  deleteGoal as deleteRemoteGoal,
  deleteLoan as deleteRemoteLoan,
  deletePurchase as deleteRemotePurchase,
  deleteSavingsAccount as deleteRemoteSavingsAccount,
  deleteSubscription as deleteRemoteSubscription,
  deleteCurrentUserData,
  deleteTravelBudget as deleteRemoteTravelBudget,
  deleteTravelPurchase as deleteRemoteTravelPurchase,
  getCurrentUser,
  getAdminStats,
  getBudgets,
  getCategories,
  getGoals,
  getLoans,
  getPurchasesByDateRange,
  getFeedbackTickets,
  getProfile,
  getSavingsAccounts,
  getSubscriptions,
  getTravelBudgets,
  onAuthChange,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateBudget as updateRemoteBudget,
  updateGoal as updateRemoteGoal,
  updateLoan as updateRemoteLoan,
  updatePurchase as updateRemotePurchase,
  updateSavingsAccount as updateRemoteSavingsAccount,
  updateProfileName,
  updateOpeningBalance,
  updateFeedbackStatus,
  updateSubscription as updateRemoteSubscription,
  updateTravelBudget as updateRemoteTravelBudget,
} from "../../lib/api";
import type { AdminStats } from "../../lib/api";
import {
  calculateFinanceSummary,
} from "../../lib/finance-calculator";
import type { AppSection } from "../Sidebar";
import LoansSection from "./sections/LoansSection";

type TransactionType = "income" | "expense";
type PurchaseSource = "budget" | "free";
type SubscriptionFrequency = "monthly" | "quarterly" | "semiannual" | "yearly" | "custom";

type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: TransactionType;
  source?: PurchaseSource;
  subscriptionId?: string;
};

type Budget = {
  id: string;
  category: string;
  limit: number;
};

type Subscription = {
  id: string;
  name: string;
  plan: string;
  amount: number;
  day: number;
  active: boolean;
  frequency?: SubscriptionFrequency;
  intervalMonths?: number;
  startDate?: string;
};

type Goal = {
  id: string;
  title: string;
  saved: number;
  target: number;
  linkedSavingsId?: string;
};

type SavingsAccount = {
  id: string;
  name: string;
  amount: number;
  createdAt?: string;
};

type Loan = {
  id: string;
  name: string;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  paymentDay: number;
};

type TravelPurchase = {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
};

type TravelBudget = {
  id: string;
  name: string;
  budget: number;
  startDate: string;
  endDate: string;
  separateFromFreeMoney: boolean;
  purchases: TravelPurchase[];
};

type AffordabilityResult = {
  answer: "Ja" | "Nej" | "Ja, men tajt";
  tone: "good" | "warning" | "bad";
  summary: string;
  details: string[];
};

type FinanceData = {
  openingBalance: number;
  transactions: Transaction[];
  budgets: Budget[];
  subscriptions: Subscription[];
  categories: string[];
  goals: Goal[];
  savings: SavingsAccount[];
  loans: Loan[];
  travelBudgets: TravelBudget[];
};

type RemotePurchase = {
  id: number;
  beskrivning: string;
  belopp: number;
  kategori: string;
  created_at: string;
  source?: PurchaseSource | null;
  subscription_id?: number | null;
};

type RemoteBudget = {
  id: number;
  category: string;
  monthly_budget: number;
};

type RemoteCategory = {
  id: number;
  name: string;
  color: string;
  icon: string;
};

type RemoteSubscription = {
  id: number;
  name: string;
  amount: number;
  category: string;
  day_of_month: number;
  active: boolean;
  frequency?: SubscriptionFrequency | null;
  interval_months?: number | null;
  start_date?: string | null;
};

type RemoteGoal = {
  id: number;
  title: string;
  saved: number;
  target: number;
};

type RemoteSavingsAccount = {
  id: number;
  name: string;
  amount: number;
  created_at?: string;
};

type RemoteLoan = {
  id: number;
  name: string;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number;
  payment_day: number;
};

type SupportTicket = {
  id: number;
  user_id?: string | null;
  type: "bug" | "idea" | "question" | "other";
  message: string;
  page?: string | null;
  app_version?: string | null;
  status: "new" | "reviewed" | "planned" | "done" | "closed";
  created_at: string;
};

type RemoteTravelPurchase = {
  id: number;
  travel_budget_id: number;
  title: string;
  amount: number;
  category: string;
  purchase_date: string;
};

type RemoteTravelBudget = {
  id: number;
  name: string;
  budget: number;
  start_date: string;
  end_date: string;
  separate_from_free_money: boolean;
  travel_purchases?: RemoteTravelPurchase[];
};

type DashboardProps = {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
};

type AuthUser = User | null;
type LayoutTheme = "blue" | "green" | "purple" | "rose" | "orange";

const storageKey = "oskars-ekonomi-v2";
const themeStorageKey = "oskars-ekonomi-theme";
const onboardingStorageKey = "oskars-ekonomi-onboarding";
const fallbackAdminEmails = ["oskarek575@gmail.com"];
const salaryDay = 25;
const loanSubscriptionPlan = "Lån";
const monthFormatter = new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });

const layoutThemes: { id: LayoutTheme; label: string; description: string }[] = [
  { id: "blue", label: "Mörkblå", description: "Lugn app-känsla" },
  { id: "green", label: "Grön", description: "Ekonomi & sparande" },
  { id: "purple", label: "Lila", description: "Lite mer premium" },
  { id: "rose", label: "Rosa", description: "Varmare ton" },
  { id: "orange", label: "Orange", description: "Mer energi" },
];

const subscriptionFrequencies: { id: SubscriptionFrequency; label: string; months: number }[] = [
  { id: "monthly", label: "Varje månad", months: 1 },
  { id: "quarterly", label: "Varje kvartal", months: 3 },
  { id: "semiannual", label: "Varje halvår", months: 6 },
  { id: "yearly", label: "Varje år", months: 12 },
  { id: "custom", label: "Eget intervall", months: 1 },
];

const categoryColors: Record<string, string> = {
  "Bostad": "#8b45f5",
  "Mat & Livsmedel": "#42c776",
  "Transport": "#438ee8",
  "Drivmedel": "#2dd4bf",
  "Nöjen": "#f3a047",
  "Shopping": "#d1519b",
  "Fria köp": "#22c55e",
  "Prenumerationer": "#38bdf8",
  "Lön": "#39d979",
  "Övrigt": "#637083",
};

const lockedCategories = ["Lön", "Fria köp", "Prenumerationer"] as const;

const defaultData: FinanceData = {
  openingBalance: 0,
  categories: ["Bostad", "Mat & Livsmedel", "Drivmedel", "Transport", "Nöjen", "Shopping", "Fria köp", "Prenumerationer", "Lön", "Övrigt"],
  transactions: [
    { id: "t1", title: "Lön", category: "Lön", amount: 34850, date: "2025-05-30", type: "income" },
    { id: "t2", title: "Hyra", category: "Bostad", amount: 6850, date: "2025-05-27", type: "expense" },
    { id: "t3", title: "ICA Kvantum", category: "Mat & Livsmedel", amount: 842, date: "2025-05-29", type: "expense" },
    { id: "t4", title: "Bensin", category: "Drivmedel", amount: 679, date: "2025-05-27", type: "expense" },
    { id: "t5", title: "Spotify", category: "Prenumerationer", amount: 129, date: "2025-05-28", type: "expense" },
    { id: "t6", title: "Netflix", category: "Prenumerationer", amount: 179, date: "2025-05-26", type: "expense" },
    { id: "t7", title: "Restaurang", category: "Nöjen", amount: 520, date: "2025-05-24", type: "expense" },
    { id: "t8", title: "Kläder", category: "Shopping", amount: 890, date: "2025-05-22", type: "expense" },
    { id: "t9", title: "Sparande", category: "Övrigt", amount: 8250, date: "2025-05-31", type: "expense" },
  ],
  budgets: [
    { id: "b1", category: "Mat & Livsmedel", limit: 5000 },
    { id: "b2", category: "Drivmedel", limit: 2500 },
    { id: "b3", category: "Nöjen", limit: 2000 },
    { id: "b4", category: "Shopping", limit: 1500 },
    { id: "b5", category: "Övrigt", limit: 1000 },
  ],
  subscriptions: [
    { id: "s1", name: "Netflix", plan: "Standard Plan", amount: 149, day: 1, active: true },
    { id: "s2", name: "Spotify", plan: "Premium", amount: 129, day: 3, active: true },
    { id: "s3", name: "Gymmet", plan: "Månadskort", amount: 299, day: 5, active: true },
    { id: "s4", name: "Adobe", plan: "Creative Cloud", amount: 239, day: 10, active: true },
    { id: "s5", name: "YouTube Premium", plan: "Familj", amount: 179, day: 15, active: true },
  ],
  goals: [],
  savings: [],
  loans: [],
  travelBudgets: [
    {
      id: "tr1",
      name: "Sommarresa",
      budget: 12000,
      startDate: "2026-07-21",
      endDate: "2026-07-27",
      separateFromFreeMoney: true,
      purchases: [],
    },
  ],
};

function kr(value: number) {
  if (!Number.isFinite(value)) return "0 kr";
  return `${Math.round(value).toLocaleString("sv-SE")} kr`;
}

function estimateLoanMonths(loan: Pick<Loan, "remainingAmount" | "monthlyPayment" | "interestRate">) {
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

function formatLoanTime(months: number) {
  if (!Number.isFinite(months)) return "Betalningen täcker inte räntan";
  if (months <= 0) return "Klart";

  const years = Math.floor(months / 12);
  const restMonths = months % 12;

  if (!years) return `${months} mån`;
  if (!restMonths) return `${years} år`;

  return `${years} år ${restMonths} mån`;
}

function parseMoney(value: string) {
  const withoutCurrency = value.replace(/kr/gi, "").trim();
  const normalized = withoutCurrency
    .replace(/\s/g, "")
    .replace(",", ".");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : NaN;
}

function formatMonthInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultTravelForm() {
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

function defaultSubscriptionForm() {
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

function currentMonthValue(date = new Date()) {
  const budgetMonth = new Date(date);

  if (date.getDate() >= salaryDay) {
    budgetMonth.setMonth(budgetMonth.getMonth() + 1);
  }

  return formatMonthInput(budgetMonth);
}

function getFinancialPeriod(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const selectedMonthIndex = monthNumber - 1;

  return {
    start: new Date(year, selectedMonthIndex - 1, salaryDay, 0, 0, 0, 0),
    end: new Date(year, selectedMonthIndex, salaryDay, 0, 0, 0, 0),
  };
}

function isInFinancialPeriod(date: string, month: string) {
  const { start, end } = getFinancialPeriod(month);
  const transactionDate = new Date(`${date}T12:00:00`);

  return transactionDate >= start && transactionDate < end;
}

function dateForPeriodDay(month: string, day: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const targetMonthIndex = day >= salaryDay ? monthNumber - 2 : monthNumber - 1;

  return formatDateInput(new Date(year, targetMonthIndex, day));
}

function clampPaymentDay(day: number) {
  if (!Number.isFinite(day)) return 1;

  return Math.min(28, Math.max(1, Math.round(day)));
}

function getSubscriptionIntervalMonths(subscription: Pick<Subscription, "frequency" | "intervalMonths">) {
  if (subscription.frequency === "custom") {
    return Math.max(1, Math.round(subscription.intervalMonths ?? 1));
  }

  return subscriptionFrequencies.find((frequency) => frequency.id === (subscription.frequency ?? "monthly"))?.months ?? 1;
}

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function defaultDateForPeriod(month: string) {
  const today = new Date();

  if (isInFinancialPeriod(formatDateInput(today), month)) {
    return formatDateInput(today);
  }

  return dateForPeriodDay(month, salaryDay);
}

function toRemoteId(id: string) {
  const numericId = Number(id);

  return Number.isInteger(numericId) ? numericId : null;
}

function toDateTime(date: string) {
  return `${date}T12:00:00`;
}

function daysLeftInTravel(startDate: string, endDate: string) {
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

function isTravelActive(travel: TravelBudget) {
  const today = formatDateInput(new Date());

  return today >= travel.startDate && today <= travel.endDate;
}

function isFreePurchase(
  item: Pick<Transaction, "type" | "source" | "category">,
  budgetCategorySet?: Set<string>
) {
  if (item.type !== "expense") return false;
  if (item.source === "free" || item.category === "Fria köp") return true;
  if (item.source === "budget") return false;

  return budgetCategorySet ? !budgetCategorySet.has(normalizeCategory(item.category)) : false;
}

function sourceFromRemotePurchase(
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

function getSavingsTransactionTitle(name: string) {
  return `Sparande till ${name}`;
}

function isAppSavingsTransaction(transaction: Transaction) {
  return transaction.type === "expense" && transaction.title.trim().toLowerCase().startsWith("sparande till ");
}

function findLinkedSavingsTransaction(saving: SavingsAccount, transactions: Transaction[]) {
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

function findSavingsAccountForTransaction(transaction: Transaction, savings: SavingsAccount[]) {
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

function getSavingsAdjustments(previous: Transaction | null, next: Transaction | null, savings: SavingsAccount[]) {
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

function applySavingsAdjustments(savings: SavingsAccount[], adjustments: Map<string, number>) {
  if (!adjustments.size) return savings;

  return savings.map((saving) => {
    const delta = adjustments.get(saving.id) ?? 0;

    return delta ? { ...saving, amount: Math.max(0, saving.amount + delta) } : saving;
  });
}

function findLinkedSavingsForGoal(goal: Goal, savings: SavingsAccount[]) {
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

function getGoalSavedAmount(goal: Goal, savings: SavingsAccount[]) {
  return findLinkedSavingsForGoal(goal, savings)?.amount ?? goal.saved;
}

function getGoalDisplaySavedAmount(goal: Goal, goals: Goal[], savings: SavingsAccount[]) {
  if (goals.length === 1) {
    const linkedSaving = findLinkedSavingsForGoal(goal, savings);
    const standaloneSavings = savings
      .filter((saving) => saving.id !== linkedSaving?.id)
      .reduce((sum, saving) => sum + saving.amount, 0);

    return getGoalSavedAmount(goal, savings) + standaloneSavings;
  }

  return getGoalSavedAmount(goal, savings);
}

function getAffordabilityResult({
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

function Sparkline({ color }: { color: string }) {
  return <svg className="sparkline" viewBox="0 0 190 38" preserveAspectRatio="none"><defs><linearGradient id={`g-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity=".33"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs><path d="M0 30 L10 24 L20 25 L30 31 L40 30 L50 23 L60 25 L68 21 L75 25 L84 18 L92 22 L102 14 L110 16 L120 6 L129 9 L136 3 L145 9 L154 13 L164 5 L173 7 L180 30 L190 29 L190 38 L0 38Z" fill={`url(#g-${color.replace("#", "")})`}/><path d="M0 30 L10 24 L20 25 L30 31 L40 30 L50 23 L60 25 L68 21 L75 25 L84 18 L92 22 L102 14 L110 16 L120 6 L129 9 L136 3 L145 9 L154 13 L164 5 L173 7 L180 30 L190 29" fill="none" stroke={color} strokeWidth="1.5"/></svg>;
}

function CardTitle({ children, link, onClick }: { children: ReactNode; link?: string; onClick?: () => void }) {
  return <div className="card-title"><h3>{children}</h3>{link && <button onClick={onClick} type="button">{link}</button>}</div>;
}

function Logo({ title, tone = "white" }: { title: string; tone?: string }) {
  const letter = title === "Spotify" ? "◉" : title === "Netflix" ? "N" : title.slice(0, 3).toUpperCase();
  return <span className={`logo ${tone}`}>{letter}</span>;
}

const merchantIcons = [
  { match: ["ica", "kvantum", "maxi"], label: "ICA", tone: "ica" },
  { match: ["coop"], label: "Coop", tone: "coop" },
  { match: ["willys"], label: "W", tone: "willys" },
  { match: ["lidl"], label: "L", tone: "lidl" },
  { match: ["spotify"], label: "◎", tone: "spotify" },
  { match: ["netflix"], label: "N", tone: "netflix" },
  { match: ["bensin", "circle", "okq8", "preem", "shell"], label: "⛽", tone: "fuel" },
  { match: ["lön", "lon", "salary"], label: "↓", tone: "income" },
  { match: ["hyra", "bostad"], label: "⌂", tone: "home" },
  { match: ["gym"], label: "GYM", tone: "gym" },
  { match: ["adobe"], label: "A", tone: "adobe" },
  { match: ["youtube"], label: "▶", tone: "youtube" },
];

const categoryIcons: Record<string, { label: string; tone: string }> = {
  "Bostad": { label: "⌂", tone: "home" },
  "Mat & Livsmedel": { label: "🛒", tone: "food" },
  "Drivmedel": { label: "⛽", tone: "fuel" },
  "Transport": { label: "↔", tone: "transport" },
  "Nöjen": { label: "★", tone: "fun" },
  "Shopping": { label: "🛒", tone: "shopping" },
  "Fria köp": { label: "₿", tone: "free" },
  "Prenumerationer": { label: "↻", tone: "subscription" },
  "Lön": { label: "↓", tone: "income" },
  "Övrigt": { label: "•", tone: "default" },
};

function getCategoryIcon(category: string, type: TransactionType = "expense") {
  return categoryIcons[category] ?? { label: type === "income" ? "↓" : category.slice(0, 2).toUpperCase(), tone: type === "income" ? "income" : "default" };
}

function TransactionIcon({ title, category, type }: { title: string; category: string; type: TransactionType }) {
  const text = `${title} ${category}`.toLowerCase();
  const match = merchantIcons.find((icon) => icon.match.some((word) => text.includes(word)));
  const categoryIcon = getCategoryIcon(category, type);
  const label = match?.label ?? categoryIcon.label;
  const tone = match?.tone ?? categoryIcon.tone;

  return <span className={`merchant-logo ${tone}`}>{label}</span>;
}

function CategoryMeta({ category, type, suffix }: { category: string; type: TransactionType; suffix?: string }) {
  const icon = getCategoryIcon(category, type);

  return (
    <small className="category-meta">
      <span className={`category-mini-icon ${icon.tone}`}>{icon.label}</span>
      <span>{category}{suffix ? ` · ${suffix}` : ""}</span>
    </small>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function getUserDisplayName(user: AuthUser) {
  const metadata = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const name = metadata?.full_name ?? metadata?.name;

  if (name?.trim()) return name.trim();

  return user?.email?.split("@")[0] ?? "där";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OE";
}

function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 11) return "God morgon";
  if (hour < 17) return "God dag";

  return "God kväll";
}

function getAdminEmails() {
  const configuredEmails = process.env.NEXT_PUBLIC_BETA_ADMIN_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return configuredEmails?.length ? configuredEmails : fallbackAdminEmails;
}

function isAdminUser(user: AuthUser) {
  const email = user?.email?.toLowerCase();

  return Boolean(email && getAdminEmails().includes(email));
}

function getReadableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Okänt fel";
}

export default function Dashboard({ activeSection, onNavigate }: DashboardProps) {
  const [data, setData] = useState<FinanceData>(defaultData);
  const [month, setMonth] = useState(currentMonthValue);
  const [notice, setNotice] = useState("Klart! Din ekonomi är uppdaterad.");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Alla");
  const [transactionForm, setTransactionForm] = useState({
    title: "",
    amount: "",
    category: "Mat & Livsmedel",
    type: "expense" as TransactionType,
    source: "budget" as PurchaseSource,
    date: defaultDateForPeriod(currentMonthValue()),
  });
  const [budgetForm, setBudgetForm] = useState({ category: "Mat & Livsmedel", limit: "" });
  const [subscriptionForm, setSubscriptionForm] = useState(defaultSubscriptionForm);
  const [categoryName, setCategoryName] = useState("");
  const [goalForm, setGoalForm] = useState({ title: "", saved: "", target: "", linkedSavingsId: "" });
  const [savingsForm, setSavingsForm] = useState({ name: "", amount: "" });
  const [loanForm, setLoanForm] = useState({
    name: "",
    remainingAmount: "",
    monthlyPayment: "",
    interestRate: "",
    paymentDay: "25",
  });
  const [travelForm, setTravelForm] = useState(defaultTravelForm);
  const [travelPurchaseForm, setTravelPurchaseForm] = useState({
    title: "",
    amount: "",
    category: "Mat",
    date: formatDateInput(new Date()),
  });
  const [affordabilityForm, setAffordabilityForm] = useState({ title: "", amount: "" });
  const [feedbackForm, setFeedbackForm] = useState({ type: "bug" as "bug" | "idea" | "question" | "other", message: "" });
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);
  const [adminStatsError, setAdminStatsError] = useState("");
  const [proActive, setProActive] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingSavingsId, setEditingSavingsId] = useState<string | null>(null);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [editingTravelId, setEditingTravelId] = useState<string | null>(null);
  const [activeTravelId, setActiveTravelId] = useState<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(false);
  const [user, setUser] = useState<AuthUser>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [profileNameForm, setProfileNameForm] = useState("");
  const [openingBalanceForm, setOpeningBalanceForm] = useState("");
  const [layoutTheme, setLayoutTheme] = useState<LayoutTheme>("blue");
  const [lastLocalSave, setLastLocalSave] = useState<string | null>(null);
  const [showBalanceAnalysis, setShowBalanceAnalysis] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    income: "",
    openingBalance: "",
    fixedName: "",
    fixedAmount: "",
    fixedDay: "1",
    budgetCategory: "Mat & Livsmedel",
    budgetAmount: "",
  });
  const [dangerConfirm, setDangerConfirm] = useState("");
  const goalEditorRef = useRef<HTMLFormElement | null>(null);
  const savingsEditorRef = useRef<HTMLFormElement | null>(null);
  const userStorageKey = user ? `${storageKey}-${user.id}` : storageKey;
  const userThemeStorageKey = user ? `${themeStorageKey}-${user.id}` : themeStorageKey;
  const userOnboardingStorageKey = user ? `${onboardingStorageKey}-${user.id}` : onboardingStorageKey;
  const displayName = getUserDisplayName(user);
  const greeting = getTimeGreeting();
  const initials = getInitials(displayName);
  const showAdminPanels = isAdminUser(user);

  const loadAdminStats = useCallback(async () => {
    if (!showAdminPanels) return;

    setAdminStatsLoading(true);
    setAdminStatsError("");

    try {
      const stats = await getAdminStats();
      setAdminStats(stats);
    } catch (error) {
      console.error(error);
      setAdminStats(null);
      setAdminStatsError(getReadableError(error));
    } finally {
      setAdminStatsLoading(false);
    }
  }, [showAdminPanels]);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setAuthLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setUser(null);
        setAuthLoading(false);
      });

    const { data: listener } = onAuthChange((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    setProfileNameForm(getUserDisplayName(user));

    const savedTheme = window.localStorage.getItem(userThemeStorageKey) as LayoutTheme | null;
    if (savedTheme && layoutThemes.some((theme) => theme.id === savedTheme)) {
      setLayoutTheme(savedTheme);
    }

    setOnboardingDismissed(window.localStorage.getItem(userOnboardingStorageKey) === "done");

    const saved = window.localStorage.getItem(userStorageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<FinanceData> & { goal?: Omit<Goal, "id"> };
      const savedGoals = parsed.goals ?? (parsed.goal ? [{ id: "g-migrated", ...parsed.goal }] : defaultData.goals);
      setData({
        ...defaultData,
        ...parsed,
        goals: savedGoals,
        savings: parsed.savings ?? [],
        loans: parsed.loans ?? [],
        travelBudgets: parsed.travelBudgets ?? defaultData.travelBudgets,
        categories: Array.from(new Set([
          ...defaultData.categories,
          ...(parsed.categories ?? []),
          ...(parsed.savings ?? []).map((saving) => saving.name),
        ])),
      });
      setLastLocalSave(window.localStorage.getItem(`${userStorageKey}-saved-at`));
    }
  }, [authLoading, user, userOnboardingStorageKey, userStorageKey, userThemeStorageKey]);

  useEffect(() => {
    document.documentElement.dataset.layoutTheme = layoutTheme;
  }, [layoutTheme]);

  useEffect(() => {
    if (authLoading || !user) return;

    window.localStorage.setItem(userThemeStorageKey, layoutTheme);
  }, [authLoading, layoutTheme, user, userThemeStorageKey]);

  useEffect(() => {
    setOpeningBalanceForm(data.openingBalance ? String(data.openingBalance) : "");
  }, [data.openingBalance]);

  useEffect(() => {
    async function loadSupabaseData() {
      if (!user) {
        setRemoteReady(false);
        setNotice("Logga in för att synka säkert med Supabase.");
        return;
      }

      try {
        const periodRange = getFinancialPeriod(month);
        const [profile, purchaseRows, budgetRowsData, categoryRows, subscriptionRows, goalRows, savingsRows, loanRowsData, travelRows] = await Promise.all([
          getProfile().catch(() => null),
          getPurchasesByDateRange(periodRange.start, periodRange.end) as Promise<RemotePurchase[]>,
          getBudgets() as Promise<RemoteBudget[]>,
          getCategories() as Promise<RemoteCategory[]>,
          getSubscriptions() as Promise<RemoteSubscription[]>,
          getGoals().catch(() => []) as Promise<RemoteGoal[]>,
          getSavingsAccounts().catch(() => []) as Promise<RemoteSavingsAccount[]>,
          getLoans().catch(() => []) as Promise<RemoteLoan[]>,
          getTravelBudgets().catch(() => []) as Promise<RemoteTravelBudget[]>,
        ]);

        const remoteBudgetCategorySet = new Set(
          budgetRowsData.map((budget) => normalizeCategory(budget.category))
        );

        setData((current) => ({
          ...current,
          openingBalance: Number(profile?.opening_balance ?? current.openingBalance ?? 0),
          transactions: purchaseRows.map((purchase) => {
            const type: TransactionType = purchase.kategori === "Lön" ? "income" : "expense";
            const source = type === "expense" ? sourceFromRemotePurchase(purchase, remoteBudgetCategorySet) : undefined;

            return {
              id: String(purchase.id),
              title: purchase.beskrivning,
              amount: Number(purchase.belopp),
              category: purchase.kategori,
              date: purchase.created_at.slice(0, 10),
              type,
              source,
              subscriptionId: purchase.subscription_id ? String(purchase.subscription_id) : undefined,
            };
          }),
          budgets: budgetRowsData.map((budget) => ({
            id: String(budget.id),
            category: budget.category,
            limit: Number(budget.monthly_budget),
          })),
          categories: Array.from(new Set([
            ...defaultData.categories,
            ...current.categories,
            ...categoryRows.map((category) => category.name),
            ...savingsRows.map((saving) => saving.name),
          ])),
          subscriptions: subscriptionRows.map((subscription) => {
            const id = String(subscription.id);
            const cached = current.subscriptions.find((item) => item.id === id);

            return {
              id,
              name: subscription.name,
              plan: subscription.category,
              amount: Number(subscription.amount),
              day: Number(subscription.day_of_month),
              active: subscription.active,
              frequency: subscription.frequency ?? cached?.frequency ?? "monthly",
              intervalMonths: Number(subscription.interval_months ?? cached?.intervalMonths ?? 1),
              startDate: subscription.start_date ?? cached?.startDate ?? dateForPeriodDay(month, Number(subscription.day_of_month)),
            };
          }),
          goals: goalRows.length ? goalRows.map((goal) => ({
            id: String(goal.id),
            title: goal.title,
            saved: Number(goal.saved),
            target: Number(goal.target),
            linkedSavingsId: current.goals.find((item) => item.id === String(goal.id) || normalizeCategory(item.title) === normalizeCategory(goal.title))?.linkedSavingsId,
          })) : current.goals,
          savings: savingsRows.length ? savingsRows.map((saving) => ({
            id: String(saving.id),
            name: saving.name,
            amount: Number(saving.amount),
            createdAt: saving.created_at?.slice(0, 10),
          })) : current.savings,
          loans: loanRowsData.length ? loanRowsData.map((loan) => ({
            id: String(loan.id),
            name: loan.name,
            remainingAmount: Number(loan.remaining_amount),
            monthlyPayment: Number(loan.monthly_payment),
            interestRate: Number(loan.interest_rate),
            paymentDay: Number(loan.payment_day),
          })) : current.loans,
          travelBudgets: travelRows.length ? travelRows.map((travel) => ({
            id: String(travel.id),
            name: travel.name,
            budget: Number(travel.budget),
            startDate: travel.start_date,
            endDate: travel.end_date,
            separateFromFreeMoney: travel.separate_from_free_money,
            purchases: (travel.travel_purchases ?? []).map((purchase) => ({
              id: String(purchase.id),
              title: purchase.title,
              amount: Number(purchase.amount),
              category: purchase.category,
              date: purchase.purchase_date,
            })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          })) : current.travelBudgets,
        }));
        setRemoteReady(true);
        setNotice("Synkad med Supabase.");
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
        setNotice("Kunde inte nå Supabase, använder lokal cache.");
      }
    }

    void loadSupabaseData();
  }, [month, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    const savedAt = new Date().toISOString();
    window.localStorage.setItem(userStorageKey, JSON.stringify(data));
    window.localStorage.setItem(`${userStorageKey}-saved-at`, savedAt);
    setLastLocalSave(savedAt);
  }, [authLoading, data, user, userStorageKey]);

  useEffect(() => {
    if (!data.travelBudgets.length) {
      setActiveTravelId(null);
      return;
    }

    if (!activeTravelId || !data.travelBudgets.some((travel) => travel.id === activeTravelId)) {
      setActiveTravelId(data.travelBudgets.find(isTravelActive)?.id ?? data.travelBudgets[0].id);
    }
  }, [activeTravelId, data.travelBudgets]);

  useEffect(() => {
    if (!user) {
      setSupportTickets([]);
      return;
    }

    getFeedbackTickets()
      .then((tickets) => setSupportTickets(tickets as SupportTicket[]))
      .catch((error) => {
        console.error(error);
        setSupportTickets([]);
      });
  }, [user, showAdminPanels]);

  useEffect(() => {
    if (!showAdminPanels) {
      setAdminStats(null);
      setAdminStatsError("");
      return;
    }

    loadAdminStats();
  }, [showAdminPanels, loadAdminStats]);

  useEffect(() => {
    setTransactionForm((form) => ({ ...form, date: defaultDateForPeriod(month) }));
  }, [month]);

  useEffect(() => {
    if (activeSection === "overview" || activeSection === "freePurchases") {
      setTransactionForm((form) => ({
        ...form,
        type: "expense",
        source: "free",
        category: form.category === "Lön" ? "Fria köp" : form.category,
      }));
    } else {
      setTransactionForm((form) => ({
        ...form,
        source: "budget",
        category: form.category === "Fria köp" ? "Mat & Livsmedel" : form.category,
      }));
    }
  }, [activeSection]);

  const monthDate = new Date(`${month}-01T12:00:00`);
  const budgetCategorySet = useMemo(
    () => new Set(data.budgets.map((budget) => normalizeCategory(budget.category))),
    [data.budgets]
  );

  const financeSummary = useMemo(() => calculateFinanceSummary({
    transactions: data.transactions,
    budgets: data.budgets,
    subscriptions: data.subscriptions,
    savings: data.savings,
    travelBudgets: data.travelBudgets,
    month,
    openingBalance: data.openingBalance,
    salaryDay,
  }), [data.budgets, data.openingBalance, data.savings, data.subscriptions, data.transactions, data.travelBudgets, month]);
  const {
    period,
    monthTransactions,
    income,
    expenses,
    freePurchaseSpent,
    todayFreePurchaseSpent,
    reservedBudgetTotal,
    scheduledSubscriptions,
    fixedExpenseTotal,
    missingPostedSubscriptions,
    missingPostedFixedExpenses,
    reservedTotal,
    savingsTotal,
    actualBalance,
    budgetRows,
    budgetOverspendTotal,
    freeMoney,
    freeMoneyProgress,
    remainingDays,
    freeMoneyPerDay,
    plannedAvailableMoney,
    plannedVsActualDifference,
    balanceBreakdown: balanceBreakdownRows,
  } = financeSummary;
  const freeMoneyStyle = { "--free-progress": `${freeMoneyProgress}%` } as CSSProperties;
  const linkedGoalSavingsIds = new Set(data.goals
    .map((goal) => findLinkedSavingsForGoal(goal, data.savings)?.id)
    .filter(Boolean));
  const manualGoalsSaved = data.goals.reduce((sum, goal) => {
    const linkedSaving = findLinkedSavingsForGoal(goal, data.savings);

    return sum + (linkedSaving ? 0 : goal.saved);
  }, 0);
  const standaloneSavingsTotal = data.savings
    .filter((saving) => !linkedGoalSavingsIds.has(saving.id))
    .reduce((sum, saving) => sum + saving.amount, 0);
  const goalsTargetTotal = data.goals.reduce((sum, goal) => sum + goal.target, 0);
  const linkedGoalSavedTotal = data.goals.reduce((sum, goal) => sum + getGoalSavedAmount(goal, data.savings), 0);
  const goalSavedTotal = linkedGoalSavedTotal + standaloneSavingsTotal;
  const goalProgress = goalsTargetTotal ? Math.min(100, Math.round((goalSavedTotal / goalsTargetTotal) * 100)) : 0;
  const goalsRemainingTotal = Math.max(goalsTargetTotal - goalSavedTotal, 0);
  const strongestGoal = data.goals.length
    ? [...data.goals].sort((a, b) => (b.target ? getGoalDisplaySavedAmount(b, data.goals, data.savings) / b.target : 0) - (a.target ? getGoalDisplaySavedAmount(a, data.goals, data.savings) / a.target : 0))[0]
    : null;
  const strongestGoalProgress = strongestGoal?.target
    ? Math.min(100, Math.round((getGoalDisplaySavedAmount(strongestGoal, data.goals, data.savings) / strongestGoal.target) * 100))
    : 0;
  const savingsThisPeriod = monthTransactions
    .filter(isAppSavingsTransaction)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const loanRows = data.loans.map((loan) => {
    const monthsLeft = estimateLoanMonths(loan);
    const monthlyInterest = loan.remainingAmount * Math.max(0, loan.interestRate) / 100 / 12;
    const amortization = Math.max(loan.monthlyPayment - monthlyInterest, 0);
    const progressPct = Number.isFinite(monthsLeft)
      ? Math.max(3, Math.min(100, Math.round((amortization / Math.max(loan.monthlyPayment, 1)) * 100)))
      : 3;

    return { ...loan, monthsLeft, monthlyInterest, amortization, progressPct };
  });
  const totalLoanDebt = loanRows.reduce((sum, loan) => sum + loan.remainingAmount, 0);
  const totalLoanMonthlyPayment = loanRows.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  const totalLoanMonthlyInterest = loanRows.reduce((sum, loan) => sum + loan.monthlyInterest, 0);
  const debtToIncomePct = income ? Math.round((totalLoanMonthlyPayment / income) * 100) : 0;
  const fastestLoan = loanRows.length
    ? [...loanRows].sort((a, b) => {
        const aMonths = Number.isFinite(a.monthsLeft) ? a.monthsLeft : Number.MAX_SAFE_INTEGER;
        const bMonths = Number.isFinite(b.monthsLeft) ? b.monthsLeft : Number.MAX_SAFE_INTEGER;

        return aMonths - bMonths;
      })[0]
    : null;
  const affordabilityAmount = parseMoney(affordabilityForm.amount);
  const affordabilityResult = getAffordabilityResult({
    title: affordabilityForm.title,
    amount: affordabilityAmount,
    freeMoney,
    remainingDays,
  });
  const transactionCategories = transactionForm.type === "income"
    ? data.categories.filter((category) => category === "Lön")
    : data.categories.filter((category) => category !== "Lön");

  const transactionCategoryHasBudget = transactionForm.type === "expense"
    ? budgetCategorySet.has(normalizeCategory(transactionForm.category))
    : false;

  const expensesByCategory = data.categories
    .filter((category) => category !== "Lön")
    .map((category) => {
      const sum = monthTransactions
        .filter((item) => item.type === "expense" && item.category === category)
        .reduce((total, item) => total + item.amount, 0);
      return { category, sum, pct: expenses ? Math.round((sum / expenses) * 100) : 0, color: categoryColors[category] ?? "#637083" };
    })
    .filter((item) => item.sum > 0)
    .sort((a, b) => b.sum - a.sum);

  const donutGradient = expensesByCategory.length
    ? expensesByCategory.reduce((parts, item, index) => {
        const start = expensesByCategory.slice(0, index).reduce((sum, row) => sum + row.pct, 0);
        const end = Math.min(100, start + item.pct);
        return `${parts}${item.color} ${start}% ${end}%,`;
      }, "conic-gradient(").replace(/,$/, ")")
    : "conic-gradient(#26323e 0 100%)";

  const filteredTransactions = monthTransactions
    .filter((item) => categoryFilter === "Alla" || item.category === categoryFilter)
    .filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const freePurchaseTransactions = monthTransactions
    .filter((item) => isFreePurchase(item, budgetCategorySet))
    .filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestPurchase = monthTransactions
    .filter((item) => item.type === "expense")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const nextActiveSubscription = scheduledSubscriptions
    .filter((subscription) => subscription.active && subscription.nextDueDate)
    .sort((a, b) => new Date(`${a.nextDueDate}T12:00:00`).getTime() - new Date(`${b.nextDueDate}T12:00:00`).getTime())[0];
  const activeTravelBudget = data.travelBudgets.find((travel) => travel.id === activeTravelId)
    ?? data.travelBudgets.find(isTravelActive)
    ?? data.travelBudgets[0];
  const activeTravelSpent = activeTravelBudget?.purchases.reduce((sum, purchase) => sum + purchase.amount, 0) ?? 0;
  const activeTravelRemaining = activeTravelBudget ? Math.max(activeTravelBudget.budget - activeTravelSpent, 0) : 0;
  const activeTravelDaysLeft = activeTravelBudget ? daysLeftInTravel(activeTravelBudget.startDate, activeTravelBudget.endDate) : 1;
  const activeTravelPerDay = Math.floor(activeTravelRemaining / Math.max(activeTravelDaysLeft, 1));
  const activeTravelProgress = activeTravelBudget?.budget ? Math.min(100, Math.round((activeTravelSpent / activeTravelBudget.budget) * 100)) : 0;
  const activeTravelStyle = { "--travel-progress": `${activeTravelProgress}%` } as CSSProperties;
  const activeTravelTodaySpent = activeTravelBudget?.purchases
    .filter((purchase) => purchase.date === formatDateInput(new Date()))
    .reduce((sum, purchase) => sum + purchase.amount, 0) ?? 0;
  const activeTravelCategoryRows = activeTravelBudget
    ? ["Mat", "Aktiviteter", "Transport", "Shopping", "Boende", "Övrigt"].map((category) => ({
        category,
        sum: activeTravelBudget.purchases
          .filter((purchase) => purchase.category === category)
          .reduce((total, purchase) => total + purchase.amount, 0),
      })).filter((row) => row.sum > 0)
    : [];

  const budgetRemainingTotal = budgetRows.reduce((sum, budget) => sum + budget.remaining, 0);
  function show(message: string) {
    setNotice(message);
  }

  function scrollToEditor(ref: { current: HTMLFormElement | null }) {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function startNewGoal() {
    setEditingGoalId(null);
    setGoalForm((goal) => ({
      title: goal.title || "",
      saved: goal.saved || "",
      target: goal.target || "",
      linkedSavingsId: goal.linkedSavingsId || "",
    }));
    scrollToEditor(goalEditorRef);
    show("Fyll i ditt nya mål här nere.");
  }

  function startNewSavings() {
    setEditingSavingsId(null);
    setSavingsForm((form) => ({
      name: form.name || "",
      amount: form.amount || "",
    }));
    scrollToEditor(savingsEditorRef);
    show("Fyll i ditt nya sparande här nere.");
  }

  async function syncRemoteSavingsAdjustments(adjustments: Map<string, number>) {
    if (!remoteReady || !adjustments.size) return;

    await Promise.all(data.savings.map(async (saving) => {
      const delta = adjustments.get(saving.id) ?? 0;
      const remoteId = toRemoteId(saving.id);
      if (!delta || !remoteId) return;

      try {
        await updateRemoteSavingsAccount(remoteId, {
          name: saving.name,
          amount: Math.max(0, saving.amount + delta),
        });
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }));
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseMoney(transactionForm.amount);

    if (!transactionForm.title.trim()) {
      show("Skriv vad köpet gäller först.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      show("Skriv ett giltigt belopp, till exempel 129 eller 129,50.");
      return;
    }

    const expenseSource: PurchaseSource = transactionForm.type === "expense" && (
      transactionForm.category === "Fria köp" || !budgetCategorySet.has(normalizeCategory(transactionForm.category))
    )
      ? "free"
      : "budget";
    const transaction = {
      title: transactionForm.title.trim(),
      amount,
      category: transactionForm.category,
      type: transactionForm.type,
      source: transactionForm.type === "expense" ? expenseSource : undefined,
      date: transactionForm.date,
    };

    if (editingTransactionId) {
      const previousTransaction = data.transactions.find((item) => item.id === editingTransactionId) ?? null;
      const nextTransaction: Transaction = { id: editingTransactionId, ...transaction, subscriptionId: previousTransaction?.subscriptionId };
      const savingsAdjustments = getSavingsAdjustments(previousTransaction, nextTransaction, data.savings);
      const remoteId = toRemoteId(editingTransactionId);
      if (remoteReady && remoteId) {
        try {
          await updateRemotePurchase(
            remoteId,
            transaction.title,
            transaction.amount,
            transaction.category,
            toDateTime(transaction.date),
            transaction.source
          );
        } catch (error) {
          console.error(error);
          setRemoteReady(false);
          show("Kunde inte uppdatera i Supabase, ändringen sparades lokalt.");
        }
      }
      await syncRemoteSavingsAdjustments(savingsAdjustments);
      setData((current) => ({
        ...current,
        savings: applySavingsAdjustments(current.savings, savingsAdjustments),
        transactions: current.transactions.map((item) =>
          item.id === editingTransactionId ? { ...item, ...transaction, subscriptionId: item.subscriptionId } : item
        ),
      }));
      setEditingTransactionId(null);
      show("Transaktionen är uppdaterad.");
    } else {
      let id = crypto.randomUUID();
      let savedRemotely = false;
      let remoteFailed = false;

      if (remoteReady) {
        try {
          const created = await addRemotePurchase(
            transaction.title,
            transaction.amount,
            transaction.category,
            undefined,
            toDateTime(transaction.date),
            transaction.source
          ) as RemotePurchase;
          id = String(created.id);
          savedRemotely = true;
        } catch (error) {
          console.error(error);
          remoteFailed = true;
          setRemoteReady(false);
        }
      }

      const nextTransaction: Transaction = { id, ...transaction };
      const savingsAdjustments = getSavingsAdjustments(null, nextTransaction, data.savings);
      await syncRemoteSavingsAdjustments(savingsAdjustments);
      setData((current) => ({
        ...current,
        savings: applySavingsAdjustments(current.savings, savingsAdjustments),
        transactions: [nextTransaction, ...current.transactions],
      }));
      show(savedRemotely || !remoteFailed ? (transaction.type === "income" ? "Inkomst tillagd." : "Köp sparat.") : "Köp sparat lokalt, men Supabase svarade inte.");
    }

    setTransactionForm((form) => ({ ...form, title: "", amount: "" }));
  }

  function editTransaction(transaction: Transaction) {
    setEditingTransactionId(transaction.id);
    setTransactionForm({
      title: transaction.title,
      amount: String(transaction.amount),
      category: transaction.category,
      type: transaction.type,
      source: transaction.source ?? "budget",
      date: transaction.date,
    });
    onNavigate("transactions");
    show("Redigerar transaktion.");
  }

  function cancelTransactionEdit() {
    setEditingTransactionId(null);
    setTransactionForm((form) => ({ ...form, title: "", amount: "" }));
    show("Redigering avbruten.");
  }

  async function removeTransaction(id: string) {
    const transaction = data.transactions.find((item) => item.id === id) ?? null;
    const savingsAdjustments = getSavingsAdjustments(transaction, null, data.savings);
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId) {
      await deleteRemotePurchase(remoteId);
    }

    await syncRemoteSavingsAdjustments(savingsAdjustments);
    setData((current) => ({
      ...current,
      savings: applySavingsAdjustments(current.savings, savingsAdjustments),
      transactions: current.transactions.filter((item) => item.id !== id),
    }));
    if (editingTransactionId === id) {
      cancelTransactionEdit();
    }
    show("Transaktionen togs bort.");
  }

  async function addBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limit = Number(budgetForm.limit);
    if (limit <= 0) return;
    const duplicateBudget = data.budgets.find((budget) =>
      budget.category === budgetForm.category
      && budget.id !== editingBudgetId
    );

    if (editingBudgetId) {
      if (duplicateBudget) {
        show("Det finns redan en budget för den kategorin.");
        return;
      }

      const remoteId = toRemoteId(editingBudgetId);
      if (remoteReady && remoteId) {
        await updateRemoteBudget(remoteId, budgetForm.category, limit);
      }
      setData((current) => ({
        ...current,
        budgets: current.budgets.map((budget) =>
          budget.id === editingBudgetId ? { ...budget, category: budgetForm.category, limit } : budget
        ),
      }));
      setEditingBudgetId(null);
      show("Budgeten är uppdaterad.");
    } else {
      let id = crypto.randomUUID();

      if (duplicateBudget) {
        id = duplicateBudget.id;
        const remoteId = toRemoteId(duplicateBudget.id);
        if (remoteReady && remoteId) {
          await updateRemoteBudget(remoteId, budgetForm.category, limit);
        }
      } else if (remoteReady) {
        const created = await addRemoteBudget(budgetForm.category, limit) as RemoteBudget;
        id = String(created.id);
      }

      setData((current) => ({
        ...current,
        budgets: [
          ...current.budgets.filter((budget) => budget.category !== budgetForm.category),
          { id, category: budgetForm.category, limit },
        ],
      }));
      show("Budgeten är sparad.");
    }

    setBudgetForm((form) => ({ ...form, limit: "" }));
  }

  function editBudget(budget: Budget) {
    setEditingBudgetId(budget.id);
    setBudgetForm({ category: budget.category, limit: String(budget.limit) });
    show("Redigerar budget.");
  }

  function cancelBudgetEdit() {
    setEditingBudgetId(null);
    setBudgetForm((form) => ({ ...form, limit: "" }));
    show("Redigering avbruten.");
  }

  async function removeBudget(id: string) {
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId) {
      await deleteRemoteBudget(remoteId);
    }

    setData((current) => ({ ...current, budgets: current.budgets.filter((budget) => budget.id !== id) }));
    if (editingBudgetId === id) {
      setEditingBudgetId(null);
      setBudgetForm((form) => ({ ...form, limit: "" }));
    }
    show("Budgeten togs bort och fria pengar räknades om.");
  }

  async function addSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseMoney(subscriptionForm.amount);
    const day = clampPaymentDay(Number(subscriptionForm.day));
    const intervalMonths = subscriptionForm.frequency === "custom"
      ? Math.max(1, Math.round(Number(subscriptionForm.intervalMonths)))
      : getSubscriptionIntervalMonths({ frequency: subscriptionForm.frequency });

    if (!subscriptionForm.name.trim() || amount <= 0) return;

    const nextSubscription = {
      name: subscriptionForm.name.trim(),
      plan: subscriptionForm.plan.trim() || "Månadsplan",
      amount,
      day,
      frequency: subscriptionForm.frequency,
      intervalMonths,
      startDate: subscriptionForm.startDate || formatDateInput(new Date()),
    };

    if (editingSubscriptionId) {
      const remoteId = toRemoteId(editingSubscriptionId);
      if (remoteReady && remoteId) {
        const existing = data.subscriptions.find((subscription) => subscription.id === editingSubscriptionId);
        await updateRemoteSubscription(
          remoteId,
          nextSubscription.name,
          nextSubscription.amount,
          nextSubscription.plan,
          nextSubscription.day,
          existing?.active ?? true,
          {
            frequency: nextSubscription.frequency,
            interval_months: nextSubscription.intervalMonths,
            start_date: nextSubscription.startDate,
          }
        );
      }
      setData((current) => ({
        ...current,
        subscriptions: current.subscriptions.map((subscription) =>
          subscription.id === editingSubscriptionId ? { ...subscription, ...nextSubscription } : subscription
        ),
      }));
      setEditingSubscriptionId(null);
      show("Den fasta utgiften är uppdaterad.");
    } else {
      let id = crypto.randomUUID();

      if (remoteReady) {
        const created = await addRemoteSubscription(
          nextSubscription.name,
          nextSubscription.amount,
          nextSubscription.plan,
          nextSubscription.day,
          {
            frequency: nextSubscription.frequency,
            interval_months: nextSubscription.intervalMonths,
            start_date: nextSubscription.startDate,
          }
        ) as RemoteSubscription;
        id = String(created.id);
      }

      setData((current) => ({
        ...current,
        subscriptions: [
          ...current.subscriptions,
          {
            id,
            ...nextSubscription,
            active: true,
          },
        ],
      }));
      show("Den fasta utgiften är tillagd och fria pengar räknades om.");
    }

    setSubscriptionForm(defaultSubscriptionForm());
  }

  function editSubscription(subscription: Subscription) {
    setEditingSubscriptionId(subscription.id);
    setSubscriptionForm({
      name: subscription.name,
      plan: subscription.plan,
      amount: String(subscription.amount),
      day: String(subscription.day),
      frequency: subscription.frequency ?? "monthly",
      intervalMonths: String(subscription.intervalMonths ?? 2),
      startDate: subscription.startDate ?? formatDateInput(new Date()),
    });
    show("Redigerar fast utgift.");
  }

  function cancelSubscriptionEdit() {
    setEditingSubscriptionId(null);
    setSubscriptionForm(defaultSubscriptionForm());
    show("Redigering avbruten.");
  }

  async function toggleSubscription(id: string) {
    const subscription = data.subscriptions.find((item) => item.id === id);
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId && subscription) {
      await updateRemoteSubscription(
        remoteId,
        subscription.name,
        subscription.amount,
        subscription.plan,
        subscription.day,
        !subscription.active,
        {
          frequency: subscription.frequency ?? "monthly",
          interval_months: subscription.intervalMonths ?? 1,
          start_date: subscription.startDate ?? formatDateInput(new Date()),
        }
      );
    }

    setData((current) => ({
      ...current,
      subscriptions: current.subscriptions.map((subscription) =>
        subscription.id === id ? { ...subscription, active: !subscription.active } : subscription
      ),
    }));
    show("Fast utgift uppdaterad och fria pengar räknades om.");
  }

  async function removeSubscription(id: string) {
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId) {
      await deleteRemoteSubscription(remoteId);
    }

    setData((current) => ({ ...current, subscriptions: current.subscriptions.filter((subscription) => subscription.id !== id) }));
    if (editingSubscriptionId === id) {
      setEditingSubscriptionId(null);
      setSubscriptionForm(defaultSubscriptionForm());
    }
    show("Fast utgift togs bort och fria pengar räknades om.");
  }

  async function createSubscriptionExpenses() {
    const existingKeys = new Set(monthTransactions
      .filter((item) => item.category === "Prenumerationer" || item.subscriptionId)
      .flatMap((item) => [
        item.subscriptionId ? `id-${item.subscriptionId}` : "",
        `${normalizeCategory(item.title)}-${item.date}`,
      ])
      .filter(Boolean));
    const newTransactions = scheduledSubscriptions
      .filter((subscription) => subscription.active && subscription.dueDate && !existingKeys.has(`id-${subscription.id}`) && !existingKeys.has(`${normalizeCategory(subscription.name)}-${subscription.dueDate}`))
      .map<Transaction>((subscription) => ({
        id: crypto.randomUUID(),
        title: subscription.name,
        category: "Prenumerationer",
        amount: subscription.amount,
        type: "expense",
        source: "budget",
        subscriptionId: subscription.id,
        date: subscription.dueDate ?? dateForPeriodDay(month, subscription.day),
      }));

    const savedTransactions = remoteReady
      ? await Promise.all(newTransactions.map(async (transaction) => {
          const created = await addRemotePurchase(
            transaction.title,
            transaction.amount,
            transaction.category,
            transaction.subscriptionId ? toRemoteId(transaction.subscriptionId) ?? undefined : undefined,
            toDateTime(transaction.date),
            "budget"
          ) as RemotePurchase;

          return { ...transaction, id: String(created.id) };
        }))
      : newTransactions;

    setData((current) => ({ ...current, transactions: [...savedTransactions, ...current.transactions] }));
    show(newTransactions.length ? `${newTransactions.length} fasta utgifter skapades som transaktioner.` : "Alla månadens fasta utgifter finns redan.");
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name || data.categories.includes(name)) return;

    if (remoteReady) {
      await addRemoteCategory(name, categoryColors[name] ?? "#64748b", "•");
    }

    setData((current) => ({ ...current, categories: [...current.categories, name] }));
    setCategoryName("");
    setTransactionForm((form) => ({ ...form, category: name }));
    show("Kategorin är tillagd.");
  }

  async function removeCategory(name: string) {
    if (lockedCategories.includes(name as (typeof lockedCategories)[number])) {
      show("Den här kategorin behövs av appen och kan inte raderas.");
      return;
    }

    const categoryIsUsed =
      data.transactions.some((transaction) => transaction.category === name) ||
      data.budgets.some((budget) => budget.category === name) ||
      data.subscriptions.some((subscription) => subscription.plan === name) ||
      data.savings.some((saving) => saving.name === name) ||
      data.travelBudgets.some((travelBudget) => travelBudget.purchases.some((purchase) => purchase.category === name));

    if (categoryIsUsed) {
      show("Kategorin används redan. Ta bort eller flytta det som använder kategorin först.");
      return;
    }

    if (remoteReady) {
      await deleteRemoteCategoryByName(name);
    }

    setData((current) => ({
      ...current,
      categories: current.categories.filter((category) => category !== name),
    }));
    setTransactionForm((form) => ({ ...form, category: form.category === name ? "Fria köp" : form.category }));
    setBudgetForm((form) => ({ ...form, category: form.category === name ? data.categories.find((category) => category !== name && !lockedCategories.includes(category as (typeof lockedCategories)[number])) ?? "" : form.category }));
    setCategoryName("");
    show("Kategorin togs bort.");
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = goalForm.title.trim();
    const saved = goalForm.saved.trim() ? parseMoney(goalForm.saved) : 0;
    const target = parseMoney(goalForm.target);
    const linkedSavingsId = goalForm.linkedSavingsId || undefined;

    if (!title) {
      show("Skriv namn på målet först.");
      return;
    }

    if (!Number.isFinite(saved) || saved < 0 || !Number.isFinite(target) || target <= 0) {
      show("Skriv giltiga belopp för sparat och mål.");
      return;
    }

    let id = editingGoalId ?? crypto.randomUUID();

    if (remoteReady) {
      try {
        if (editingGoalId) {
          const remoteId = toRemoteId(editingGoalId);
          if (remoteId) {
            await updateRemoteGoal(remoteId, { title, saved, target });
          }
        } else {
          const created = await addRemoteGoal({ title, saved, target }) as RemoteGoal;
          id = String(created.id);
        }
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    setData((current) => ({
      ...current,
      goals: editingGoalId
        ? current.goals.map((goal) => goal.id === editingGoalId ? { ...goal, title, saved, target, linkedSavingsId } : goal)
        : [...current.goals, { id, title, saved, target, linkedSavingsId }],
    }));
    setGoalForm({ title: "", saved: "", target: "", linkedSavingsId: "" });
    setEditingGoalId(null);
    show(editingGoalId ? "Målet är uppdaterat." : "Nytt mål är skapat.");
  }

  function editGoal(goal: Goal) {
    setEditingGoalId(goal.id);
    setGoalForm({ title: goal.title, saved: String(goal.saved), target: String(goal.target), linkedSavingsId: goal.linkedSavingsId ?? findLinkedSavingsForGoal(goal, data.savings)?.id ?? "" });
    scrollToEditor(goalEditorRef);
    show("Redigerar mål.");
  }

  function cancelGoalEdit() {
    setEditingGoalId(null);
    setGoalForm({ title: "", saved: "", target: "", linkedSavingsId: "" });
    show("Redigering av mål avbruten.");
  }

  async function removeGoal(id: string) {
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId) {
      try {
        await deleteRemoteGoal(remoteId);
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    setData((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }));
    if (editingGoalId === id) {
      cancelGoalEdit();
    }
    show("Målet togs bort.");
  }

  async function addSavings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = savingsForm.name.trim();
    const amount = savingsForm.amount.trim() ? parseMoney(savingsForm.amount) : 0;

    if (!name) {
      show("Skriv namn på sparkontot först.");
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      show("Skriv ett giltigt belopp, till exempel 0, 500 eller 500,50.");
      return;
    }

    const editedSaving = editingSavingsId ? data.savings.find((saving) => saving.id === editingSavingsId) : undefined;
    const duplicateSaving = data.savings.find((saving) =>
      saving.name.toLowerCase() === name.toLowerCase()
      && saving.id !== editingSavingsId
    );

    if (editingSavingsId && !editedSaving) {
      show("Kunde inte hitta sparkontot som redigeras.");
      return;
    }

    if (duplicateSaving) {
      show("Det finns redan ett sparkonto med det namnet.");
      return;
    }

    if (remoteReady && !data.categories.includes(name)) {
      try {
        await addRemoteCategory(name, categoryColors[name] ?? "#22c55e", "💰");
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    let newRemoteId: string | null = null;
    const savingsDate = defaultDateForPeriod(month);
    const linkedSavingsTransaction = editedSaving ? findLinkedSavingsTransaction(editedSaving, data.transactions) : null;
    const savingsSource: PurchaseSource = budgetCategorySet.has(normalizeCategory(name)) ? "budget" : "free";
    const savingsTitle = getSavingsTransactionTitle(name);

    if (remoteReady) {
      try {
        if (editingSavingsId) {
          const remoteId = toRemoteId(editingSavingsId);
          if (remoteId) {
            await updateRemoteSavingsAccount(remoteId, { name, amount });
          }
          const linkedRemoteId = linkedSavingsTransaction ? toRemoteId(linkedSavingsTransaction.id) : null;
          if (linkedRemoteId && linkedSavingsTransaction && linkedSavingsTransaction.category !== name) {
            await updateRemotePurchase(
              linkedRemoteId,
              savingsTitle,
              linkedSavingsTransaction.amount,
              name,
              toDateTime(linkedSavingsTransaction.date),
              linkedSavingsTransaction.source ?? savingsSource
            );
          }
        } else {
          const created = await addRemoteSavingsAccount({ name, amount }) as RemoteSavingsAccount;
          newRemoteId = String(created.id);
        }
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    setData((current) => {
      const savings = editingSavingsId
        ? current.savings.map((saving) =>
            saving.id === editingSavingsId ? { ...saving, name, amount } : saving
          )
        : [...current.savings, { id: newRemoteId ?? crypto.randomUUID(), name, amount, createdAt: savingsDate }];

      return {
        ...current,
        savings,
        transactions: editingSavingsId && linkedSavingsTransaction
          ? current.transactions.map((transaction) =>
              transaction.id === linkedSavingsTransaction.id
                ? {
                    ...transaction,
                    title: savingsTitle,
                    category: name,
                  }
                : transaction
            )
          : current.transactions,
        categories: current.categories.includes(name) ? current.categories : [...current.categories, name],
      };
    });

    setSavingsForm({ name: "", amount: "" });
    setEditingSavingsId(null);
    show(editingSavingsId ? "Sparkontot är uppdaterat." : `Sparkontot ${name} är skapat.`);
  }

  function editSavings(saving: SavingsAccount) {
    setEditingSavingsId(saving.id);
    setSavingsForm({ name: saving.name, amount: String(saving.amount) });
    scrollToEditor(savingsEditorRef);
    show("Redigerar sparkonto.");
  }

  function cancelSavingsEdit() {
    setEditingSavingsId(null);
    setSavingsForm({ name: "", amount: "" });
    show("Redigering av sparkonto avbruten.");
  }

  async function removeSavings(id: string) {
    const saving = data.savings.find((item) => item.id === id);
    const linkedSavingsTransaction = saving ? findLinkedSavingsTransaction(saving, data.transactions) : null;
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId) {
      try {
        await deleteRemoteSavingsAccount(remoteId);
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    const linkedRemoteId = linkedSavingsTransaction ? toRemoteId(linkedSavingsTransaction.id) : null;
    if (remoteReady && linkedRemoteId) {
      try {
        await deleteRemotePurchase(linkedRemoteId);
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    setData((current) => ({
      ...current,
      savings: current.savings.filter((saving) => saving.id !== id),
      transactions: linkedSavingsTransaction
        ? current.transactions.filter((transaction) => transaction.id !== linkedSavingsTransaction.id)
        : current.transactions,
    }));
    if (editingSavingsId === id) {
      cancelSavingsEdit();
    }
    show(linkedSavingsTransaction ? "Sparkontot och kopplad spartransaktion togs bort." : "Sparkontot togs bort.");
  }

  async function upsertLoanSubscription(input: {
    name: string;
    amount: number;
    day: number;
    previousName?: string;
  }) {
    const previousKey = input.previousName ? normalizeCategory(input.previousName) : "";
    const nextKey = normalizeCategory(input.name);
    const existingSubscription = data.subscriptions.find((subscription) =>
      subscription.plan === loanSubscriptionPlan &&
      (normalizeCategory(subscription.name) === previousKey || normalizeCategory(subscription.name) === nextKey)
    );
    const nextSubscription = {
      name: input.name,
      plan: loanSubscriptionPlan,
      amount: input.amount,
      day: input.day,
      frequency: "monthly" as SubscriptionFrequency,
      intervalMonths: 1,
      startDate: existingSubscription?.startDate ?? dateForPeriodDay(month, input.day),
      active: existingSubscription?.active ?? true,
    };
    let id = existingSubscription?.id ?? crypto.randomUUID();

    if (remoteReady) {
      try {
        const remoteId = existingSubscription ? toRemoteId(existingSubscription.id) : null;

        if (remoteId) {
          await updateRemoteSubscription(
            remoteId,
            nextSubscription.name,
            nextSubscription.amount,
            nextSubscription.plan,
            nextSubscription.day,
            nextSubscription.active,
            {
              frequency: nextSubscription.frequency,
              interval_months: nextSubscription.intervalMonths,
              start_date: nextSubscription.startDate,
            }
          );
        } else {
          const created = await addRemoteSubscription(
            nextSubscription.name,
            nextSubscription.amount,
            nextSubscription.plan,
            nextSubscription.day,
            {
              frequency: nextSubscription.frequency,
              interval_months: nextSubscription.intervalMonths,
              start_date: nextSubscription.startDate,
            }
          ) as RemoteSubscription;
          id = String(created.id);
        }
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    return {
      existingId: existingSubscription?.id ?? null,
      subscription: { id, ...nextSubscription },
    };
  }

  function resetLoanForm() {
    setLoanForm({
      name: "",
      remainingAmount: "",
      monthlyPayment: "",
      interestRate: "",
      paymentDay: "25",
    });
    setEditingLoanId(null);
  }

  async function saveLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = loanForm.name.trim();
    const remainingAmount = parseMoney(loanForm.remainingAmount);
    const monthlyPayment = parseMoney(loanForm.monthlyPayment);
    const interestRate = loanForm.interestRate.trim() ? parseMoney(loanForm.interestRate) : 0;
    const paymentDay = clampPaymentDay(Number(loanForm.paymentDay));

    if (!name) {
      show("Skriv namn på lånet först.");
      return;
    }

    if (!Number.isFinite(remainingAmount) || remainingAmount < 0 || !Number.isFinite(monthlyPayment) || monthlyPayment <= 0 || !Number.isFinite(interestRate) || interestRate < 0) {
      show("Skriv giltig skuld, månadsbetalning och ränta.");
      return;
    }

    const input = {
      name,
      remaining_amount: remainingAmount,
      monthly_payment: monthlyPayment,
      interest_rate: interestRate,
      payment_day: paymentDay,
    };
    const previousLoan = editingLoanId
      ? data.loans.find((loan) => loan.id === editingLoanId)
      : undefined;
    const syncedSubscription = await upsertLoanSubscription({
      name,
      amount: monthlyPayment,
      day: paymentDay,
      previousName: previousLoan?.name,
    });

    if (editingLoanId) {
      const remoteId = toRemoteId(editingLoanId);
      if (remoteReady && remoteId) {
        try {
          await updateRemoteLoan(remoteId, input);
        } catch (error) {
          console.error(error);
          setRemoteReady(false);
        }
      }

      setData((current) => ({
        ...current,
        loans: current.loans.map((loan) =>
          loan.id === editingLoanId
            ? { ...loan, name, remainingAmount, monthlyPayment, interestRate, paymentDay }
            : loan
        ),
        subscriptions: syncedSubscription.existingId
          ? current.subscriptions.map((subscription) =>
              subscription.id === syncedSubscription.existingId ? syncedSubscription.subscription : subscription
            )
          : [...current.subscriptions, syncedSubscription.subscription],
      }));
      show("Lånet är uppdaterat.");
    } else {
      let id = crypto.randomUUID();

      if (remoteReady) {
        try {
          const created = await addRemoteLoan(input) as RemoteLoan;
          id = String(created.id);
        } catch (error) {
          console.error(error);
          setRemoteReady(false);
        }
      }

      setData((current) => ({
        ...current,
        loans: [...current.loans, { id, name, remainingAmount, monthlyPayment, interestRate, paymentDay }],
        subscriptions: syncedSubscription.existingId
          ? current.subscriptions.map((subscription) =>
              subscription.id === syncedSubscription.existingId ? syncedSubscription.subscription : subscription
            )
          : [...current.subscriptions, syncedSubscription.subscription],
      }));
      show("Lånet är tillagt.");
    }

    resetLoanForm();
  }

  function editLoan(loan: Loan) {
    setEditingLoanId(loan.id);
    setLoanForm({
      name: loan.name,
      remainingAmount: String(loan.remainingAmount),
      monthlyPayment: String(loan.monthlyPayment),
      interestRate: String(loan.interestRate),
      paymentDay: String(loan.paymentDay),
    });
    show("Redigerar lån.");
  }

  async function removeLoan(id: string) {
    const loan = data.loans.find((item) => item.id === id);
    const linkedSubscription = loan
      ? data.subscriptions.find((subscription) =>
          subscription.plan === loanSubscriptionPlan &&
          normalizeCategory(subscription.name) === normalizeCategory(loan.name)
        )
      : undefined;
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId) {
      try {
        await deleteRemoteLoan(remoteId);
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }
    const linkedSubscriptionRemoteId = linkedSubscription ? toRemoteId(linkedSubscription.id) : null;
    if (remoteReady && linkedSubscriptionRemoteId) {
      try {
        await deleteRemoteSubscription(linkedSubscriptionRemoteId);
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    setData((current) => ({
      ...current,
      loans: current.loans.filter((loan) => loan.id !== id),
      subscriptions: linkedSubscription
        ? current.subscriptions.filter((subscription) => subscription.id !== linkedSubscription.id)
        : current.subscriptions,
    }));
    if (editingLoanId === id) {
      resetLoanForm();
    }
    show("Lånet togs bort.");
  }

  async function saveTravelBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budget = parseMoney(travelForm.budget);

    if (!travelForm.name.trim()) {
      show("Skriv ett namn på resan först.");
      return;
    }

    if (!Number.isFinite(budget) || budget <= 0) {
      show("Skriv en giltig resebudget.");
      return;
    }

    if (travelForm.endDate < travelForm.startDate) {
      show("Slutdatum behöver vara efter startdatum.");
      return;
    }

    if (editingTravelId) {
      const remoteId = toRemoteId(editingTravelId);
      let syncedId: string | null = null;

      if (remoteReady) {
        try {
          if (remoteId) {
            await updateRemoteTravelBudget(remoteId, {
              name: travelForm.name.trim(),
              budget,
              start_date: travelForm.startDate,
              end_date: travelForm.endDate,
              separate_from_free_money: travelForm.separateFromFreeMoney,
            });
          } else {
            const created = await addRemoteTravelBudget({
              name: travelForm.name.trim(),
              budget,
              start_date: travelForm.startDate,
              end_date: travelForm.endDate,
              separate_from_free_money: travelForm.separateFromFreeMoney,
            }) as RemoteTravelBudget;
            syncedId = String(created.id);
          }
        } catch (error) {
          console.error(error);
          setRemoteReady(false);
        }
      }

      setData((current) => ({
        ...current,
        travelBudgets: current.travelBudgets.map((travel) =>
          travel.id === editingTravelId
            ? { ...travel, id: syncedId ?? travel.id, name: travelForm.name.trim(), budget, startDate: travelForm.startDate, endDate: travelForm.endDate, separateFromFreeMoney: travelForm.separateFromFreeMoney }
            : travel
        ),
      }));
      if (syncedId) {
        setActiveTravelId(syncedId);
      }
      setEditingTravelId(null);
      show("Resebudgeten är uppdaterad.");
    } else {
      let id = crypto.randomUUID();

      if (remoteReady) {
        try {
          const created = await addRemoteTravelBudget({
            name: travelForm.name.trim(),
            budget,
            start_date: travelForm.startDate,
            end_date: travelForm.endDate,
            separate_from_free_money: travelForm.separateFromFreeMoney,
          }) as RemoteTravelBudget;
          id = String(created.id);
        } catch (error) {
          console.error(error);
          setRemoteReady(false);
        }
      }

      setData((current) => ({
        ...current,
        travelBudgets: [{ id, name: travelForm.name.trim(), budget, startDate: travelForm.startDate, endDate: travelForm.endDate, separateFromFreeMoney: travelForm.separateFromFreeMoney, purchases: [] }, ...current.travelBudgets],
      }));
      setActiveTravelId(id);
      show("Resebudgeten är skapad.");
    }

    setTravelForm(defaultTravelForm());
  }

  function editTravelBudget(travel: TravelBudget) {
    setEditingTravelId(travel.id);
    setActiveTravelId(travel.id);
    setTravelForm({ name: travel.name, budget: String(travel.budget), startDate: travel.startDate, endDate: travel.endDate, separateFromFreeMoney: travel.separateFromFreeMoney });
    show("Redigerar resebudget.");
  }

  function cancelTravelEdit() {
    setEditingTravelId(null);
    setTravelForm(defaultTravelForm());
    show("Redigering av resebudget avbruten.");
  }

  async function removeTravelBudget(id: string) {
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId) {
      try {
        await deleteRemoteTravelBudget(remoteId);
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    setData((current) => ({ ...current, travelBudgets: current.travelBudgets.filter((travel) => travel.id !== id) }));
    if (editingTravelId === id) {
      cancelTravelEdit();
    }
    show("Resebudgeten togs bort.");
  }

  async function addTravelPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeTravelBudget) {
      show("Skapa en resebudget först.");
      return;
    }

    const amount = parseMoney(travelPurchaseForm.amount);
    if (!travelPurchaseForm.title.trim()) {
      show("Skriv vad reseköpet gäller.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      show("Skriv ett giltigt belopp för reseköpet.");
      return;
    }

    let purchase: TravelPurchase = { id: crypto.randomUUID(), title: travelPurchaseForm.title.trim(), amount, category: travelPurchaseForm.category, date: travelPurchaseForm.date };
    const remoteTravelId = toRemoteId(activeTravelBudget.id);

    if (remoteReady && remoteTravelId) {
      try {
        const created = await addRemoteTravelPurchase({
          travel_budget_id: remoteTravelId,
          title: purchase.title,
          amount: purchase.amount,
          category: purchase.category,
          purchase_date: purchase.date,
        }) as RemoteTravelPurchase;
        purchase = { ...purchase, id: String(created.id) };
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    setData((current) => ({
      ...current,
      travelBudgets: current.travelBudgets.map((travel) => travel.id === activeTravelBudget.id ? { ...travel, purchases: [purchase, ...travel.purchases] } : travel),
    }));
    setTravelPurchaseForm((form) => ({ ...form, title: "", amount: "" }));
    show(activeTravelBudget.separateFromFreeMoney ? "Reseköpet sparades i resebudgeten." : "Reseköpet sparades och påverkar fria pengar.");
  }

  async function removeTravelPurchase(travelId: string, purchaseId: string) {
    const remoteId = toRemoteId(purchaseId);
    if (remoteReady && remoteId) {
      try {
        await deleteRemoteTravelPurchase(remoteId);
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    setData((current) => ({
      ...current,
      travelBudgets: current.travelBudgets.map((travel) => travel.id === travelId ? { ...travel, purchases: travel.purchases.filter((purchase) => purchase.id !== purchaseId) } : travel),
    }));
    show("Reseköpet togs bort.");
  }

  function resetDemo() {
    setData(defaultData);
    setSubscriptionForm(defaultSubscriptionForm());
    setGoalForm({ title: "", saved: "", target: "", linkedSavingsId: "" });
    setSavingsForm({ name: "", amount: "" });
    setTravelForm(defaultTravelForm());
    setTravelPurchaseForm({ title: "", amount: "", category: "Mat", date: formatDateInput(new Date()) });
    setEditingGoalId(null);
    setEditingSavingsId(null);
    setEditingTravelId(null);
    setActiveTravelId(defaultData.travelBudgets[0]?.id ?? null);
    show("Demodata är återställd.");
  }

  function toggleProDemo() {
    setProActive((active) => !active);
    show(proActive ? "Pro-demo är avstängd." : "Pro-demo är aktiverad.");
  }

  const stats = [
    { title: "Totalt saldo", value: kr(actualBalance), change: actualBalance >= 0 ? "+ stabilt" : "- underskott", tail: "efter registrerade köp", color: "green", Icon: WalletCards },
    { title: "Inkomster", value: kr(income), change: income ? "+ registrerat" : "0", tail: "i vald månad", color: "green", Icon: ArrowDownToLine },
    { title: "Utgifter", value: `-${kr(expenses)}`, change: expenses ? "- aktivt" : "0", tail: "i vald månad", color: "purple", Icon: ArrowUpRight },
    { title: "Fria pengar", value: kr(freeMoney), change: `-${kr(freePurchaseSpent)}`, tail: "fria köp", color: "blue", Icon: PiggyBank },
  ];

  const topInsights = [
    freeMoney < 0 ? "Du har använt mer fria pengar än perioden tillåter." : `Du har ${kr(freeMoney)} kvar i fria pengar.`,
    data.subscriptions.length ? `Fasta utgifter denna period är ${kr(fixedExpenseTotal)} och budgetar reserverar ${kr(reservedBudgetTotal)}.` : "Lägg in fasta utgifter för att räkna fria pengar bättre.",
    goalProgress >= 100 ? "Sparmålen är nådda. Dags för nästa mål!" : `Du är ${goalProgress}% på väg mot dina mål. Sparkonton: ${kr(savingsTotal)}.`,
  ];

  const betaChecks = [
    {
      title: "Inloggning",
      status: user ? "ok" : "warning",
      value: user ? "Aktiv" : "Inte inloggad",
      detail: user ? `Privat konto: ${user.email ?? displayName}` : "Logga in för att datan ska vara privat.",
    },
    {
      title: "Supabase-synk",
      status: remoteReady ? "ok" : "warning",
      value: remoteReady ? "Aktiv" : "Lokal fallback",
      detail: remoteReady ? "Appen kan läsa och skriva mot Supabase." : "Kör release-setup.sql eller kontrollera anslutningen.",
    },
    {
      title: "Lokal cache",
      status: lastLocalSave ? "ok" : "warning",
      value: lastLocalSave ? "Sparad" : "Väntar",
      detail: lastLocalSave ? `Senast ${new Date(lastLocalSave).toLocaleString("sv-SE")}` : "Ingen lokal sparning registrerad än.",
    },
    {
      title: "Resebudget",
      status: remoteReady && data.travelBudgets.every((travel) => Boolean(toRemoteId(travel.id))) ? "ok" : "info",
      value: `${data.travelBudgets.length} resor`,
      detail: remoteReady ? "Nya resebudgetar sparas i Supabase." : "Sparar lokalt tills Supabase-tabellerna är redo.",
    },
    {
      title: "Fasta utgifter",
      status: data.subscriptions.some((subscription) => (subscription.frequency ?? "monthly") !== "monthly") ? "ok" : "info",
      value: `${data.subscriptions.length} st`,
      detail: "Stöd för månad, kvartal, halvår, år och eget intervall.",
    },
    {
      title: "Appversion",
      status: "ok",
      value: `v${packageInfo.version}`,
      detail: "Redo för beta-test och Vercel-deploy.",
    },
  ];
  const betaReadyCount = betaChecks.filter((check) => check.status === "ok").length;
  const betaReadiness = Math.round((betaReadyCount / betaChecks.length) * 100);
  const needsOnboarding = Boolean(user && !onboardingDismissed && !income && !data.subscriptions.length && !data.budgets.length);
  const launchChecks = [
    {
      title: "Supabase & privat data",
      status: remoteReady ? "ok" : "warning",
      detail: remoteReady ? "Synk och RLS är aktivt i appen." : "Kontrollera Supabase eller kör release-setup.sql.",
    },
    {
      title: "Onboarding",
      status: onboardingDismissed || !needsOnboarding ? "ok" : "warning",
      detail: "Nya användare får startguide för lön, fast utgift och budget.",
    },
    {
      title: "Export/radera data",
      status: "ok",
      detail: "Användaren kan exportera JSON och radera sin appdata.",
    },
    {
      title: "Mobil/PWA",
      status: "info",
      detail: "Fortsätt testa på iPhone/Android under betan.",
    },
    {
      title: "Juridik",
      status: "warning",
      detail: "Privacy policy, villkor och supportkontakt behöver skrivas innan publik lansering.",
    },
    {
      title: "Feedbackflöde",
      status: "ok",
      detail: "Testare kan rapportera problem och föreslå förbättringar direkt i appen.",
    },
    {
      title: "Senaste build",
      status: "ok",
      detail: `Version ${packageInfo.version}. Lint/build körs innan push.`,
    },
  ];
  const launchReadyCount = launchChecks.filter((check) => check.status === "ok").length;
  const launchReadiness = Math.round((launchReadyCount / launchChecks.length) * 100);

  function completeOnboarding() {
    window.localStorage.setItem(userOnboardingStorageKey, "done");
    setOnboardingDismissed(true);
  }

  function skipOnboarding() {
    completeOnboarding();
    show("Startguiden är avstängd. Du kan alltid lägga in allt manuellt.");
  }

  async function finishOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const incomeAmount = parseMoney(onboardingForm.income);
    const openingBalanceAmount = onboardingForm.openingBalance.trim() ? parseMoney(onboardingForm.openingBalance) : 0;
    const fixedAmount = parseMoney(onboardingForm.fixedAmount);
    const budgetAmount = parseMoney(onboardingForm.budgetAmount);
    const nextTransactions: Transaction[] = [];
    const nextSubscriptions: Subscription[] = [];
    const nextBudgets: Budget[] = [];

    if (Number.isFinite(incomeAmount) && incomeAmount > 0) {
      const transaction = {
        title: "Lön",
        amount: incomeAmount,
        category: "Lön",
        type: "income" as TransactionType,
        date: dateForPeriodDay(month, salaryDay),
      };
      let id = crypto.randomUUID();

      if (remoteReady) {
        try {
          const created = await addRemotePurchase(transaction.title, transaction.amount, transaction.category, undefined, toDateTime(transaction.date)) as RemotePurchase;
          id = String(created.id);
        } catch (error) {
          console.error(error);
          setRemoteReady(false);
        }
      }

      nextTransactions.push({ id, ...transaction });
    }

    if (!Number.isFinite(openingBalanceAmount)) {
      show("Skriv ett giltigt banksaldo vid periodstart, eller lämna rutan tom.");
      return;
    }

    if (remoteReady) {
      try {
        await updateOpeningBalance(openingBalanceAmount);
      } catch (error) {
        console.error(error);
        setRemoteReady(false);
      }
    }

    if (onboardingForm.fixedName.trim() && Number.isFinite(fixedAmount) && fixedAmount > 0) {
      const day = clampPaymentDay(Number(onboardingForm.fixedDay));
      let id = crypto.randomUUID();
      const subscription = {
        name: onboardingForm.fixedName.trim(),
        plan: "Fast utgift",
        amount: fixedAmount,
        day,
        active: true,
        frequency: "monthly" as SubscriptionFrequency,
        intervalMonths: 1,
        startDate: dateForPeriodDay(month, day),
      };

      if (remoteReady) {
        try {
          const created = await addRemoteSubscription(subscription.name, subscription.amount, subscription.plan, subscription.day, {
            frequency: subscription.frequency,
            interval_months: subscription.intervalMonths,
            start_date: subscription.startDate,
          }) as RemoteSubscription;
          id = String(created.id);
        } catch (error) {
          console.error(error);
          setRemoteReady(false);
        }
      }

      nextSubscriptions.push({ id, ...subscription });
    }

    if (Number.isFinite(budgetAmount) && budgetAmount > 0) {
      let id = crypto.randomUUID();
      const budget = { category: onboardingForm.budgetCategory, limit: budgetAmount };

      if (remoteReady) {
        try {
          const created = await addRemoteBudget(budget.category, budget.limit) as RemoteBudget;
          id = String(created.id);
        } catch (error) {
          console.error(error);
          setRemoteReady(false);
        }
      }

      nextBudgets.push({ id, ...budget });
    }

    setData((current) => ({
      ...current,
      openingBalance: openingBalanceAmount,
      transactions: [...nextTransactions, ...current.transactions],
      subscriptions: [...current.subscriptions, ...nextSubscriptions],
      budgets: [...current.budgets.filter((budget) => !nextBudgets.some((nextBudget) => nextBudget.category === budget.category)), ...nextBudgets],
    }));
    setOnboardingForm({ income: "", openingBalance: "", fixedName: "", fixedAmount: "", fixedDay: "1", budgetCategory: "Mat & Livsmedel", budgetAmount: "" });
    completeOnboarding();
    show("Startguiden är klar. Din första ekonomiplan är skapad.");
  }

  function exportUserData() {
    const exportPayload = {
      app: "Oskars Ekonomi",
      version: packageInfo.version,
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        name: displayName,
      },
      month,
      data,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oskars-ekonomi-export-${formatDateInput(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    show("Exporten är nedladdad.");
  }

  async function deleteAllUserData() {
    if (dangerConfirm.trim().toUpperCase() !== "RADERA") {
      show("Skriv RADERA i rutan för att bekräfta.");
      return;
    }

    if (remoteReady) {
      try {
        await deleteCurrentUserData();
      } catch (error) {
        console.error(error);
        show("Kunde inte radera i Supabase. Försök igen innan du lämnar sidan.");
        return;
      }
    }

    window.localStorage.removeItem(userStorageKey);
    window.localStorage.removeItem(`${userStorageKey}-saved-at`);
    window.localStorage.removeItem(userOnboardingStorageKey);
    setData({ ...defaultData, transactions: [], budgets: [], subscriptions: [], goals: [], savings: [], loans: [], travelBudgets: [] });
    setDangerConfirm("");
    setOnboardingDismissed(false);
    show("Din appdata är raderad för den här användaren.");
  }

  function openStat(title: string) {
    if (title === "Totalt saldo") {
      onNavigate("reports");
      return;
    }

    if (title === "Inkomster") {
      setCategoryFilter("Lön");
      onNavigate("transactions");
      return;
    }

    if (title === "Utgifter") {
      setCategoryFilter("Alla");
      onNavigate("transactions");
      return;
    }

    onNavigate("freePurchases");
  }

  function startFreePurchase(title = "") {
    setTransactionForm((form) => ({
      ...form,
      title,
      type: "expense",
      source: "free",
      category: "Fria köp",
    }));
    setCategoryFilter("Alla");
    onNavigate("transactions");
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = authForm.name.trim();
    const email = authForm.email.trim();
    const password = authForm.password;

    if (authMode === "signup" && !name) {
      setAuthMessage("Skriv ditt namn också, så appen kan hälsa rätt.");
      return;
    }

    if (!email || password.length < 6) {
      setAuthMessage("Skriv e-post och minst 6 tecken som lösenord.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    try {
      const authResult = authMode === "signin"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password, name);

      if (authMode === "signup" && !authResult.session) {
        setAuthMode("signin");
        setAuthMessage("Kontot är skapat. Bekräfta mejlet från Supabase om du får ett, och logga sedan in.");
        return;
      }

      setUser(authResult.user);
      setAuthMessage(authMode === "signin" ? "Du är inloggad." : "Kontot är skapat och du är inloggad.");
      setNotice("Inloggad och redo att synka säkert.");
    } catch (error) {
      console.error(error);
      setAuthMessage(authMode === "signin" ? "Kunde inte logga in. Kolla e-post och lösenord." : "Kunde inte skapa konto. Testa annan e-post eller längre lösenord.");
      const errorMessage = getReadableError(error);
      setAuthMessage(authMode === "signin" ? `Kunde inte logga in: ${errorMessage}` : `Kunde inte skapa konto: ${errorMessage}`);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
      setRemoteReady(false);
      setData(defaultData);
      setAuthForm((form) => ({ ...form, password: "" }));
      setNotice("Du är utloggad.");
    } catch (error) {
      console.error(error);
      show("Kunde inte logga ut just nu.");
    }
  }

  async function saveProfileName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = profileNameForm.trim();

    if (!nextName) {
      show("Skriv ett namn först.");
      return;
    }

    try {
      const updatedUser = await updateProfileName(nextName);
      setUser(updatedUser);
      setProfileNameForm(nextName);
      show("Namnet är uppdaterat.");
    } catch (error) {
      console.error(error);
      show(`Kunde inte uppdatera namn: ${getReadableError(error)}`);
    }
  }

  async function saveOpeningBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = openingBalanceForm.trim() ? parseMoney(openingBalanceForm) : 0;

    if (!Number.isFinite(amount)) {
      show("Skriv ett giltigt ingående saldo, till exempel 10000 eller -580.");
      return;
    }

    let savedRemotely = false;
    if (remoteReady) {
      try {
        await updateOpeningBalance(amount);
        savedRemotely = true;
      } catch (error) {
        console.error(error);
      }
    }

    setData((current) => ({ ...current, openingBalance: amount }));
    show(savedRemotely || !remoteReady ? "Ingående saldo är sparat." : "Ingående saldo sparades lokalt. Kör senaste Supabase-SQL om det inte synkas mellan enheter.");
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = feedbackForm.message.trim();

    if (message.length < 5) {
      show("Skriv lite mer feedback först.");
      return;
    }

    try {
      const created = await addRemoteFeedback({
        type: feedbackForm.type,
        message,
        page: activeSection,
        app_version: packageInfo.version,
      }) as SupportTicket;
      setFeedbackForm({ type: "bug", message: "" });
      setSupportTickets((tickets) => [created, ...tickets]);
      show(`Tack! Supportärende #${created.id} är mottaget.`);
    } catch (error) {
      console.error(error);
      const subject = encodeURIComponent(`Oskars Ekonomi feedback: ${feedbackForm.type}`);
      const body = encodeURIComponent(`${message}\n\nSida: ${activeSection}\nVersion: ${packageInfo.version}\nAnvändare: ${user?.email ?? "okänd"}`);
      window.location.href = `mailto:oskarek575@gmail.com?subject=${subject}&body=${body}`;
      show("Feedback-tabellen kunde inte nås, så jag öppnade mail som fallback.");
    }
  }

  async function changeTicketStatus(id: number, status: SupportTicket["status"]) {
    try {
      await updateFeedbackStatus(id, status);
      setSupportTickets((tickets) => tickets.map((ticket) => ticket.id === id ? { ...ticket, status } : ticket));
      show(`Supportärende #${id} är uppdaterat.`);
    } catch (error) {
      console.error(error);
      show(`Kunde inte uppdatera supportärende: ${getReadableError(error)}`);
    }
  }

  if (authLoading && !user) {
    return (
      <div className="dashboard-shell auth-shell">
        <section className="panel auth-card">
          <h1>Oskars Ekonomi</h1>
          <p>Laddar säker inloggning…</p>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-shell auth-shell">
        <section className="panel auth-card">
          <span className="auth-badge">Privat ekonomi</span>
          <h1>{authMode === "signin" ? "Logga in" : "Skapa konto"}</h1>
          <p>Varje person får sin egen data. Supabase-reglerna släpper bara igenom rader som tillhör den inloggade användaren.</p>
          <div className="auth-mode-switch">
            <button className={authMode === "signin" ? "active" : ""} onClick={() => { setAuthMode("signin"); setAuthMessage(""); }} type="button">Logga in</button>
            <button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthMessage(""); }} type="button">Skapa konto</button>
          </div>
          <form onSubmit={handleAuth} className="auth-form">
            {authMode === "signup" && (
              <input
                autoComplete="name"
                name="name"
                placeholder="Ditt namn"
                required
                type="text"
                value={authForm.name}
                onChange={(event) => setAuthForm((form) => ({ ...form, name: event.target.value }))}
              />
            )}
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              placeholder="E-post"
              required
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm((form) => ({ ...form, email: event.target.value }))}
            />
            <input
              autoComplete={authMode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              name="password"
              placeholder="Lösenord"
              required
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm((form) => ({ ...form, password: event.target.value }))}
            />
            <button disabled={authLoading} type="submit">{authLoading ? "Vänta..." : authMode === "signin" ? "Logga in" : "Skapa konto"}</button>
          </form>
          {authMessage && <div className="notice-bar auth-notice">{authMessage}</div>}
          <button
            className="inline-link"
            onClick={() => {
              setAuthMode((mode) => mode === "signin" ? "signup" : "signin");
              setAuthMessage("");
            }}
            type="button"
          >
            {authMode === "signin" ? "Har du inget konto? Skapa ett." : "Har du redan konto? Logga in."}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className={`dashboard-shell theme-${layoutTheme} mobile-${activeSection}`}>
      <header className="topbar">
        <div><h1>{greeting}, {displayName}! <span>👋</span></h1><p>Här är din ekonomiöversikt för idag.</p></div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => show("Du har inga nya notiser just nu.")} type="button"><Bell size={19}/></button>
          <button className="top-avatar" onClick={() => onNavigate("settings")} type="button">{initials}</button>
        </div>
      </header>

      <div className="date-row">
        <label className="month-control"><CalendarDays size={17}/><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /> <ChevronDown size={14}/></label>
        <span className="period-range">{dateFormatter.format(period.start)} – {dateFormatter.format(new Date(period.end.getTime() - 86400000))}</span>
      </div>

      <div className="notice-bar">{notice}</div>

      {needsOnboarding && (
        <OnboardingPanel
          categories={data.categories}
          form={onboardingForm}
          onChange={setOnboardingForm}
          onSubmit={finishOnboarding}
          onSkip={skipOnboarding}
        />
      )}

      {activeSection === "overview" && (
        <>
          <section className="free-money-panel free-money-hero panel" style={freeMoneyStyle}>
            <div>
              <span>Fria pengar</span>
              <strong>{kr(freeMoney)}</strong>
              <p>Kvar att spendera denna period</p>
              <button className="mobile-primary-action" onClick={() => startFreePurchase()} type="button">Lägg till köp</button>
            </div>
            <div className="free-money-ring" aria-hidden="true">
              <WalletCards size={42} />
            </div>
            <div className="free-money-math">
              <span><b>{kr(income)}</b><small>Inkomster</small></span>
              <i>−</i>
              <span><b>{kr(reservedTotal)}</b><small>Reserverat</small></span>
              <i>−</i>
              <span><b>{kr(freePurchaseSpent)}</b><small>Fria köp</small></span>
              {budgetOverspendTotal > 0 && <><i>−</i><span><b>{kr(budgetOverspendTotal)}</b><small>Budget över</small></span></>}
              <i>=</i>
              <span className="result"><b>{kr(freeMoney)}</b><small>Fritt</small></span>
            </div>
            <div className="mobile-spend-pills">
              <span><b>{kr(todayFreePurchaseSpent)}</b><small>Idag</small></span>
              <span><b>{kr(freePurchaseSpent)}</b><small>Period</small></span>
              <span><b>{remainingDays}</b><small>dagar kvar</small></span>
            </div>
          </section>

          <section className="quick-add panel">
            <div>
              <h2>Ny transaktion</h2>
              <p>Registrera inkomst eller köp.</p>
            </div>
            <form onSubmit={addTransaction} className="quick-form">
              <select value={transactionForm.type} onChange={(event) => setTransactionForm((form) => ({ ...form, type: event.target.value as TransactionType, source: "budget", category: event.target.value === "income" ? "Lön" : "Mat & Livsmedel" }))}>
                <option value="expense">Utgift</option>
                <option value="income">Inkomst</option>
              </select>
              <input placeholder={transactionForm.type === "income" ? "Ex. Lön" : "Ex. ICA Kvantum"} value={transactionForm.title} onChange={(event) => setTransactionForm((form) => ({ ...form, title: event.target.value }))} />
              <input inputMode="decimal" placeholder="Belopp" value={transactionForm.amount} onChange={(event) => setTransactionForm((form) => ({ ...form, amount: event.target.value }))} />
              <select value={transactionForm.category} onChange={(event) => setTransactionForm((form) => ({ ...form, category: event.target.value }))}>
                {transactionCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
              {transactionForm.type === "expense" && (
                <span className="form-hint">{transactionCategoryHasBudget ? "Budgeterad kategori" : "Dras från fria pengar"}</span>
              )}
              <input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((form) => ({ ...form, date: event.target.value }))} />
              <button type="submit"><Plus size={17}/> {editingTransactionId ? "Spara ändring" : "Spara"}</button>
              {editingTransactionId && <button className="secondary-action" onClick={cancelTransactionEdit} type="button">Avbryt</button>}
            </form>
            <div className="quick-chip-row" aria-label="Snabba val">
              {["Kaffe", "Lunch", "Bensin", "Mat"].map((title) => (
                <button key={title} onClick={() => startFreePurchase(title)} type="button">{title}</button>
              ))}
            </div>
          </section>

          <section className="stats-grid">
            {stats.map(({ title, value, change, tail, color, Icon }) => (
              <button className="stat-card" key={title} onClick={() => openStat(title)} type="button">
                <div className={`stat-icon ${color}`}><Icon size={19}/></div>
                <span className="stat-label">{title}</span><strong>{value}</strong>
                <p><b className={change.startsWith("-") ? "negative" : "positive"}>{change}</b> {tail}</p>
                <Sparkline color={color === "purple" ? "#8a3ffc" : color === "blue" ? "#1e9fd3" : "#16a34a"}/>
              </button>
            ))}
          </section>

          <section className="mobile-overview-metrics" aria-label="Översikt">
            <button onClick={() => { setCategoryFilter("Lön"); onNavigate("transactions"); }} type="button"><ArrowDownToLine size={22}/><span>Inkomster</span><b>{kr(income)}</b></button>
            <button onClick={() => { setCategoryFilter("Alla"); onNavigate("transactions"); }} type="button"><ArrowUpRight size={22}/><span>Utgifter</span><b>{kr(expenses)}</b></button>
            <button onClick={() => onNavigate("budgets")} type="button"><WalletCards size={22}/><span>Reserverat</span><b>{kr(reservedTotal)}</b></button>
            <button onClick={() => onNavigate("freePurchases")} type="button"><PiggyBank size={22}/><span>Fritt idag</span><b>{kr(freeMoneyPerDay)}</b></button>
          </section>

          <section className="mobile-overview-quick" aria-label="Snabbvy">
            <h2>Snabbvy</h2>
            <button onClick={() => { setCategoryFilter("Alla"); onNavigate("transactions"); }} type="button">
              {latestPurchase ? <TransactionIcon title={latestPurchase.title} category={latestPurchase.category} type={latestPurchase.type} /> : <Logo title="Köp" tone="white" />}
              <span><small>Senaste köp:</small><b>{latestPurchase?.title ?? "Inget köp än"}</b></span>
              <strong>{latestPurchase ? kr(latestPurchase.amount) : "0 kr"}</strong>
              <ChevronRight size={18}/>
            </button>
            <button onClick={() => onNavigate("subscriptions")} type="button">
              <Logo title={nextActiveSubscription?.name ?? "Fast"} tone={nextActiveSubscription?.name === "Netflix" ? "black" : "blue"} />
              <span><small>Nästa fasta utgift:</small><b>{nextActiveSubscription?.name ?? "Ingen aktiv"}</b></span>
              <strong>{nextActiveSubscription ? `${kr(nextActiveSubscription.amount)}, ${nextActiveSubscription.nextDueDate ? new Date(`${nextActiveSubscription.nextDueDate}T12:00:00`).toLocaleDateString("sv-SE") : `dag ${nextActiveSubscription.day}`}` : "0 kr"}</strong>
              <ChevronRight size={18}/>
            </button>
          </section>

          <section className="main-grid">
            <div className="left-stack">
              <article className="panel category-panel">
                <CardTitle>Utgifter per kategori <span className="period">Denna månad</span></CardTitle>
                <div className="category-body">
                  <div className="donut" style={{ background: donutGradient }}><div><strong>{kr(expenses)}</strong><span>Totala utgifter</span></div></div>
                  <div className="category-list">{expensesByCategory.length ? expensesByCategory.map((item) => <button className="category-item" key={item.category} onClick={() => { setCategoryFilter(item.category); onNavigate("transactions"); }} type="button"><i style={{background: item.color}}/><span>{item.category}</span><b>{kr(item.sum)}</b><small>{item.pct}%</small></button>) : <EmptyState text="Inga utgifter den här månaden." />}</div>
                </div>
                <button className="wide-button" onClick={() => onNavigate("categories")} type="button">Visa alla kategorier <ArrowRight size={15}/></button>
              </article>

              <div className="dual-grid">
                <article className="panel list-panel">
                  <CardTitle link="Visa alla" onClick={() => onNavigate("transactions")}>Senaste transaktioner</CardTitle>
                  <div className="transaction-list">{filteredTransactions.slice(0, 5).map((item) => <div className="list-row" key={item.id}><TransactionIcon title={item.title} category={item.category} type={item.type} /><span className="row-copy"><b>{item.title}</b><CategoryMeta category={item.category} type={item.type}/></span><span className={`row-value ${item.type === "income" ? "plus" : "minus"}`}><b>{item.type === "income" ? "+" : "-"}{kr(item.amount)}</b><small>{new Date(item.date).toLocaleDateString("sv-SE")}</small></span></div>)}</div>
                  <button className="wide-button" onClick={() => onNavigate("transactions")} type="button">Visa alla transaktioner <ArrowRight size={15}/></button>
                </article>
                <article className="panel list-panel">
                  <CardTitle link="Visa alla" onClick={() => onNavigate("budgets")}>Budgetöversikt</CardTitle>
                  <div className="budget-list">{budgetRows.map((budget) => <div className="budget-row" key={budget.id}><span className="budget-icon">⚑</span><div><span className="budget-meta"><b>{budget.category}</b><small>{budget.overspent ? `${kr(budget.overspent)} över` : `${kr(budget.remaining)} kvar`}</small></span><small>{kr(budget.used)} använt av {kr(budget.limit)}</small><div className="progress"><i style={{width: `${budget.pct}%`}}/></div></div></div>)}</div>
                  <button className="wide-button" onClick={() => onNavigate("budgets")} type="button">Visa alla budgetar <ArrowRight size={15}/></button>
                </article>
              </div>
            </div>

            <div className="right-stack">
              <InsightsPanel insights={topInsights} onNavigate={onNavigate} affordabilityForm={affordabilityForm} onAffordabilityChange={setAffordabilityForm} affordabilityResult={affordabilityResult} />
              <SubscriptionsPanel subscriptions={scheduledSubscriptions} onNavigate={onNavigate} onGenerate={createSubscriptionExpenses} onEdit={editSubscription} onToggle={toggleSubscription} onRemove={removeSubscription} />
            </div>
          </section>

          <GoalPanel goals={data.goals} savings={data.savings} savingsTotal={savingsTotal} manualGoalsSaved={manualGoalsSaved} goalsTargetTotal={goalsTargetTotal} goalSavedTotal={goalSavedTotal} goalProgress={goalProgress} onNavigate={onNavigate} />
        </>
      )}

      {activeSection === "transactions" && (
        <SectionPanel title="Transaktioner" description="Lägg till alla köp och inkomster här. Appen avgör automatiskt om köpet går mot en budget eller fria pengar.">
          <form className="management-form purchase-form" onSubmit={addTransaction}>
            <select value={transactionForm.type} onChange={(event) => setTransactionForm((form) => ({ ...form, type: event.target.value as TransactionType, source: "budget", category: event.target.value === "income" ? "Lön" : "Mat & Livsmedel" }))}>
              <option value="expense">Köp / utgift</option>
              <option value="income">Inkomst</option>
            </select>
            <input placeholder={transactionForm.type === "income" ? "Ex. Lön" : "Ex. Willys"} value={transactionForm.title} onChange={(event) => setTransactionForm((form) => ({ ...form, title: event.target.value }))} />
            <input inputMode="decimal" placeholder="Belopp" value={transactionForm.amount} onChange={(event) => setTransactionForm((form) => ({ ...form, amount: event.target.value }))} />
            <select value={transactionForm.category} onChange={(event) => setTransactionForm((form) => ({ ...form, category: event.target.value }))}>
              {transactionCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
            {transactionForm.type === "expense" && <span className="form-hint">{transactionCategoryHasBudget ? "Budgeterad kategori" : "Dras från fria pengar"}</span>}
            <input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((form) => ({ ...form, date: event.target.value }))} />
            <button type="submit"><Plus size={16}/> {editingTransactionId ? "Spara ändring" : "Skapa köp"}</button>
            {editingTransactionId && <button className="secondary-action" onClick={cancelTransactionEdit} type="button">Avbryt</button>}
          </form>
          <div className="tool-row filters-only"><label><Search size={16}/><input placeholder="Sök transaktion..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>Alla</option>{data.categories.map((category) => <option key={category}>{category}</option>)}</select></div>
          <div className="data-table">{filteredTransactions.map((item) => <div className="table-row transaction-table-row" key={item.id}><span className="transaction-copy"><TransactionIcon title={item.title} category={item.category} type={item.type}/><span><b>{item.title}</b><CategoryMeta category={item.category} type={item.type} suffix={new Date(item.date).toLocaleDateString("sv-SE")}/></span></span><strong className={item.type === "income" ? "plus" : "minus"}>{item.type === "income" ? "+" : "-"}{kr(item.amount)}</strong><span className="row-actions"><button onClick={() => editTransaction(item)} type="button">Redigera</button><button onClick={() => removeTransaction(item.id)} type="button"><Trash2 size={16}/></button></span></div>)}</div>
        </SectionPanel>
      )}

      {activeSection === "freePurchases" && (
        <SectionPanel title="Fria köp" description="Köp och sparande i kategorier som inte har en egen budget dras från fria pengar.">
          <div className="free-money-panel compact panel" style={freeMoneyStyle}>
            <div><span>Kvar att handla för</span><strong>{kr(freeMoney)}</strong></div>
            <div className="free-money-math"><span><b>{kr(income)}</b><small>Inkomst</small></span><i>−</i><span><b>{kr(reservedTotal)}</b><small>Reserverat</small></span><i>−</i><span><b>{kr(freePurchaseSpent)}</b><small>Fria köp</small></span>{budgetOverspendTotal > 0 && <><i>−</i><span><b>{kr(budgetOverspendTotal)}</b><small>Budget över</small></span></>}<i>=</i><span className="result"><b>{kr(freeMoney)}</b><small>Kvar</small></span></div>
          </div>
          <article className="single-purchase-entry panel">
            <div>
              <span>Alla köp på ett ställe</span>
              <b>Lägg in nya köp under Transaktioner</b>
              <small>Välj en kategori med budget så räknas köpet mot budgeten. Välj en kategori utan budget så dras det från fria pengar.</small>
            </div>
            <button onClick={() => { setTransactionForm((form) => ({ ...form, type: "expense", category: form.category === "Lön" ? "Fria köp" : form.category })); setCategoryFilter("Alla"); onNavigate("transactions"); }} type="button">
              <Plus size={16}/> Lägg till köp
            </button>
          </article>
          <div className="tool-row filters-only"><label><Search size={16}/><input placeholder="Sök fria köp..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          <div className="data-table">{freePurchaseTransactions.map((item) => <div className="table-row transaction-table-row" key={item.id}><span className="transaction-copy"><TransactionIcon title={item.title} category={item.category} type={item.type}/><span><b>{item.title}</b><CategoryMeta category={item.category} type={item.type} suffix={`fria pengar · ${new Date(item.date).toLocaleDateString("sv-SE")}`}/></span></span><strong className="minus">-{kr(item.amount)}</strong><span className="row-actions"><button onClick={() => editTransaction(item)} type="button">Redigera</button><button onClick={() => removeTransaction(item.id)} type="button"><Trash2 size={16}/></button></span></div>)}</div>
        </SectionPanel>
      )}

      {activeSection === "budgets" && (
        <SectionPanel title="Budget" description="Sätt en månadsgräns per kategori.">
          <div className="free-money-panel compact panel">
            <div><span>Fria pengar</span><strong>{kr(freeMoney)}</strong></div>
            <div className="free-money-math"><span><b>{kr(income)}</b><small>Inkomst</small></span><i>−</i><span><b>{kr(reservedTotal)}</b><small>Reserverat</small></span><i>−</i><span><b>{kr(freePurchaseSpent)}</b><small>Fria köp</small></span>{budgetOverspendTotal > 0 && <><i>−</i><span><b>{kr(budgetOverspendTotal)}</b><small>Budget över</small></span></>}<i>=</i><span className="result"><b>{kr(freeMoney)}</b><small>Fritt</small></span></div>
          </div>
          <form className="management-form budget-form" onSubmit={addBudget}><select value={budgetForm.category} onChange={(event) => setBudgetForm((form) => ({ ...form, category: event.target.value }))}>{data.categories.filter((category) => !["Lön", "Fria köp", "Prenumerationer"].includes(category)).map((category) => <option key={category}>{category}</option>)}</select><input inputMode="numeric" placeholder="Månadsbudget" value={budgetForm.limit} onChange={(event) => setBudgetForm((form) => ({ ...form, limit: event.target.value }))}/><button type="submit"><Plus size={16}/> {editingBudgetId ? "Spara ändring" : "Spara budget"}</button>{editingBudgetId && <button className="secondary-action" onClick={cancelBudgetEdit} type="button">Avbryt</button>}</form>
          <div className="data-table">{budgetRows.map((budget) => <div className="table-row budget-table-row" key={budget.id}><span><b>{budget.category}</b><small>{kr(budget.used)} använt · {budget.overspent ? `${kr(budget.overspent)} över budget` : `${kr(budget.remaining)} kvar inom budgeten`}</small></span><div className="table-progress"><i style={{ width: `${budget.pct}%` }}/></div><strong>{kr(budget.limit)} reserverat</strong><span className="row-actions"><button onClick={() => editBudget(budget)} type="button">Redigera</button><button onClick={() => removeBudget(budget.id)} type="button"><Trash2 size={16}/></button></span></div>)}</div>
        </SectionPanel>
      )}

      {activeSection === "categories" && (
        <SectionPanel title="Kategorier" description="Skapa och välj egna kategorier.">
          <form className="management-form" onSubmit={addCategory}><input placeholder="Ny kategori, t.ex. Hund" value={categoryName} onChange={(event) => setCategoryName(event.target.value)}/><button type="submit"><Plus size={16}/> Lägg till kategori</button></form>
          <div className="chip-grid category-chip-grid">
            {data.categories.map((category) => {
              const isLocked = lockedCategories.includes(category as (typeof lockedCategories)[number]);

              return (
                <div className="category-chip" key={category} style={{ borderColor: categoryColors[category] ?? "#334155" }}>
                  <button className="category-chip-main" onClick={() => { setTransactionForm((form) => ({ ...form, category })); onNavigate("overview"); }} type="button">{category}</button>
                  {!isLocked && (
                    <button className="category-chip-delete" aria-label={`Radera ${category}`} onClick={() => removeCategory(category)} type="button">
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </SectionPanel>
      )}

      {activeSection === "goals" && (
        <SectionPanel title="Mål & sparande" description="Följ dina mål, sparkonton och hur nära du är nästa milstolpe.">
          <section className="savings-portfolio-hero panel" style={{ "--goal-progress": `${goalProgress}%` } as CSSProperties}>
            <div className="savings-hero-copy">
              <span>Sparportfölj</span>
              <h2>{kr(goalSavedTotal)}</h2>
              <p>{goalsTargetTotal ? `${goalProgress}% mot dina mål · ${kr(goalsRemainingTotal)} kvar` : "Skapa ditt första mål och börja bygga något."}</p>
              <div className="savings-hero-actions" onClick={(event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const button = target.closest("button");
                if (!button) return;
                const index = Array.from(button.parentElement?.children ?? []).indexOf(button);
                if (index === 0) startNewGoal();
                if (index === 1) startNewSavings();
              }}>
                <button onClick={() => setGoalForm((goal) => ({ ...goal, title: goal.title || "Resa 2027" }))} type="button"><Crosshair size={16}/> Nytt mål</button>
                <button onClick={() => setSavingsForm((form) => ({ ...form, name: form.name || "Sparkonto" }))} type="button"><PiggyBank size={16}/> Lägg till sparande</button>
              </div>
            </div>
            <div className="savings-hero-ring" aria-hidden="true">
              <strong>{goalProgress}%</strong>
              <small>klart</small>
            </div>
          </section>

          <section className="savings-metric-grid">
            <div><span>Totalt sparat</span><b>{kr(goalSavedTotal)}</b><small>Mål + sparkonton</small></div>
            <div><span>Kvar till mål</span><b>{kr(goalsRemainingTotal)}</b><small>{data.goals.length} aktiva mål</small></div>
            <div><span>Sparat denna period</span><b>{kr(savingsThisPeriod)}</b><small>Registrerade spartransaktioner</small></div>
            <div><span>Närmast klart</span><b>{strongestGoal ? `${strongestGoalProgress}%` : "0%"}</b><small>{strongestGoal?.title ?? "Inget mål ännu"}</small></div>
          </section>

          <section className="premium-savings-layout">
            <article className="premium-savings-panel">
              <CardTitle>Dina mål</CardTitle>
              <div className="premium-goal-grid">
                {data.goals.length ? data.goals.map((goal) => {
                  const linkedSaving = findLinkedSavingsForGoal(goal, data.savings);
                  const savedAmount = getGoalDisplaySavedAmount(goal, data.goals, data.savings);
                  const usesSavingsPool = !linkedSaving && data.goals.length === 1 && data.savings.length > 0;
                  const progress = goal.target ? Math.min(100, Math.round((savedAmount / goal.target) * 100)) : 0;
                  const remaining = Math.max(goal.target - savedAmount, 0);

                  return (
                    <div className="premium-goal-card" key={goal.id}>
                      <div className="premium-goal-top">
                        <span><Crosshair size={18}/></span>
                        <small>{progress >= 100 ? "Mål nått" : `${kr(remaining)} kvar`}</small>
                      </div>
                      <h3>{goal.title}</h3>
                      <strong>{kr(savedAmount)}</strong>
                      <p>av {kr(goal.target)}{linkedSaving ? ` · kopplat till ${linkedSaving.name}` : usesSavingsPool ? " · kopplat till sparpott" : ""}</p>
                      <div className="premium-progress"><i style={{ width: `${progress}%` }}/></div>
                      <div className="premium-card-actions">
                        <button onClick={() => editGoal(goal)} type="button">Redigera</button>
                        <button onClick={() => removeGoal(goal.id)} type="button"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  );
                }) : <EmptyState text="Skapa ditt första mål och låt appen visa hur nära du är." />}
              </div>
            </article>

            <article className="premium-savings-panel">
              <CardTitle>Sparkonton</CardTitle>
              <div className="premium-account-list">
                {data.savings.length ? data.savings.map((saving) => (
                  <div className="premium-account-card" key={saving.id}>
                    <span><PiggyBank size={18}/></span>
                    <div><b>{saving.name}</b><small>Räknas med i totalt sparat</small></div>
                    <strong>{kr(saving.amount)}</strong>
                    <button onClick={() => editSavings(saving)} type="button">Redigera</button>
                    <button onClick={() => removeSavings(saving.id)} type="button"><Trash2 size={14}/></button>
                  </div>
                )) : <EmptyState text="Lägg till ett sparkonto för att följa pengar du flyttar undan." />}
              </div>
            </article>
          </section>

          <section className="premium-editor-grid">
            <form className="premium-editor-card" onSubmit={saveGoal} ref={goalEditorRef}>
              <div><span>Mål</span><b>{editingGoalId ? "Redigera mål" : "Skapa nytt mål"}</b></div>
              <input placeholder="Mål, t.ex. Resa 2027" value={goalForm.title} onChange={(event) => setGoalForm((goal) => ({ ...goal, title: event.target.value }))}/>
              <select value={goalForm.linkedSavingsId} onChange={(event) => setGoalForm((goal) => ({ ...goal, linkedSavingsId: event.target.value }))}>
                <option value="">Koppla sparkonto automatiskt</option>
                {data.savings.map((saving) => <option key={saving.id} value={saving.id}>{saving.name}</option>)}
              </select>
              <input inputMode="decimal" placeholder="Manuellt sparat om inget sparkonto finns" value={goalForm.saved} onChange={(event) => setGoalForm((goal) => ({ ...goal, saved: event.target.value }))}/>
              <input inputMode="decimal" placeholder="Målsumma" value={goalForm.target} onChange={(event) => setGoalForm((goal) => ({ ...goal, target: event.target.value }))}/>
              <button type="submit"><Edit3 size={16}/> {editingGoalId ? "Spara mål" : "Skapa mål"}</button>
              {editingGoalId && <button className="secondary-action" onClick={cancelGoalEdit} type="button">Avbryt</button>}
            </form>

            <form className="premium-editor-card" onSubmit={addSavings} ref={savingsEditorRef}>
              <div><span>Sparkonto</span><b>{editingSavingsId ? "Redigera sparkonto" : "Skapa sparkonto"}</b></div>
              <input placeholder="Sparkonto, t.ex. Resa 2027" value={savingsForm.name} onChange={(event) => setSavingsForm((form) => ({ ...form, name: event.target.value }))}/>
              <input inputMode="decimal" placeholder={editingSavingsId ? "Totalt saldo" : "Startsaldo, t.ex. 0"} value={savingsForm.amount} onChange={(event) => setSavingsForm((form) => ({ ...form, amount: event.target.value }))}/>
              <button type="submit"><Plus size={16}/> {editingSavingsId ? "Spara sparkonto" : "Skapa sparkonto"}</button>
              {editingSavingsId && <button className="secondary-action" onClick={cancelSavingsEdit} type="button">Avbryt</button>}
            </form>
          </section>
        </SectionPanel>
      )}

      {activeSection === "loans" && (
        <SectionPanel title="Lån" description="Se hur mycket du är skyldig, vad lånen kostar varje månad och ungefär när de är färdigbetalda.">
          <LoansSection
            loansCount={data.loans.length}
            totalDebt={totalLoanDebt}
            totalMonthlyPayment={totalLoanMonthlyPayment}
            totalMonthlyInterest={totalLoanMonthlyInterest}
            debtToIncomePct={income ? debtToIncomePct : 0}
            fastestLoan={fastestLoan}
            loanRows={loanRows}
            loanForm={loanForm}
            editingLoanId={editingLoanId}
            onLoanFormChange={setLoanForm}
            onSaveLoan={saveLoan}
            onResetLoanForm={resetLoanForm}
            onEditLoan={editLoan}
            onRemoveLoan={removeLoan}
            formatCurrency={kr}
            formatLoanTime={formatLoanTime}
            CardTitle={CardTitle}
            EmptyState={EmptyState}
          />
        </SectionPanel>
      )}
      {activeSection === "travel" && (
        <SectionPanel title="Resebudget" description="Håll koll på vad du faktiskt kan spendera när du är iväg.">
          {activeTravelBudget ? (
            <article className="travel-hero" style={activeTravelStyle}>
              <div>
                <span>Aktiv resa</span>
                <h3>{activeTravelBudget.name}</h3>
                <strong>{kr(activeTravelRemaining)}</strong>
                <p>{kr(activeTravelPerDay)} per dag · {activeTravelDaysLeft} dagar kvar</p>
              </div>
              <div className="travel-ring"><Plane size={38}/></div>
              <div className="travel-mini-stats">
                <span><b>{kr(activeTravelBudget.budget)}</b><small>Total budget</small></span>
                <span><b>{kr(activeTravelSpent)}</b><small>Spenderat</small></span>
                <span><b>{kr(activeTravelTodaySpent)}</b><small>Idag</small></span>
              </div>
            </article>
          ) : (
            <EmptyState text="Skapa din första resebudget för att komma igång." />
          )}

          <div className="travel-layout">
            <form className="management-form travel-form" onSubmit={saveTravelBudget}>
              <input placeholder="Resa, t.ex. Mallorca 2026" value={travelForm.name} onChange={(event) => setTravelForm((form) => ({ ...form, name: event.target.value }))}/>
              <input inputMode="decimal" placeholder="Total resebudget" value={travelForm.budget} onChange={(event) => setTravelForm((form) => ({ ...form, budget: event.target.value }))}/>
              <input type="date" value={travelForm.startDate} onChange={(event) => setTravelForm((form) => ({ ...form, startDate: event.target.value }))}/>
              <input type="date" value={travelForm.endDate} onChange={(event) => setTravelForm((form) => ({ ...form, endDate: event.target.value }))}/>
              <label className="toggle-row"><input checked={travelForm.separateFromFreeMoney} type="checkbox" onChange={(event) => setTravelForm((form) => ({ ...form, separateFromFreeMoney: event.target.checked }))}/><span>Resan är redan avsatt</span></label>
              <button type="submit"><Plus size={16}/> {editingTravelId ? "Spara resa" : "Skapa resa"}</button>
              {editingTravelId && <button className="secondary-action" onClick={cancelTravelEdit} type="button">Avbryt</button>}
            </form>

            {activeTravelBudget && (
              <form className="management-form travel-purchase-form" onSubmit={addTravelPurchase}>
                <input placeholder="Ex. lunch, taxi, museum" value={travelPurchaseForm.title} onChange={(event) => setTravelPurchaseForm((form) => ({ ...form, title: event.target.value }))}/>
                <input inputMode="decimal" placeholder="Belopp" value={travelPurchaseForm.amount} onChange={(event) => setTravelPurchaseForm((form) => ({ ...form, amount: event.target.value }))}/>
                <select value={travelPurchaseForm.category} onChange={(event) => setTravelPurchaseForm((form) => ({ ...form, category: event.target.value }))}>
                  {["Mat", "Aktiviteter", "Transport", "Shopping", "Boende", "Övrigt"].map((category) => <option key={category}>{category}</option>)}
                </select>
                <input type="date" value={travelPurchaseForm.date} onChange={(event) => setTravelPurchaseForm((form) => ({ ...form, date: event.target.value }))}/>
                <button type="submit"><Plus size={16}/> Lägg till reseköp</button>
              </form>
            )}
          </div>

          <div className="travel-content-grid">
            <article className="panel travel-list-panel">
              <CardTitle>Resor</CardTitle>
              <div className="data-table">
                {data.travelBudgets.map((travel) => {
                  const spent = travel.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
                  const remaining = Math.max(travel.budget - spent, 0);
                  return (
                    <div className={`table-row travel-table-row ${travel.id === activeTravelBudget?.id ? "active" : ""}`} key={travel.id}>
                      <span><b>{travel.name}</b><small>{travel.startDate} – {travel.endDate} · {travel.separateFromFreeMoney ? "separat från fria pengar" : "påverkar fria pengar"}</small></span>
                      <strong>{kr(remaining)} kvar</strong>
                      <span className="row-actions"><button onClick={() => setActiveTravelId(travel.id)} type="button">Visa</button><button onClick={() => editTravelBudget(travel)} type="button">Redigera</button><button onClick={() => removeTravelBudget(travel.id)} type="button"><Trash2 size={14}/></button></span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="panel travel-list-panel">
              <CardTitle>Reseköp</CardTitle>
              <div className="data-table">
                {activeTravelBudget?.purchases.length ? activeTravelBudget.purchases.map((purchase) => (
                  <div className="table-row transaction-table-row" key={purchase.id}>
                    <span><b>{purchase.title}</b><small>{purchase.category} · {new Date(purchase.date).toLocaleDateString("sv-SE")}</small></span>
                    <strong className="minus">-{kr(purchase.amount)}</strong>
                    <span className="row-actions"><button onClick={() => removeTravelPurchase(activeTravelBudget.id, purchase.id)} type="button"><Trash2 size={14}/></button></span>
                  </div>
                )) : <EmptyState text="Inga reseköp ännu." />}
              </div>
            </article>
          </div>

          {activeTravelCategoryRows.length > 0 && (
            <div className="travel-category-row">
              {activeTravelCategoryRows.map((row) => <span key={row.category}><b>{row.category}</b><small>{kr(row.sum)}</small></span>)}
            </div>
          )}
        </SectionPanel>
      )}

      {activeSection === "subscriptions" && (
        <SectionPanel title="Fasta utgifter" description="Hyra, försäkring, lån, abonnemang och andra återkommande kostnader.">
          <form className="management-form subscription-form scheduled-subscription-form" onSubmit={addSubscription}>
            <input placeholder="Namn" value={subscriptionForm.name} onChange={(event) => setSubscriptionForm((form) => ({ ...form, name: event.target.value }))}/>
            <input placeholder="Typ / plan" value={subscriptionForm.plan} onChange={(event) => setSubscriptionForm((form) => ({ ...form, plan: event.target.value }))}/>
            <input inputMode="decimal" placeholder="Belopp" value={subscriptionForm.amount} onChange={(event) => setSubscriptionForm((form) => ({ ...form, amount: event.target.value }))}/>
            <label className="form-field">
              <span>Dragdatum</span>
              <input type="date" value={subscriptionForm.startDate} onChange={(event) => {
                const nextDate = event.target.value;
                const nextDay = nextDate ? String(new Date(`${nextDate}T12:00:00`).getDate()) : subscriptionForm.day;
                setSubscriptionForm((form) => ({ ...form, startDate: nextDate, day: nextDay }));
              }}/>
            </label>
            <label className="form-field">
              <span>Dag i månaden</span>
              <input inputMode="numeric" min="1" max="28" value={subscriptionForm.day} onChange={(event) => setSubscriptionForm((form) => ({ ...form, day: event.target.value }))}/>
            </label>
            <select value={subscriptionForm.frequency} onChange={(event) => setSubscriptionForm((form) => ({ ...form, frequency: event.target.value as SubscriptionFrequency }))}>
              {subscriptionFrequencies.map((frequency) => <option key={frequency.id} value={frequency.id}>{frequency.label}</option>)}
            </select>
            {subscriptionForm.frequency === "custom" && (
              <input inputMode="numeric" min="1" placeholder="Var X:e månad" value={subscriptionForm.intervalMonths} onChange={(event) => setSubscriptionForm((form) => ({ ...form, intervalMonths: event.target.value }))}/>
            )}
            <button type="submit"><Plus size={16}/> {editingSubscriptionId ? "Spara ändring" : "Skapa ny utgift"}</button>
            {editingSubscriptionId && <button className="secondary-action" onClick={cancelSubscriptionEdit} type="button">Avbryt</button>}
          </form>
          <button className="wide-button action-wide" onClick={createSubscriptionExpenses} type="button">Skapa månadens fasta utgifter som transaktioner <ArrowRight size={15}/></button>
          <SubscriptionsPanel subscriptions={scheduledSubscriptions} onNavigate={onNavigate} onGenerate={createSubscriptionExpenses} onEdit={editSubscription} onToggle={toggleSubscription} onRemove={removeSubscription} showAll />
        </SectionPanel>
      )}

      {activeSection === "insights" && <SectionPanel title="AI Insights" description="Smarta sammanfattningar baserat på det du lagt in."><InsightsPanel insights={topInsights} onNavigate={onNavigate} affordabilityForm={affordabilityForm} onAffordabilityChange={setAffordabilityForm} affordabilityResult={affordabilityResult} expanded /></SectionPanel>}

      {activeSection === "reports" && (
        <SectionPanel title="Rapporter" description={`Sammanfattning för ${monthFormatter.format(monthDate)}.`}>
          <div className="report-grid"><div><span>Inkomster</span><b>{kr(income)}</b></div><div><span>Reserverat</span><b>{kr(reservedTotal)}</b></div><div><span>Fria pengar</span><b>{kr(freeMoney)}</b></div><div><span>Faktiskt saldo</span><b>{kr(actualBalance)}</b></div></div>
          <article className="balance-analysis-panel">
            <button className="balance-analysis-toggle" onClick={() => setShowBalanceAnalysis((value) => !value)} type="button" aria-expanded={showBalanceAnalysis}>
              <div>
                <span>Saldoanalys</span>
                <b>Varför är aktuellt saldo {kr(actualBalance)}?</b>
                <small>Här bryts saldot ner så du kan se exakt vad som drar pengar utanför budget kvar och fria pengar.</small>
              </div>
              <strong className={actualBalance >= 0 ? "plus" : "minus"}>{kr(actualBalance)}</strong>
            </button>
            {showBalanceAnalysis && (
              <div className="balance-analysis-details">
            <div className="balance-comparison-grid">
              <div><span>Budget kvar</span><b>{kr(budgetRemainingTotal)}</b><small>Alla budgetar som inte är slut</small></div>
              <div><span>Fria pengar</span><b>{kr(freeMoney)}</b><small>Pengar kvar att spendera fritt</small></div>
              <div className={budgetOverspendTotal > 0 ? "warning" : "ok"}><span>Budget över gräns</span><b>{kr(budgetOverspendTotal)}</b><small>Dras från fria pengar</small></div>
              <div><span>Planerat kvar</span><b>{kr(plannedAvailableMoney)}</b><small>Budget kvar + fria pengar</small></div>
              <div className={plannedVsActualDifference > 0 ? "warning" : "ok"}><span>Skillnad mot saldo</span><b>{kr(plannedVsActualDifference)}</b><small>{plannedVsActualDifference > 0 ? "Finns som dragningar/sparande i saldot" : "Plan och saldo ligger nära"}</small></div>
            </div>
            <div className="balance-breakdown-list">
              {balanceBreakdownRows.map((row) => (
                <div className={`balance-breakdown-row ${row.tone}`} key={row.label}>
                  <span><b>{row.label}</b><small>{row.detail}</small></span>
                  <strong>{row.amount > 0 ? "+" : row.amount < 0 ? "−" : ""}{kr(Math.abs(row.amount))}</strong>
                </div>
              ))}
              {missingPostedSubscriptions.length > 0 && (
                <div className="missing-fixed-list">
                  <div>
                    <span>Ingår i fasta utgifter som borde vara dragna</span>
                    <b>{missingPostedSubscriptions.length} poster · {kr(missingPostedFixedExpenses)}</b>
                    <small>Om något här redan är betalt behöver transaktionen matcha namn, belopp och datum — eller så behöver fasta utgiften redigeras.</small>
                  </div>
                  {missingPostedSubscriptions.map((subscription) => (
                    <div className="missing-fixed-row" key={subscription.id}>
                      <span>
                        <b>{subscription.name}</b>
                        <small>Dras {subscription.dueDate ? new Date(`${subscription.dueDate}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "okänt datum"} · {subscription.scheduleLabel}</small>
                      </span>
                      <strong>{kr(subscription.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
              <div className={`balance-breakdown-row result ${actualBalance >= 0 ? "plus" : "minus"}`}>
                <span><b>Aktuellt saldo</b><small>Inkomst minus allt ovan</small></span>
                <strong>{kr(actualBalance)}</strong>
              </div>
            </div>
              </div>
            )}
          </article>
          <article className="report-category-panel">
            <CardTitle>Utgifter per kategori</CardTitle>
            {expensesByCategory.length ? (
              <div className="report-category-body">
                <div className="donut" style={{ background: donutGradient }}><div><strong>{kr(expenses)}</strong><span>Totala utgifter</span></div></div>
                <div className="category-list">
                  {expensesByCategory.map((item) => (
                    <button className="category-item" key={item.category} onClick={() => { setCategoryFilter(item.category); onNavigate("transactions"); }} type="button">
                      <i style={{background: item.color}}/>
                      <span>{item.category}</span>
                      <b>{kr(item.sum)}</b>
                      <small>{item.pct}%</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : <EmptyState text="Inga utgifter att visa i cirkeldiagrammet ännu." />}
          </article>
        </SectionPanel>
      )}

      {activeSection === "settings" && (
        <SectionPanel title="Inställningar" description="Hantera testdata och kontoinställningar.">
          {showAdminPanels && (
            <>
              <AdminOverviewPanel
                stats={adminStats}
                tickets={supportTickets}
                loading={adminStatsLoading}
                error={adminStatsError}
                onRefresh={loadAdminStats}
              />
              <BetaStatusPanel checks={betaChecks} readiness={betaReadiness} remoteReady={remoteReady} />
              <LaunchChecklistPanel checks={launchChecks} readiness={launchReadiness} />
            </>
          )}
          <ThemePicker selectedTheme={layoutTheme} onSelect={setLayoutTheme} />
          <DataControlPanel
            confirmValue={dangerConfirm}
            onConfirmChange={setDangerConfirm}
            onDelete={deleteAllUserData}
            onExport={exportUserData}
            remoteReady={remoteReady}
          />
          <form className="profile-settings-panel" onSubmit={saveProfileName}>
            <div><span>Profilnamn</span><b>Vad ska appen kalla dig?</b><small>Detta styr hälsningen på startsidan.</small></div>
            <input value={profileNameForm} onChange={(event) => setProfileNameForm(event.target.value)} placeholder="Ditt namn" />
            <button type="submit"><Edit3 size={16}/> Spara namn</button>
          </form>
          <form className="profile-settings-panel" onSubmit={saveOpeningBalance}>
            <div><span>Saldoavstämning</span><b>Banksaldo vid löneperiodens start</b><small>Används bara för aktuellt saldo. Fria pengar räknas fortfarande på inkomst, budgetar och köp.</small></div>
            <input inputMode="decimal" value={openingBalanceForm} onChange={(event) => setOpeningBalanceForm(event.target.value)} placeholder="Ex. 10000 eller -580" />
            <button type="submit"><WalletCards size={16}/> Spara saldo</button>
          </form>
          <FeedbackPanel form={feedbackForm} tickets={supportTickets} onChange={setFeedbackForm} onSubmit={submitFeedback} />
          {showAdminPanels && <SupportAdminPanel tickets={supportTickets} onStatusChange={changeTicketStatus} />}
          <PrivacyInfoPanel />
          <div className="settings-actions"><button onClick={resetDemo} type="button">Återställ demodata</button><button onClick={toggleProDemo} type="button">{proActive ? "Stäng av Pro-demo" : "Aktivera Pro-demo"}</button><button className="secondary-action" onClick={handleSignOut} type="button">Logga ut</button></div>
          <div className="settings-status"><span>Profil</span><b>{displayName}</b></div>
          <div className="settings-status"><span>Inloggad som</span><b>{user.email ?? "Ditt konto"}</b></div>
          <div className="settings-status"><span>Status</span><b>{remoteReady ? "Privat Supabase-synk aktiv" : "Lokal cache / väntar på Supabase"}</b></div>
          <div className="settings-status"><span>Ingående saldo</span><b>{kr(data.openingBalance)}</b></div>
          <div className="settings-status"><span>Layoutfärg</span><b>{layoutThemes.find((theme) => theme.id === layoutTheme)?.label ?? "Mörkblå"}</b></div>
          <div className="settings-status"><span>Läge</span><b>{proActive ? "Pro-demo aktiv" : "Standardläge"}</b></div>
        </SectionPanel>
      )}
    </div>
  );
}

function SectionPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="panel section-panel"><div className="section-heading"><h2>{title}</h2><p>{description}</p></div>{children}</section>;
}

function OnboardingPanel({
  categories,
  form,
  onChange,
  onSubmit,
  onSkip,
}: {
  categories: string[];
  form: { income: string; openingBalance: string; fixedName: string; fixedAmount: string; fixedDay: string; budgetCategory: string; budgetAmount: string };
  onChange: (form: { income: string; openingBalance: string; fixedName: string; fixedAmount: string; fixedDay: string; budgetCategory: string; budgetAmount: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSkip: () => void;
}) {
  const budgetCategories = categories.filter((category) => !["Lön", "Fria köp", "Prenumerationer"].includes(category));
  const previewIncome = parseMoney(form.income);
  const previewFixed = parseMoney(form.fixedAmount);
  const previewBudget = parseMoney(form.budgetAmount);
  const plannedReserved =
    (Number.isFinite(previewFixed) && previewFixed > 0 ? previewFixed : 0)
    + (Number.isFinite(previewBudget) && previewBudget > 0 ? previewBudget : 0);
  const previewFreeMoney = Number.isFinite(previewIncome) && previewIncome > 0
    ? Math.max(0, previewIncome - plannedReserved)
    : 0;

  return (
    <section className="onboarding-panel">
      <div className="onboarding-copy">
        <span>Startguide</span>
        <h2>Bygg din första plan</h2>
        <p>Guiden hjälper dig skapa rätt grund så appen kan visa fria pengar utan att du behöver flytta pengar mellan konton.</p>
        <div className="onboarding-preview">
          <small>Förhandsvisning</small>
          <strong>{kr(previewFreeMoney)}</strong>
          <span>ungefär fria pengar efter det du fyllt i</span>
        </div>
        <ul className="onboarding-principles">
          <li>Budgetar reserverar pengar.</li>
          <li>Fria köp minskar fria pengar direkt.</li>
          <li>Ingående saldo hjälper saldot matcha banken.</li>
        </ul>
      </div>
      <form className="onboarding-form" onSubmit={onSubmit}>
        <div className="onboarding-step onboarding-step-primary">
          <div><b>1. Lägg in lönen</b><small>Det här är basen. Appen räknar perioden från lönen den 25:e till nästa 24:e.</small></div>
          <label><span>Månadslön</span><input inputMode="decimal" placeholder="25000" value={form.income} onChange={(event) => onChange({ ...form, income: event.target.value })}/></label>
        </div>

        <div className="onboarding-step">
          <div><b>2. Stäm av banksaldot</b><small>Skriv vad kontot hade vid löneperiodens start. Lämna tomt om du vill göra det senare.</small></div>
          <label><span>Banksaldo vid periodstart</span><input inputMode="decimal" placeholder="Ex. 10000 eller -580" value={form.openingBalance} onChange={(event) => onChange({ ...form, openingBalance: event.target.value })}/></label>
        </div>

        <div className="onboarding-step">
          <div><b>3. Lägg in en fast utgift</b><small>Exempelvis hyra, försäkring eller abonnemang. Du kan lägga fler senare.</small></div>
          <div className="onboarding-step-grid">
            <label><span>Namn</span><input placeholder="Hyra" value={form.fixedName} onChange={(event) => onChange({ ...form, fixedName: event.target.value })}/></label>
            <label><span>Belopp</span><input inputMode="decimal" placeholder="8500" value={form.fixedAmount} onChange={(event) => onChange({ ...form, fixedAmount: event.target.value })}/></label>
            <label><span>Dras dag</span><input inputMode="numeric" min="1" max="28" value={form.fixedDay} onChange={(event) => onChange({ ...form, fixedDay: event.target.value })}/></label>
          </div>
        </div>

        <div className="onboarding-step">
          <div><b>4. Skapa din första budget</b><small>Perfekt för mat, drivmedel eller annat du vill reservera pengar till.</small></div>
          <div className="onboarding-step-grid two-columns">
            <label><span>Kategori</span><select value={form.budgetCategory} onChange={(event) => onChange({ ...form, budgetCategory: event.target.value })}>{budgetCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label><span>Budgetbelopp</span><input inputMode="decimal" placeholder="4000" value={form.budgetAmount} onChange={(event) => onChange({ ...form, budgetAmount: event.target.value })}/></label>
          </div>
        </div>

        <div className="onboarding-actions">
          <button type="submit"><ShieldCheck size={16}/> Skapa min första plan</button>
          <button className="secondary-action" onClick={onSkip} type="button">Hoppa över</button>
        </div>
      </form>
    </section>
  );
}

function DataControlPanel({
  confirmValue,
  onConfirmChange,
  onDelete,
  onExport,
  remoteReady,
}: {
  confirmValue: string;
  onConfirmChange: (value: string) => void;
  onDelete: () => void;
  onExport: () => void;
  remoteReady: boolean;
}) {
  return (
    <article className="data-control-panel">
      <div>
        <span>Data & backup</span>
        <b>Exportera eller radera testdata</b>
        <small>Exporten laddar ner en JSON-fil med din nuvarande appdata. Radera kräver bekräftelsen RADERA.</small>
      </div>
      <div className="data-control-actions">
        <button onClick={onExport} type="button"><Download size={16}/> Exportera min data</button>
        <label>
          <span>Skriv RADERA</span>
          <input value={confirmValue} onChange={(event) => onConfirmChange(event.target.value)} placeholder="RADERA" />
        </label>
        <button className="danger-action" onClick={onDelete} type="button"><Trash2 size={16}/> Radera min data</button>
      </div>
      <p>{remoteReady ? "Supabase-raderingen använder RLS och tar bara bort din användares rader." : "Just nu raderas lokal cache. Supabase är inte aktiv i appen."}</p>
    </article>
  );
}

function FeedbackPanel({
  form,
  tickets,
  onChange,
  onSubmit,
}: {
  form: { type: "bug" | "idea" | "question" | "other"; message: string };
  tickets: SupportTicket[];
  onChange: (form: { type: "bug" | "idea" | "question" | "other"; message: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const visibleTickets = tickets.slice(0, 5);

  return (
    <article className="feedback-panel support-center-panel">
      <form className="support-form" onSubmit={onSubmit}>
        <div>
          <span>Support & feedback</span>
          <b>Kontakta support</b>
          <small>Skicka problem, frågor eller förbättringar. Du får ett ärendenummer direkt.</small>
        </div>
        <select value={form.type} onChange={(event) => onChange({ ...form, type: event.target.value as "bug" | "idea" | "question" | "other" })}>
          <option value="bug">Problem / bugg</option>
          <option value="question">Fråga / support</option>
          <option value="idea">Förbättringsidé</option>
          <option value="other">Annat</option>
        </select>
        <textarea
          placeholder="Skriv vad du behöver hjälp med..."
          value={form.message}
          onChange={(event) => onChange({ ...form, message: event.target.value })}
        />
        <button type="submit">Skicka ärende</button>
      </form>
      <div className="support-ticket-list">
        <h3>Mina ärenden</h3>
        {visibleTickets.length ? visibleTickets.map((ticket) => <SupportTicketRow key={ticket.id} ticket={ticket} />) : <EmptyState text="Inga supportärenden ännu." />}
      </div>
    </article>
  );
}

function SupportTicketRow({ ticket }: { ticket: SupportTicket }) {
  return (
    <div className={`support-ticket-row support-${ticket.status}`}>
      <span>
        <b>#{ticket.id} · {supportTypeLabel(ticket.type)}</b>
        <small>{ticket.message}</small>
        <small>{new Date(ticket.created_at).toLocaleString("sv-SE")} · {ticket.page ?? "Inställningar"}</small>
      </span>
      <strong>{supportStatusLabel(ticket.status)}</strong>
    </div>
  );
}

function SupportAdminPanel({
  tickets,
  onStatusChange,
}: {
  tickets: SupportTicket[];
  onStatusChange: (id: number, status: SupportTicket["status"]) => void;
}) {
  return (
    <article className="support-admin-panel">
      <div>
        <span>Adminsupport</span>
        <b>Alla supportärenden</b>
        <small>Syns bara för admin. Här kan du följa upp och ändra status.</small>
      </div>
      <div className="support-admin-list">
        {tickets.length ? tickets.map((ticket) => (
          <div className="support-admin-row" key={ticket.id}>
            <SupportTicketRow ticket={ticket} />
            <select value={ticket.status} onChange={(event) => onStatusChange(ticket.id, event.target.value as SupportTicket["status"])}>
              <option value="new">Ny</option>
              <option value="reviewed">Läst</option>
              <option value="planned">Planerad</option>
              <option value="done">Klar</option>
              <option value="closed">Stängd</option>
            </select>
          </div>
        )) : <EmptyState text="Inga supportärenden att visa." />}
      </div>
    </article>
  );
}

function supportTypeLabel(type: SupportTicket["type"]) {
  if (type === "bug") return "Problem";
  if (type === "idea") return "Idé";
  if (type === "question") return "Fråga";

  return "Annat";
}

function supportStatusLabel(status: SupportTicket["status"]) {
  const labels: Record<SupportTicket["status"], string> = {
    new: "Ny",
    reviewed: "Läst",
    planned: "Planerad",
    done: "Klar",
    closed: "Stängd",
  };

  return labels[status];
}

function PrivacyInfoPanel() {
  return (
    <article className="privacy-panel">
      <div>
        <span>Integritet & villkor</span>
        <b>Beta-version, inte finansiell rådgivning</b>
        <small>Den här appen hjälper dig planera din privata ekonomi, men ersätter inte professionell ekonomisk rådgivning.</small>
      </div>
      <div className="privacy-grid">
        <span><b>Data som sparas</b><small>Köp, budgetar, fasta utgifter, mål, resebudgetar, feedback och profilnamn.</small></span>
        <span><b>Var data sparas</b><small>I Supabase på ditt inloggade konto, med RLS så användare bara ser sin egen data.</small></span>
        <span><b>Din kontroll</b><small>Du kan exportera din data och radera appdata från Inställningar.</small></span>
        <span><b>Beta</b><small>Funktioner kan ändras under testperioden när vi förbättrar appen.</small></span>
      </div>
    </article>
  );
}

function BetaStatusPanel({
  checks,
  readiness,
  remoteReady,
}: {
  checks: { title: string; status: string; value: string; detail: string }[];
  readiness: number;
  remoteReady: boolean;
}) {
  return (
    <article className="beta-status-panel">
      <div className="beta-status-hero">
        <div>
          <span>Beta-status</span>
          <b>{remoteReady ? "Redo för fler testare" : "Nästan redo"}</b>
          <small>{remoteReady ? "Synken är aktiv och appen sparar mot Supabase." : "Appen fungerar, men väntar på full Supabase-synk."}</small>
        </div>
        <strong>{readiness}%</strong>
      </div>
      <div className="beta-check-grid">
        {checks.map((check) => (
          <div className={`beta-check beta-check-${check.status}`} key={check.title}>
            <i />
            <span>
              <b>{check.title}</b>
              <small>{check.detail}</small>
            </span>
            <strong>{check.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function AdminOverviewPanel({
  stats,
  tickets,
  loading,
  error,
  onRefresh,
}: {
  stats: AdminStats | null;
  tickets: SupportTicket[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const openTickets = stats?.support?.open ?? tickets.filter((ticket) => ticket.status === "new").length;
  const totalTickets = stats?.support?.total ?? tickets.length;
  const topTables = stats?.app?.rowsByTable
    ?.filter((row) => row.rows !== null)
    .sort((a, b) => (b.rows ?? 0) - (a.rows ?? 0))
    .slice(0, 5) ?? [];
  const generatedAt = stats?.generatedAt ? new Date(stats.generatedAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" }) : null;

  return (
    <article className="admin-overview-panel">
      <div className="admin-overview-heading">
        <div>
          <span>Adminpanel</span>
          <b>Beta-koll för Oskars Ekonomi</b>
          <small>Syns bara för admin. Här får du koll på användare, aktivitet och support.</small>
        </div>
        <button onClick={onRefresh} disabled={loading} type="button">
          <RefreshCw size={15} className={loading ? "spin-icon" : ""}/>
          {loading ? "Uppdaterar" : "Uppdatera"}
        </button>
      </div>

      {!stats?.configured && (
        <div className="admin-config-warning">
          <ShieldCheck size={18}/>
          <span>
            <b>Servernyckel saknas</b>
            <small>{stats?.message ?? error ?? "Lägg till SUPABASE_SERVICE_ROLE_KEY i Vercel för att kunna visa totalt antal Auth-användare."}</small>
          </span>
        </div>
      )}

      {error && !stats && (
        <div className="admin-config-warning admin-config-error">
          <ShieldCheck size={18}/>
          <span><b>Kunde inte hämta adminstatistik</b><small>{error}</small></span>
        </div>
      )}

      <div className="admin-metric-grid">
        <div><Users size={18}/><span>Användare</span><b>{stats?.users?.total ?? "—"}</b><small>Totalt skapade konton</small></div>
        <div><Activity size={18}/><span>Aktiva 7 dagar</span><b>{stats?.users?.active7 ?? "—"}</b><small>Senaste inloggning</small></div>
        <div><Users size={18}/><span>Nya 30 dagar</span><b>{stats?.users?.new30 ?? "—"}</b><small>Nya beta-användare</small></div>
        <div><MessageSquare size={18}/><span>Support</span><b>{openTickets}</b><small>{totalTickets} ärenden totalt</small></div>
      </div>

      <div className="admin-detail-grid">
        <section>
          <div className="admin-section-title"><Database size={16}/><b>Appaktivitet</b><small>{stats?.app?.activeWriters30 ?? "—"} användare har lagt in data senaste 30 dagarna</small></div>
          <div className="admin-table-list">
            {topTables.length ? topTables.map((row) => (
              <div key={row.table}>
                <span>{row.table}</span>
                <b>{row.rows ?? 0}</b>
                <small>{row.last30 ?? 0} nya 30 dagar</small>
              </div>
            )) : <EmptyState text={loading ? "Hämtar tabellstatistik..." : "Tabellstatistik visas när servernyckeln är konfigurerad."} />}
          </div>
        </section>

        <section>
          <div className="admin-section-title"><Users size={16}/><b>Senaste konton</b><small>{generatedAt ? `Uppdaterad ${generatedAt}` : "Väntar på adminstatistik"}</small></div>
          <div className="admin-user-list">
            {stats?.recentUsers?.length ? stats.recentUsers.map((recentUser) => (
              <div key={recentUser.id}>
                <span><b>{recentUser.name || recentUser.email || "Ny användare"}</b><small>{recentUser.email ?? "Ingen e-post"}</small></span>
                <small>{recentUser.lastSignInAt ? `Aktiv ${new Date(recentUser.lastSignInAt).toLocaleDateString("sv-SE")}` : "Inte inloggad än"}</small>
              </div>
            )) : <EmptyState text={loading ? "Hämtar användare..." : "Senaste konton visas när servernyckeln är konfigurerad."} />}
          </div>
        </section>
      </div>
    </article>
  );
}

function LaunchChecklistPanel({
  checks,
  readiness,
}: {
  checks: { title: string; status: string; detail: string }[];
  readiness: number;
}) {
  return (
    <article className="launch-check-panel">
      <div className="launch-check-heading">
        <div>
          <span>Intern lanseringscheck</span>
          <b>{readiness}% klart för publik lansering</b>
          <small>Den här panelen visas bara för admin/betaägare, inte för vanliga användare.</small>
        </div>
        <strong>{readiness}%</strong>
      </div>
      <div className="launch-check-list">
        {checks.map((check) => (
          <div className={`launch-check-row launch-check-${check.status}`} key={check.title}>
            <i />
            <span>
              <b>{check.title}</b>
              <small>{check.detail}</small>
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function ThemePicker({
  selectedTheme,
  onSelect,
}: {
  selectedTheme: LayoutTheme;
  onSelect: (theme: LayoutTheme) => void;
}) {
  return (
    <div className="theme-picker">
      <div>
        <span>Layoutfärg</span>
        <b>Välj din stil</b>
        <small>Färgen sparas för din användare i den här webbläsaren.</small>
      </div>
      <div className="theme-options">
        {layoutThemes.map((theme) => (
          <button
            aria-pressed={selectedTheme === theme.id}
            className={`theme-option theme-option-${theme.id} ${selectedTheme === theme.id ? "active" : ""}`}
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            type="button"
          >
            <i />
            <span>
              <b>{theme.label}</b>
              <small>{theme.description}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InsightsPanel({
  insights,
  onNavigate,
  affordabilityForm,
  onAffordabilityChange,
  affordabilityResult,
  expanded = false,
}: {
  insights: string[];
  onNavigate: (section: AppSection) => void;
  affordabilityForm: { title: string; amount: string };
  onAffordabilityChange: (form: { title: string; amount: string }) => void;
  affordabilityResult: AffordabilityResult | null;
  expanded?: boolean;
}) {
  return (
    <article className={`panel insights-panel ${expanded ? "expanded" : ""}`}>
      <CardTitle><Sparkles size={18} className="purple-text"/> AI Insights</CardTitle>
      <div className="insight-hero"><b>Din ekonomi är analyserad! 🎉</b><span>{insights[0]}</span></div>
      <div className="affordability-card">
        <div className="affordability-heading">
          <div>
            <b>Har jag råd?</b>
            <small>Skriv priset så räknar jag mot fria pengar och perioden som är kvar.</small>
          </div>
          <span>AI-råd</span>
        </div>
        <div className="affordability-form">
          <label>
            <span>Vad vill du köpa?</span>
            <input
              placeholder="Ex. nya skor"
              value={affordabilityForm.title}
              onChange={(event) => onAffordabilityChange({ ...affordabilityForm, title: event.target.value })}
            />
          </label>
          <label>
            <span>Pris</span>
            <input
              inputMode="decimal"
              placeholder="1990"
              value={affordabilityForm.amount}
              onChange={(event) => onAffordabilityChange({ ...affordabilityForm, amount: event.target.value })}
            />
          </label>
        </div>
        {affordabilityResult ? (
          <div className={`affordability-result ${affordabilityResult.tone}`}>
            <strong>{affordabilityResult.answer}</strong>
            <span>{affordabilityResult.summary}</span>
            <ul>
              {affordabilityResult.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          </div>
        ) : (
          <div className="affordability-empty">Exempel: “AirPods” och “1990”.</div>
        )}
      </div>
      <div className="insight-list">
        <button onClick={() => onNavigate("reports")} type="button"><i className="insight-icon green"><CircleCheck/></i><span><b>Månadsstatus</b><small>{insights[0]}</small></span><ChevronRight/></button>
        <button onClick={() => onNavigate("subscriptions")} type="button"><i className="insight-icon purple"><Lightbulb/></i><span><b>Sparpotential</b><small>{insights[1]}</small></span><ChevronRight/></button>
        <button onClick={() => onNavigate("goals")} type="button"><i className="insight-icon blue"><Crosshair/></i><span><b>Måluppdatering</b><small>{insights[2]}</small></span><ChevronRight/></button>
      </div>
      <button className="wide-button" onClick={() => onNavigate("insights")} type="button">Visa alla insights <ArrowRight size={15}/></button>
    </article>
  );
}

function SubscriptionsPanel({
  subscriptions,
  onNavigate,
  onGenerate,
  onEdit,
  onToggle,
  onRemove,
  showAll = false,
}: {
  subscriptions: (Subscription & { dueDate?: string | null; nextDueDate?: string | null; scheduleLabel?: string; isDueThisPeriod?: boolean })[];
  onNavigate: (section: AppSection) => void;
  onGenerate: () => void;
  onEdit: (subscription: Subscription) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  showAll?: boolean;
}) {
  const visibleSubscriptions = showAll ? subscriptions : subscriptions.slice(0, 5);

  return (
    <article className="panel list-panel subscription-panel">
      <CardTitle link={showAll ? undefined : "Visa alla"} onClick={() => onNavigate("subscriptions")}>Fasta utgifter</CardTitle>
      <div>{visibleSubscriptions.map((item) => (
        <div className={`list-row subscription-row ${item.active ? "" : "inactive"} ${item.isDueThisPeriod ? "due-now" : ""}`} key={item.id}>
          <Logo title={item.name} tone={item.name === "Spotify" ? "spotify" : item.name === "Netflix" ? "black" : "white"} />
          <span className="row-copy">
            <b>{item.name}</b>
            <small>{item.plan} · {item.scheduleLabel ?? "Varje månad"} · dag {item.day}</small>
            <small>{item.isDueThisPeriod && item.dueDate ? `Dras denna period: ${new Date(`${item.dueDate}T12:00:00`).toLocaleDateString("sv-SE")}` : item.nextDueDate ? `Nästa dragning: ${new Date(`${item.nextDueDate}T12:00:00`).toLocaleDateString("sv-SE")}` : "Ingen aktiv dragning"}</small>
          </span>
          <span className="row-value"><b>{kr(item.amount)}</b><small>{item.active ? (item.isDueThisPeriod ? "Räknas nu" : "Kommande") : "Pausad"}</small></span>
          <span className="row-actions"><button onClick={() => onEdit(item)} type="button">Redigera</button><button onClick={() => onToggle(item.id)} type="button">{item.active ? "Pausa" : "Aktivera"}</button><button onClick={() => onRemove(item.id)} type="button"><Trash2 size={14}/></button></span>
        </div>
      ))}</div>
      <button className="wide-button" onClick={onGenerate} type="button">Skapa utgifter <ArrowRight size={15}/></button>
    </article>
  );
}

function GoalPanel({
  goals,
  savings,
  savingsTotal,
  manualGoalsSaved,
  goalsTargetTotal,
  goalSavedTotal,
  goalProgress,
  onNavigate,
  onEditGoal,
  onRemoveGoal,
  onEditSavings,
  onRemoveSavings,
  showSavingsDetails = false,
}: {
  goals: Goal[];
  savings: SavingsAccount[];
  savingsTotal: number;
  manualGoalsSaved: number;
  goalsTargetTotal: number;
  goalSavedTotal: number;
  goalProgress: number;
  onNavigate: (section: AppSection) => void;
  onEditGoal?: (goal: Goal) => void;
  onRemoveGoal?: (id: string) => void;
  onEditSavings?: (saving: SavingsAccount) => void;
  onRemoveSavings?: (id: string) => void;
  showSavingsDetails?: boolean;
}) {
  return (
    <section className="goal-card panel">
      <div className="goal-copy">
        <h3>Dina mål</h3>
        <b>{goals.length ? `${goals.length} aktiva mål` : "Inga mål ännu"}</b>
        <strong>{goalProgress}%</strong>
        <span>{kr(goalSavedTotal)} av {kr(goalsTargetTotal)}</span>
        <div className="goal-progress"><i style={{ width: `${goalProgress}%` }}/></div>
        <div className="savings-summary">
          <span><b>{kr(manualGoalsSaved)}</b><small>Manuellt sparat</small></span>
          <span><b>{kr(savingsTotal)}</b><small>Sparkonton</small></span>
        </div>
        <div className="goals-list">
          {goals.length ? goals.map((goal) => {
            const savedAmount = getGoalDisplaySavedAmount(goal, goals, savings);
            const linkedSaving = findLinkedSavingsForGoal(goal, savings);
            const usesSavingsPool = !linkedSaving && goals.length === 1 && savings.length > 0;
            const progress = goal.target ? Math.min(100, Math.round((savedAmount / goal.target) * 100)) : 0;

            return (
              <div className="goal-row" key={goal.id}>
                <span><b>{goal.title}</b><small>{kr(savedAmount)} av {kr(goal.target)}{linkedSaving || usesSavingsPool ? " · kopplat" : ""}</small></span>
                <div className="mini-progress"><i style={{ width: `${progress}%` }}/></div>
                <strong>{progress}%</strong>
                {showSavingsDetails && (
                  <span className="row-actions">
                    {onEditGoal && <button onClick={() => onEditGoal(goal)} type="button">Redigera</button>}
                    {onRemoveGoal && <button onClick={() => onRemoveGoal(goal.id)} type="button"><Trash2 size={14}/></button>}
                  </span>
                )}
              </div>
            );
          }) : <EmptyState text="Skapa ditt första mål ovanför." />}
        </div>
        {showSavingsDetails && (
          <div className="savings-list">
            {savings.length ? savings.map((saving) => (
              <div className="savings-row" key={saving.id}>
                <span><b>{saving.name}</b><small>Kategori skapad</small></span>
                <strong>{kr(saving.amount)}</strong>
                <span className="row-actions">
                  {onEditSavings && <button onClick={() => onEditSavings(saving)} type="button">Redigera</button>}
                  {onRemoveSavings && <button onClick={() => onRemoveSavings(saving.id)} type="button"><Trash2 size={14}/></button>}
                </span>
              </div>
            )) : <EmptyState text="Inga sparkonton ännu. Lägg till ett ovanför." />}
          </div>
        )}
        <p>Du är på god väg! Fortsätt spara för att nå ditt mål.</p>
        <button className="inline-link" onClick={() => onNavigate("goals")} type="button">Ändra sparmål</button>
      </div>
      <button className="goal-image" onClick={() => onNavigate("goals")} type="button"><span><Crosshair size={27}/></span></button>
    </section>
  );
}
