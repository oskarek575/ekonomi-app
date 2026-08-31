export type FinanceTransactionType = "income" | "expense";
export type FinancePurchaseSource = "budget" | "free";
export type FinanceSubscriptionFrequency = "monthly" | "quarterly" | "semiannual" | "yearly" | "custom";

export type FinanceTransaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: FinanceTransactionType;
  source?: FinancePurchaseSource;
  subscriptionId?: string;
};

export type FinanceBudget = {
  id: string;
  category: string;
  limit: number;
};

export type FinanceSubscription = {
  id: string;
  name: string;
  plan: string;
  amount: number;
  day: number;
  active: boolean;
  frequency?: FinanceSubscriptionFrequency;
  intervalMonths?: number;
  startDate?: string;
};

export type FinanceSavingsAccount = {
  id: string;
  name: string;
  amount: number;
  createdAt?: string;
};

export type FinanceTravelBudget = {
  id: string;
  name: string;
  budget: number;
  startDate: string;
  endDate: string;
  separateFromFreeMoney: boolean;
  purchases: {
    id: string;
    title: string;
    amount: number;
    category: string;
    date: string;
  }[];
};

export type ScheduledFinanceSubscription = FinanceSubscription & {
  dueDate: string | null;
  nextDueDate: string | null;
  scheduleLabel: string;
  isDueThisPeriod: boolean;
};

export type FinanceBudgetRow = FinanceBudget & {
  used: number;
  pct: number;
  remaining: number;
  overspent: number;
};

export type FinanceBalanceLine = {
  label: string;
  amount: number;
  tone: "plus" | "minus";
  detail: string;
};

export type FinanceSummary = {
  period: { start: Date; end: Date };
  monthTransactions: FinanceTransaction[];
  income: number;
  expenses: number;
  freePurchaseSpent: number;
  todayFreePurchaseSpent: number;
  reservedBudgetTotal: number;
  scheduledSubscriptions: ScheduledFinanceSubscription[];
  fixedExpenseTotal: number;
  fixedExpenseRemaining: number;
  missingPostedSubscriptions: ScheduledFinanceSubscription[];
  missingPostedFixedExpenses: number;
  reservedTotal: number;
  reservedRemaining: number;
  travelPurchasesInPeriod: FinanceTravelBudget["purchases"];
  travelSpentForActualBalance: number;
  travelSpentAffectingFreeMoney: number;
  savingsTotal: number;
  savingsTransactionTotal: number;
  actualExpenses: number;
  actualBalance: number;
  budgetRows: FinanceBudgetRow[];
  budgetOverspendTotal: number;
  freeMoney: number;
  freeMoneyBase: number;
  freeMoneyProgress: number;
  remainingDays: number;
  freeMoneyPerDay: number;
  plannedAvailableMoney: number;
  plannedVsActualDifference: number;
  balanceBreakdown: FinanceBalanceLine[];
};

const defaultSalaryDay = 25;
const oneDayMs = 86_400_000;

export function normalizeFinanceText(value: string) {
  return value.trim().toLowerCase();
}

export function formatFinanceDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getCurrentFinancialMonth(date = new Date(), salaryDay = defaultSalaryDay) {
  const financialMonth = new Date(date);

  if (date.getDate() >= salaryDay) {
    financialMonth.setDate(1);
    financialMonth.setMonth(financialMonth.getMonth() + 1);
  }

  return `${financialMonth.getFullYear()}-${String(financialMonth.getMonth() + 1).padStart(2, "0")}`;
}

export function getFinancialPeriod(month: string, salaryDay = defaultSalaryDay) {
  const [year, monthNumber] = month.split("-").map(Number);
  const selectedMonthIndex = monthNumber - 1;

  return {
    start: new Date(year, selectedMonthIndex - 1, salaryDay, 0, 0, 0, 0),
    end: new Date(year, selectedMonthIndex, salaryDay, 0, 0, 0, 0),
  };
}

export function isInFinancialPeriod(date: string, month: string, salaryDay = defaultSalaryDay) {
  const { start, end } = getFinancialPeriod(month, salaryDay);
  const itemDate = new Date(`${date}T12:00:00`);

  return itemDate >= start && itemDate < end;
}

export function dateForFinancialPeriodDay(month: string, day: number, salaryDay = defaultSalaryDay) {
  const [year, monthNumber] = month.split("-").map(Number);
  const targetMonthIndex = day >= salaryDay ? monthNumber - 2 : monthNumber - 1;

  return formatFinanceDate(new Date(year, targetMonthIndex, day));
}

