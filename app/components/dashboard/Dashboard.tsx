"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  ChevronDown, ChevronRight, CircleCheck, Crosshair, Edit3, Lightbulb,
  PiggyBank, Plus, Search, Sparkles, Trash2, WalletCards,
} from "lucide-react";
import {
  addBudget as addRemoteBudget,
  addCategory as addRemoteCategory,
  addPurchase as addRemotePurchase,
  addSubscription as addRemoteSubscription,
  deleteBudget as deleteRemoteBudget,
  deletePurchase as deleteRemotePurchase,
  deleteSubscription as deleteRemoteSubscription,
  getBudgets,
  getCategories,
  getPurchasesByDateRange,
  getSubscriptions,
  updateBudget as updateRemoteBudget,
  updatePurchase as updateRemotePurchase,
  updateSubscription as updateRemoteSubscription,
} from "../../lib/api";
import type { AppSection } from "../Sidebar";

type TransactionType = "income" | "expense";
type PurchaseSource = "budget" | "free";

type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: TransactionType;
  source?: PurchaseSource;
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
};

type Goal = {
  title: string;
  saved: number;
  target: number;
};

type FinanceData = {
  transactions: Transaction[];
  budgets: Budget[];
  subscriptions: Subscription[];
  categories: string[];
  goal: Goal;
};

type RemotePurchase = {
  id: number;
  beskrivning: string;
  belopp: number;
  kategori: string;
  created_at: string;
  source?: PurchaseSource | null;
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
};

type DashboardProps = {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
};

const storageKey = "oskars-ekonomi-v2";
const salaryDay = 25;
const monthFormatter = new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });

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

const defaultData: FinanceData = {
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
  goal: { title: "Resa 2025", saved: 20400, target: 30000 },
};