export function isFreePurchase(
  item: Pick<FinanceTransaction, "type" | "source" | "category">,
  budgetCategorySet?: Set<string>
) {
  if (item.type !== "expense") return false;
  if (item.source === "free" || item.category === "Fria köp") return true;
  if (item.source === "budget") return false;

  return budgetCategorySet ? !budgetCategorySet.has(normalizeFinanceText(item.category)) : false;
}

export function getSavingsTransactionTitle(name: string) {
  return `Sparande till ${name}`;
}

export function isSavingsTransferTransaction(transaction: FinanceTransaction) {
  return transaction.type === "expense" && normalizeFinanceText(transaction.title).startsWith("sparande till ");
}

function clampPaymentDay(day: number) {
  if (!Number.isFinite(day)) return 1;

  return Math.min(28, Math.max(1, Math.round(day)));
}

function getSubscriptionIntervalMonths(subscription: Pick<FinanceSubscription, "frequency" | "intervalMonths">) {
  if (subscription.frequency === "custom") {
    return Math.max(1, Math.round(subscription.intervalMonths ?? 1));
  }

  const monthsByFrequency: Record<Exclude<FinanceSubscriptionFrequency, "custom">, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    yearly: 12,
  };

  return monthsByFrequency[subscription.frequency ?? "monthly"] ?? 1;
}

function getSubscriptionScheduleLabel(subscription: FinanceSubscription) {
  if (subscription.frequency === "custom") {
    return `Var ${getSubscriptionIntervalMonths(subscription)}:e månad`;
  }

  const labels: Record<FinanceSubscriptionFrequency, string> = {
    monthly: "Varje månad",
    quarterly: "Varje kvartal",
    semiannual: "Varje halvår",
    yearly: "Varje år",
    custom: "Anpassad",
  };

  return labels[subscription.frequency ?? "monthly"];
}

function getSubscriptionStartDate(subscription: Pick<FinanceSubscription, "startDate" | "day">, month: string, salaryDay: number) {
  return subscription.startDate ?? dateForFinancialPeriodDay(month, clampPaymentDay(subscription.day), salaryDay);
}

function monthsBetween(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
}

function subscriptionOccurrenceDate(start: Date, monthOffset: number, day: number) {
  return new Date(start.getFullYear(), start.getMonth() + monthOffset, clampPaymentDay(day), 12, 0, 0, 0);
}

export function getSubscriptionDueDateInPeriod(subscription: FinanceSubscription, month: string, salaryDay = defaultSalaryDay) {
  if (!subscription.active) return null;

  const period = getFinancialPeriod(month, salaryDay);
  const intervalMonths = getSubscriptionIntervalMonths(subscription);
  const startDate = new Date(`${getSubscriptionStartDate(subscription, month, salaryDay)}T12:00:00`);
  const firstOccurrence = subscriptionOccurrenceDate(startDate, 0, subscription.day);
  const firstPossibleOffset = Math.max(0, Math.floor(monthsBetween(firstOccurrence, period.start) / intervalMonths) * intervalMonths);

  for (let offset = firstPossibleOffset; offset <= firstPossibleOffset + intervalMonths + 24; offset += intervalMonths) {
    const occurrence = subscriptionOccurrenceDate(firstOccurrence, offset, subscription.day);

    if (occurrence >= period.end) return null;
    if (occurrence >= period.start) return formatFinanceDate(occurrence);
  }

  return null;
}

export function getNextSubscriptionDueDate(subscription: FinanceSubscription, fromDate = new Date()) {
  if (!subscription.active) return null;

  const intervalMonths = getSubscriptionIntervalMonths(subscription);
  const startDate = new Date(`${subscription.startDate ?? formatFinanceDate(fromDate)}T12:00:00`);
  const firstOccurrence = subscriptionOccurrenceDate(startDate, 0, subscription.day);
  const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 12, 0, 0, 0);

  for (let offset = 0; offset <= 240; offset += intervalMonths) {
    const occurrence = subscriptionOccurrenceDate(firstOccurrence, offset, subscription.day);
    if (occurrence >= today) return formatFinanceDate(occurrence);
  }

  return null;
}

function isOnOrBeforeToday(date: string, today = new Date()) {
  const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
  const target = new Date(`${date}T12:00:00`);

  return target <= todayAtNoon;
}

function dayDistance(left: string, right: string) {
  const leftTime = new Date(`${left}T12:00:00`).getTime();
  const rightTime = new Date(`${right}T12:00:00`).getTime();

  return Math.abs(Math.round((leftTime - rightTime) / oneDayMs));
}

function textLooksRelated(left: string, right: string) {
  const normalizedLeft = normalizeFinanceText(left);
  const normalizedRight = normalizeFinanceText(right);

  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
}

export function hasMatchingTransaction(
  transactions: FinanceTransaction[],
  match: { id?: string; title: string; amount: number; date: string }
) {
  return transactions.some((transaction) => {
    if (transaction.type !== "expense") return false;

    if (match.id && transaction.subscriptionId === match.id) {
      return true;
    }

    const sameRoundedAmount = Math.round(transaction.amount) === Math.round(match.amount);
    const closePostingDate = dayDistance(transaction.date, match.date) <= 2;

    return sameRoundedAmount
      && closePostingDate
      && textLooksRelated(transaction.title, match.title);
  });
}

function daysLeftInPeriod(period: { start: Date; end: Date }, today = new Date()) {
  const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);

  if (todayAtNoon < period.start || todayAtNoon >= period.end) {
    return Math.max(1, Math.ceil((period.end.getTime() - period.start.getTime()) / oneDayMs));
  }

  return Math.max(1, Math.ceil((period.end.getTime() - todayAtNoon.getTime()) / oneDayMs));
}