function kr(value: number) {
  if (!Number.isFinite(value)) return "0 kr";
  return `${Math.round(value).toLocaleString("sv-SE")} kr`;
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

function isFreePurchase(item: Pick<Transaction, "type" | "source" | "category">) {
  return item.type === "expense" && (item.source === "free" || item.category === "Fria köp");
}

function sourceFromRemotePurchase(purchase: RemotePurchase): PurchaseSource {
  if (purchase.source === "free" || purchase.source === "budget") {
    return purchase.source;
  }

  return purchase.kategori === "Fria köp" ? "free" : "budget";
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

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
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
  const [subscriptionForm, setSubscriptionForm] = useState({ name: "", plan: "", amount: "", day: "1" });
  const [categoryName, setCategoryName] = useState("");
  const [goalForm, setGoalForm] = useState(defaultData.goal);
  const [proActive, setProActive] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as FinanceData;
      setData({
        ...parsed,
        categories: Array.from(new Set([...defaultData.categories, ...parsed.categories])),
      });
    }
  }, []);

  useEffect(() => {
    async function loadSupabaseData() {
      try {
        const periodRange = getFinancialPeriod(month);
        const [purchaseRows, budgetRowsData, categoryRows, subscriptionRows] = await Promise.all([
          getPurchasesByDateRange(periodRange.start, periodRange.end) as Promise<RemotePurchase[]>,
          getBudgets() as Promise<RemoteBudget[]>,
          getCategories() as Promise<RemoteCategory[]>,
          getSubscriptions() as Promise<RemoteSubscription[]>,
        ]);

        setData((current) => ({
          ...current,
          transactions: purchaseRows.map((purchase) => {
            const type: TransactionType = purchase.kategori === "Lön" ? "income" : "expense";
            const source = type === "expense" ? sourceFromRemotePurchase(purchase) : undefined;

            return {
              id: String(purchase.id),
              title: purchase.beskrivning,
              amount: Number(purchase.belopp),
              category: purchase.kategori,
              date: purchase.created_at.slice(0, 10),
              type,
              source,
            };
          }),
          budgets: budgetRowsData.map((budget) => ({
            id: String(budget.id),
            category: budget.category,
            limit: Number(budget.monthly_budget),
          })),
          categories: Array.from(new Set([...defaultData.categories, ...categoryRows.map((category) => category.name)])),
          subscriptions: subscriptionRows.map((subscription) => ({
            id: String(subscription.id),
            name: subscription.name,
            plan: subscription.category,
            amount: Number(subscription.amount),
            day: Number(subscription.day_of_month),
            active: subscription.active,
          })),
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
  }, [month]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    setTransactionForm((form) => ({ ...form, date: defaultDateForPeriod(month) }));
  }, [month]);

  useEffect(() => {
    if (activeSection === "freePurchases") {
      setTransactionForm((form) => ({ ...form, type: "expense", source: "free", category: "Fria köp" }));
    } else {
      setTransactionForm((form) => ({
        ...form,
        source: "budget",
        category: form.category === "Fria köp" ? "Mat & Livsmedel" : form.category,
      }));
    }
  }, [activeSection]);

  const monthDate = new Date(`${month}-01T12:00:00`);
  const period = getFinancialPeriod(month);
  const monthTransactions = useMemo(
    () => data.transactions.filter((transaction) => isInFinancialPeriod(transaction.date, month)),
    [data.transactions, month]
  );

  const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const freePurchaseSpent = monthTransactions.filter(isFreePurchase).reduce((sum, item) => sum + item.amount, 0);
  const actualBalance = income - expenses;
  const reservedBudgetTotal = data.budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const fixedExpenseTotal = data.subscriptions
    .filter((subscription) => subscription.active)
    .reduce((sum, subscription) => sum + subscription.amount, 0);
  const reservedTotal = reservedBudgetTotal + fixedExpenseTotal;
  const freeMoney = income - reservedTotal - freePurchaseSpent;
  const goalProgress = Math.min(100, Math.round((data.goal.saved / data.goal.target) * 100));
  const transactionCategories = transactionForm.type === "income"
    ? data.categories.filter((category) => category === "Lön")
    : data.categories.filter((category) => !["Lön", "Fria köp"].includes(category));

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
    .filter(isFreePurchase)
    .filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const budgetRows = data.budgets.map((budget) => {
    const used = monthTransactions
      .filter((item) => item.type === "expense" && item.category === budget.category && !isFreePurchase(item))
      .reduce((sum, item) => sum + item.amount, 0);
    const pct = Math.min(100, Math.round((used / budget.limit) * 100));
    const remaining = Math.max(budget.limit - used, 0);
    return { ...budget, used, pct, remaining };
  });

  function show(message: string) {
    setNotice(message);
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

    const expenseSource: PurchaseSource = activeSection === "freePurchases" ? "free" : "budget";
    const transaction = {
      title: transactionForm.title.trim(),
      amount,
      category: transactionForm.type === "expense" && expenseSource === "free" ? "Fria köp" : transactionForm.category,
      type: transactionForm.type,
      source: transactionForm.type === "expense" ? expenseSource : undefined,
      date: transactionForm.date,
    };

    if (editingTransactionId) {
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
      setData((current) => ({
        ...current,
        transactions: current.transactions.map((item) =>
          item.id === editingTransactionId ? { ...item, ...transaction } : item
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

      setData((current) => ({
        ...current,
        transactions: [{ id, ...transaction }, ...current.transactions],
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
    onNavigate(transaction.source === "free" ? "freePurchases" : "transactions");
    show("Redigerar transaktion.");
  }

  function cancelTransactionEdit() {
    setEditingTransactionId(null);
    setTransactionForm((form) => ({ ...form, title: "", amount: "" }));
    show("Redigering avbruten.");
  }

  async function removeTransaction(id: string) {
    const remoteId = toRemoteId(id);
    if (remoteReady && remoteId) {
      await deleteRemotePurchase(remoteId);
    }

    setData((current) => ({ ...current, transactions: current.transactions.filter((item) => item.id !== id) }));
    if (editingTransactionId === id) {
      cancelTransactionEdit();
    }
    show("Transaktionen togs bort.");
  }

  async function addBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limit = Number(budgetForm.limit);
    if (limit <= 0) return;

    if (editingBudgetId) {
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

      if (remoteReady) {
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
    const amount = Number(subscriptionForm.amount);
    if (!subscriptionForm.name.trim() || amount <= 0) return;

    const nextSubscription = {
      name: subscriptionForm.name.trim(),
      plan: subscriptionForm.plan.trim() || "Månadsplan",
      amount,
      day: Number(subscriptionForm.day),
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
          existing?.active ?? true
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
          nextSubscription.day
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

    setSubscriptionForm({ name: "", plan: "", amount: "", day: "1" });
  }

  function editSubscription(subscription: Subscription) {
    setEditingSubscriptionId(subscription.id);
    setSubscriptionForm({
      name: subscription.name,
      plan: subscription.plan,
      amount: String(subscription.amount),
      day: String(subscription.day),
    });
    show("Redigerar fast utgift.");
  }

  function cancelSubscriptionEdit() {
    setEditingSubscriptionId(null);
    setSubscriptionForm({ name: "", plan: "", amount: "", day: "1" });
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
        !subscription.active
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
      setSubscriptionForm({ name: "", plan: "", amount: "", day: "1" });
    }
    show("Fast utgift togs bort och fria pengar räknades om.");
  }

  async function createSubscriptionExpenses() {
    const existingNames = new Set(monthTransactions.filter((item) => item.category === "Prenumerationer").map((item) => item.title));
    const newTransactions = data.subscriptions
      .filter((subscription) => subscription.active && !existingNames.has(subscription.name))
      .map<Transaction>((subscription) => ({
        id: crypto.randomUUID(),
        title: subscription.name,
        category: "Prenumerationer",
        amount: subscription.amount,
        type: "expense",
        source: "budget",
        date: dateForPeriodDay(month, subscription.day),
      }));

    const savedTransactions = remoteReady
      ? await Promise.all(newTransactions.map(async (transaction) => {
          const created = await addRemotePurchase(
            transaction.title,
            transaction.amount,
            transaction.category,
            undefined,
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

  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData((current) => ({ ...current, goal: goalForm }));
    show("Sparmålet är uppdaterat.");
  }

  function resetDemo() {
    setData(defaultData);
    setGoalForm(defaultData.goal);
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
    data.subscriptions.length ? `Fasta utgifter är ${kr(fixedExpenseTotal)} och budgetar reserverar ${kr(reservedBudgetTotal)}.` : "Lägg in fasta utgifter för att räkna fria pengar bättre.",
    goalProgress >= 100 ? "Sparmålet är nått. Dags för nästa mål!" : `Du är ${goalProgress}% på väg mot ${data.goal.title}.`,
  ];

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

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div><h1>God morgon, Oskar! <span>👋</span></h1><p>Här är din ekonomiöversikt för idag.</p></div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => show("Du har inga nya notiser just nu.")} type="button"><Bell size={19}/></button>
          <button className="top-avatar" onClick={() => onNavigate("settings")} type="button">OE</button>
        </div>
      </header>

      <div className="date-row">
        <label className="month-control"><CalendarDays size={17}/><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /> <ChevronDown size={14}/></label>
        <span className="period-range">{dateFormatter.format(period.start)} – {dateFormatter.format(new Date(period.end.getTime() - 86400000))}</span>
      </div>

      <div className="notice-bar">{notice}</div>

      {activeSection === "overview" && (
        <>
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
              <input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((form) => ({ ...form, date: event.target.value }))} />
              <button type="submit"><Plus size={17}/> {editingTransactionId ? "Spara ändring" : "Spara"}</button>
              {editingTransactionId && <button className="secondary-action" onClick={cancelTransactionEdit} type="button">Avbryt</button>}
            </form>
          </section>

          <section className="free-money-panel panel">
            <div>
              <span>Fria pengar</span>
              <strong>{kr(freeMoney)}</strong>
            </div>
            <div className="free-money-math">
              <span><b>{kr(income)}</b><small>Inkomster</small></span>
              <i>−</i>
              <span><b>{kr(reservedTotal)}</b><small>Reserverat</small></span>
              <i>−</i>
              <span><b>{kr(freePurchaseSpent)}</b><small>Fria köp</small></span>
              <i>=</i>
              <span className="result"><b>{kr(freeMoney)}</b><small>Fritt</small></span>
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
                  <div className="transaction-list">{filteredTransactions.slice(0, 5).map((item) => <div className="list-row" key={item.id}><Logo title={item.title} tone={item.type === "income" ? "green" : item.title === "Spotify" ? "spotify" : item.title === "Netflix" ? "black" : "white"} /><span className="row-copy"><b>{item.title}</b><small>{item.category}</small></span><span className={`row-value ${item.type === "income" ? "plus" : "minus"}`}><b>{item.type === "income" ? "+" : "-"}{kr(item.amount)}</b><small>{new Date(item.date).toLocaleDateString("sv-SE")}</small></span></div>)}</div>
                  <button className="wide-button" onClick={() => onNavigate("transactions")} type="button">Visa alla transaktioner <ArrowRight size={15}/></button>
                </article>
                <article className="panel list-panel">
                  <CardTitle link="Visa alla" onClick={() => onNavigate("budgets")}>Budgetöversikt</CardTitle>
                  <div className="budget-list">{budgetRows.map((budget) => <div className="budget-row" key={budget.id}><span className="budget-icon">⚑</span><div><span className="budget-meta"><b>{budget.category}</b><small>{kr(budget.remaining)} kvar</small></span><small>{kr(budget.used)} använt av {kr(budget.limit)}</small><div className="progress"><i style={{width: `${budget.pct}%`}}/></div></div></div>)}</div>
                  <button className="wide-button" onClick={() => onNavigate("budgets")} type="button">Visa alla budgetar <ArrowRight size={15}/></button>
                </article>
              </div>
            </div>

            <div className="right-stack">
              <InsightsPanel insights={topInsights} onNavigate={onNavigate} />
              <SubscriptionsPanel subscriptions={data.subscriptions} onNavigate={onNavigate} onGenerate={createSubscriptionExpenses} onEdit={editSubscription} onToggle={toggleSubscription} onRemove={removeSubscription} />
            </div>
          </section>

          <GoalPanel goal={data.goal} goalProgress={goalProgress} onNavigate={onNavigate} />
        </>
      )}

      {activeSection === "transactions" && (
        <SectionPanel title="Transaktioner" description="Lägg till inkomster och köp, sök i listan och ta bort poster.">
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
            <input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((form) => ({ ...form, date: event.target.value }))} />
            <button type="submit"><Plus size={16}/> {editingTransactionId ? "Spara ändring" : "Skapa köp"}</button>
            {editingTransactionId && <button className="secondary-action" onClick={cancelTransactionEdit} type="button">Avbryt</button>}
          </form>
          <div className="tool-row filters-only"><label><Search size={16}/><input placeholder="Sök transaktion..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>Alla</option>{data.categories.map((category) => <option key={category}>{category}</option>)}</select></div>
          <div className="data-table">{filteredTransactions.map((item) => <div className="table-row transaction-table-row" key={item.id}><span><b>{item.title}</b><small>{item.category} · {new Date(item.date).toLocaleDateString("sv-SE")}</small></span><strong className={item.type === "income" ? "plus" : "minus"}>{item.type === "income" ? "+" : "-"}{kr(item.amount)}</strong><span className="row-actions"><button onClick={() => editTransaction(item)} type="button">Redigera</button><button onClick={() => removeTransaction(item.id)} type="button"><Trash2 size={16}/></button></span></div>)}</div>
        </SectionPanel>
      )}

      {activeSection === "freePurchases" && (
        <SectionPanel title="Fria köp" description="Småköp som dras direkt från fria pengar.">
          <div className="free-money-panel compact panel">
            <div><span>Kvar att handla för</span><strong>{kr(freeMoney)}</strong></div>
            <div className="free-money-math"><span><b>{kr(income)}</b><small>Inkomst</small></span><i>−</i><span><b>{kr(reservedTotal)}</b><small>Reserverat</small></span><i>−</i><span><b>{kr(freePurchaseSpent)}</b><small>Fria köp</small></span><i>=</i><span className="result"><b>{kr(freeMoney)}</b><small>Kvar</small></span></div>
          </div>
          <form className="management-form free-purchase-form" onSubmit={addTransaction}>
            <input placeholder="Ex. kaffe, glass, snabbmat" value={transactionForm.title} onChange={(event) => setTransactionForm((form) => ({ ...form, title: event.target.value, type: "expense", source: "free", category: "Fria köp" }))} />
            <input inputMode="decimal" placeholder="Belopp" value={transactionForm.amount} onChange={(event) => setTransactionForm((form) => ({ ...form, amount: event.target.value, type: "expense", source: "free", category: "Fria köp" }))} />
            <input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((form) => ({ ...form, date: event.target.value, type: "expense", source: "free", category: "Fria köp" }))} />
            <button type="submit"><Plus size={16}/> {editingTransactionId ? "Spara ändring" : "Lägg till köp"}</button>
            {editingTransactionId && <button className="secondary-action" onClick={cancelTransactionEdit} type="button">Avbryt</button>}
          </form>
          <div className="tool-row filters-only"><label><Search size={16}/><input placeholder="Sök fria köp..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          <div className="data-table">{freePurchaseTransactions.map((item) => <div className="table-row transaction-table-row" key={item.id}><span><b>{item.title}</b><small>Fria pengar · {new Date(item.date).toLocaleDateString("sv-SE")}</small></span><strong className="minus">-{kr(item.amount)}</strong><span className="row-actions"><button onClick={() => editTransaction(item)} type="button">Redigera</button><button onClick={() => removeTransaction(item.id)} type="button"><Trash2 size={16}/></button></span></div>)}</div>
        </SectionPanel>
      )}

      {activeSection === "budgets" && (
        <SectionPanel title="Budget" description="Sätt en månadsgräns per kategori.">
          <div className="free-money-panel compact panel">
            <div><span>Fria pengar</span><strong>{kr(freeMoney)}</strong></div>
            <div className="free-money-math"><span><b>{kr(income)}</b><small>Inkomst</small></span><i>−</i><span><b>{kr(reservedTotal)}</b><small>Reserverat</small></span><i>−</i><span><b>{kr(freePurchaseSpent)}</b><small>Fria köp</small></span><i>=</i><span className="result"><b>{kr(freeMoney)}</b><small>Fritt</small></span></div>
          </div>
          <form className="management-form budget-form" onSubmit={addBudget}><select value={budgetForm.category} onChange={(event) => setBudgetForm((form) => ({ ...form, category: event.target.value }))}>{data.categories.filter((category) => !["Lön", "Fria köp", "Prenumerationer"].includes(category)).map((category) => <option key={category}>{category}</option>)}</select><input inputMode="numeric" placeholder="Månadsbudget" value={budgetForm.limit} onChange={(event) => setBudgetForm((form) => ({ ...form, limit: event.target.value }))}/><button type="submit"><Plus size={16}/> {editingBudgetId ? "Spara ändring" : "Spara budget"}</button>{editingBudgetId && <button className="secondary-action" onClick={cancelBudgetEdit} type="button">Avbryt</button>}</form>
          <div className="data-table">{budgetRows.map((budget) => <div className="table-row budget-table-row" key={budget.id}><span><b>{budget.category}</b><small>{kr(budget.used)} använt · {kr(budget.remaining)} kvar inom budgeten</small></span><div className="table-progress"><i style={{ width: `${budget.pct}%` }}/></div><strong>{kr(budget.limit)} reserverat</strong><span className="row-actions"><button onClick={() => editBudget(budget)} type="button">Redigera</button><button onClick={() => removeBudget(budget.id)} type="button"><Trash2 size={16}/></button></span></div>)}</div>
        </SectionPanel>
      )}

      {activeSection === "categories" && (
        <SectionPanel title="Kategorier" description="Skapa och välj egna kategorier.">
          <form className="management-form" onSubmit={addCategory}><input placeholder="Ny kategori, t.ex. Hund" value={categoryName} onChange={(event) => setCategoryName(event.target.value)}/><button type="submit"><Plus size={16}/> Lägg till kategori</button></form>
          <div className="chip-grid">{data.categories.map((category) => <button key={category} onClick={() => { setTransactionForm((form) => ({ ...form, category })); onNavigate("overview"); }} style={{ borderColor: categoryColors[category] ?? "#334155" }} type="button">{category}</button>)}</div>
        </SectionPanel>
      )}

      {activeSection === "goals" && (
        <SectionPanel title="Mål" description="Uppdatera ditt sparmål.">
          <form className="management-form goal-editor" onSubmit={saveGoal}><input value={goalForm.title} onChange={(event) => setGoalForm((goal) => ({ ...goal, title: event.target.value }))}/><input inputMode="numeric" value={goalForm.saved} onChange={(event) => setGoalForm((goal) => ({ ...goal, saved: Number(event.target.value) }))}/><input inputMode="numeric" value={goalForm.target} onChange={(event) => setGoalForm((goal) => ({ ...goal, target: Number(event.target.value) }))}/><button type="submit"><Edit3 size={16}/> Uppdatera mål</button></form>
          <GoalPanel goal={data.goal} goalProgress={goalProgress} onNavigate={onNavigate} />
        </SectionPanel>
      )}

      {activeSection === "subscriptions" && (
        <SectionPanel title="Fasta utgifter" description="Hyra, försäkring, lån, abonnemang och andra återkommande kostnader.">
          <form className="management-form subscription-form" onSubmit={addSubscription}><input placeholder="Namn" value={subscriptionForm.name} onChange={(event) => setSubscriptionForm((form) => ({ ...form, name: event.target.value }))}/><input placeholder="Typ / plan" value={subscriptionForm.plan} onChange={(event) => setSubscriptionForm((form) => ({ ...form, plan: event.target.value }))}/><input inputMode="numeric" placeholder="Belopp" value={subscriptionForm.amount} onChange={(event) => setSubscriptionForm((form) => ({ ...form, amount: event.target.value }))}/><input inputMode="numeric" min="1" max="28" value={subscriptionForm.day} onChange={(event) => setSubscriptionForm((form) => ({ ...form, day: event.target.value }))}/><button type="submit"><Plus size={16}/> {editingSubscriptionId ? "Spara ändring" : "Skapa ny utgift"}</button>{editingSubscriptionId && <button className="secondary-action" onClick={cancelSubscriptionEdit} type="button">Avbryt</button>}</form>
          <button className="wide-button action-wide" onClick={createSubscriptionExpenses} type="button">Skapa månadens fasta utgifter som transaktioner <ArrowRight size={15}/></button>
          <SubscriptionsPanel subscriptions={data.subscriptions} onNavigate={onNavigate} onGenerate={createSubscriptionExpenses} onEdit={editSubscription} onToggle={toggleSubscription} onRemove={removeSubscription} showAll />
        </SectionPanel>
      )}

      {activeSection === "insights" && <SectionPanel title="AI Insights" description="Smarta sammanfattningar baserat på det du lagt in."><InsightsPanel insights={topInsights} onNavigate={onNavigate} /></SectionPanel>}

      {activeSection === "reports" && (
        <SectionPanel title="Rapporter" description={`Sammanfattning för ${monthFormatter.format(monthDate)}.`}>
          <div className="report-grid"><div><span>Inkomster</span><b>{kr(income)}</b></div><div><span>Reserverat</span><b>{kr(reservedTotal)}</b></div><div><span>Fria pengar</span><b>{kr(freeMoney)}</b></div><div><span>Faktiskt saldo</span><b>{kr(actualBalance)}</b></div></div>
        </SectionPanel>
      )}

      {activeSection === "settings" && (
        <SectionPanel title="Inställningar" description="Hantera testdata och kontoinställningar.">
          <div className="settings-actions"><button onClick={resetDemo} type="button">Återställ demodata</button><button onClick={toggleProDemo} type="button">{proActive ? "Stäng av Pro-demo" : "Aktivera Pro-demo"}</button></div>
          <div className="settings-status"><span>Status</span><b>{proActive ? "Pro-demo aktiv" : "Standardläge"}</b></div>
        </SectionPanel>
      )}
    </div>
  );
}

function SectionPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="panel section-panel"><div className="section-heading"><h2>{title}</h2><p>{description}</p></div>{children}</section>;
}

function InsightsPanel({ insights, onNavigate }: { insights: string[]; onNavigate: (section: AppSection) => void }) {
  return (
    <article className="panel insights-panel">
      <CardTitle><Sparkles size={18} className="purple-text"/> AI Insights</CardTitle>
      <div className="insight-hero"><b>Din ekonomi är analyserad! 🎉</b><span>{insights[0]}</span></div>
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
  subscriptions: Subscription[];
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
      <div>{visibleSubscriptions.map((item) => <div className={`list-row subscription-row ${item.active ? "" : "inactive"}`} key={item.id}><Logo title={item.name} tone={item.name === "Spotify" ? "spotify" : item.name === "Netflix" ? "black" : "white"} /><span className="row-copy"><b>{item.name}</b><small>{item.plan} · dag {item.day}</small></span><span className="row-value"><b>{kr(item.amount)}</b><small>{item.active ? "Aktiv" : "Pausad"}</small></span><span className="row-actions"><button onClick={() => onEdit(item)} type="button">Redigera</button><button onClick={() => onToggle(item.id)} type="button">{item.active ? "Pausa" : "Aktivera"}</button><button onClick={() => onRemove(item.id)} type="button"><Trash2 size={14}/></button></span></div>)}</div>
      <button className="wide-button" onClick={onGenerate} type="button">Skapa utgifter <ArrowRight size={15}/></button>
    </article>
  );
}

function GoalPanel({ goal, goalProgress, onNavigate }: { goal: Goal; goalProgress: number; onNavigate: (section: AppSection) => void }) {
  return (
    <section className="goal-card panel">
      <div className="goal-copy"><h3>Ditt sparmål</h3><b>{goal.title}</b><strong>{goalProgress}%</strong><span>{kr(goal.saved)} av {kr(goal.target)}</span><div className="goal-progress"><i style={{ width: `${goalProgress}%` }}/></div><p>Du är på god väg! Fortsätt spara för att nå ditt mål.</p><button className="inline-link" onClick={() => onNavigate("goals")} type="button">Ändra sparmål</button></div>
      <button className="goal-image" onClick={() => onNavigate("goals")} type="button"><span><Crosshair size={27}/></span></button>
    </section>
  );
}