export function calculateFinanceSummary({
  transactions,
  budgets,
  subscriptions,
  savings,
  travelBudgets,
  month,
  openingBalance = 0,
  today = new Date(),
  salaryDay = defaultSalaryDay,
}: {
  transactions: FinanceTransaction[];
  budgets: FinanceBudget[];
  subscriptions: FinanceSubscription[];
  savings: FinanceSavingsAccount[];
  travelBudgets: FinanceTravelBudget[];
  month: string;
  openingBalance?: number;
  today?: Date;
  salaryDay?: number;
}): FinanceSummary {
  const period = getFinancialPeriod(month, salaryDay);
  const budgetCategorySet = new Set(budgets.map((budget) => normalizeFinanceText(budget.category)));
  const monthTransactions = transactions.filter((item) => isInFinancialPeriod(item.date, month, salaryDay));
  const income = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const freePurchaseSpent = monthTransactions
    .filter((item) => isFreePurchase(item, budgetCategorySet))
    .reduce((sum, item) => sum + item.amount, 0);
  const todayKey = formatFinanceDate(today);
  const todayFreePurchaseSpent = monthTransactions
    .filter((item) => isFreePurchase(item, budgetCategorySet) && item.date === todayKey)
    .reduce((sum, item) => sum + item.amount, 0);
  const reservedBudgetTotal = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const scheduledSubscriptions: ScheduledFinanceSubscription[] = subscriptions.map((subscription) => {
    const dueDate = getSubscriptionDueDateInPeriod(subscription, month, salaryDay);
    const nextDueDate = getNextSubscriptionDueDate(subscription, today);

    return {
      ...subscription,
      dueDate,
      nextDueDate,
      scheduleLabel: getSubscriptionScheduleLabel(subscription),
      isDueThisPeriod: Boolean(dueDate),
    };
  });
  const fixedExpenseTotal = scheduledSubscriptions
    .filter((subscription) => subscription.isDueThisPeriod)
    .reduce((sum, subscription) => sum + subscription.amount, 0);
  const fixedExpenseRemaining = scheduledSubscriptions
    .filter((subscription) => subscription.active && subscription.dueDate)
    .filter((subscription) => !hasMatchingTransaction(monthTransactions, {
      id: subscription.id,
      title: subscription.name,
      amount: subscription.amount,
      date: subscription.dueDate ?? "",
    }))
    .reduce((sum, subscription) => sum + subscription.amount, 0);
  const missingPostedSubscriptions = scheduledSubscriptions
    .filter((subscription) => subscription.active && subscription.dueDate && isOnOrBeforeToday(subscription.dueDate, today))
    .filter((subscription) => !hasMatchingTransaction(monthTransactions, {
      id: subscription.id,
      title: subscription.name,
      amount: subscription.amount,
      date: subscription.dueDate ?? "",
    }));
  const missingPostedFixedExpenses = missingPostedSubscriptions
    .reduce((sum, subscription) => sum + subscription.amount, 0);
  const reservedTotal = reservedBudgetTotal + fixedExpenseTotal;
  const travelPurchasesInPeriod = travelBudgets
    .flatMap((travel) => travel.purchases)
    .filter((purchase) => isInFinancialPeriod(purchase.date, month, salaryDay));
  const travelSpentForActualBalance = travelPurchasesInPeriod
    .filter((purchase) => !hasMatchingTransaction(monthTransactions, {
      title: purchase.title,
      amount: purchase.amount,
      date: purchase.date,
    }))
    .reduce((sum, purchase) => sum + purchase.amount, 0);
  const travelSpentAffectingFreeMoney = travelBudgets
    .filter((travel) => !travel.separateFromFreeMoney)
    .flatMap((travel) => travel.purchases)
    .filter((purchase) => isInFinancialPeriod(purchase.date, month, salaryDay))
    .reduce((sum, purchase) => sum + purchase.amount, 0);
  const savingsTotal = savings.reduce((sum, saving) => sum + saving.amount, 0);
  const savingsTransactionTotal = monthTransactions
    .filter(isSavingsTransferTransaction)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const actualExpenses = expenses + missingPostedFixedExpenses + travelSpentForActualBalance;
  const actualBalance = openingBalance + income - actualExpenses;
  const budgetRows = budgets.map((budget) => {
    const used = monthTransactions
      .filter((item) => item.type === "expense" && item.category === budget.category && !isFreePurchase(item, budgetCategorySet))
      .reduce((sum, item) => sum + item.amount, 0);
    const pct = budget.limit > 0 ? Math.min(100, Math.round((used / budget.limit) * 100)) : 0;
    const remaining = Math.max(budget.limit - used, 0);
    const overspent = Math.max(used - budget.limit, 0);

    return { ...budget, used, pct, remaining, overspent };
  });
  const budgetOverspendTotal = budgetRows.reduce((sum, budget) => sum + budget.overspent, 0);
  const budgetRemainingTotal = budgetRows.reduce((sum, budget) => sum + budget.remaining, 0);
  const reservedRemaining = budgetRemainingTotal + fixedExpenseRemaining;
  const freeMoney = income - reservedTotal - freePurchaseSpent - travelSpentAffectingFreeMoney - budgetOverspendTotal;
  const freeMoneyBase = Math.max(income - reservedTotal, 1);
  const freeMoneyProgress = Math.max(0, Math.min(100, Math.round((Math.max(freeMoney, 0) / freeMoneyBase) * 100)));
  const remainingDays = daysLeftInPeriod(period, today);
  const freeMoneyPerDay = Math.max(0, Math.floor(freeMoney / Math.max(remainingDays, 1)));
  const plannedAvailableMoney = budgetRemainingTotal + freeMoney;
  const plannedVsActualDifference = plannedAvailableMoney - actualBalance;

  return {
    period,
    monthTransactions,
    income,
    expenses,
    freePurchaseSpent,
    todayFreePurchaseSpent,
    reservedBudgetTotal,
    scheduledSubscriptions,
    fixedExpenseTotal,
    fixedExpenseRemaining,
    missingPostedSubscriptions,
    missingPostedFixedExpenses,
    reservedTotal,
    reservedRemaining,
    travelPurchasesInPeriod,
    travelSpentForActualBalance,
    travelSpentAffectingFreeMoney,
    savingsTotal,
    savingsTransactionTotal,
    actualExpenses,
    actualBalance,
    budgetRows,
    budgetOverspendTotal,
    freeMoney,
    freeMoneyBase,
    freeMoneyProgress,
    remainingDays,
    freeMoneyPerDay,
    plannedAvailableMoney,
    plannedVsActualDifference,
    balanceBreakdown: [
      { label: "Ingående saldo", amount: openingBalance, tone: "plus", detail: "Det saldo du anger som start för löneperioden" },
      { label: "Inkomster", amount: income, tone: "plus", detail: "Registrerade inkomster i löneperioden" },
      { label: "Registrerade utgifter", amount: -expenses, tone: "minus", detail: "Alla köp som finns som transaktioner" },
      { label: "Fasta utgifter som borde vara dragna", amount: -missingPostedFixedExpenses, tone: "minus", detail: "Schemalagda dragningar utan matchande transaktion" },
      { label: "Resebudget utanför transaktioner", amount: -travelSpentForActualBalance, tone: "minus", detail: "Resköp som inte redan finns som vanlig transaktion" },
    ],
  };
}
