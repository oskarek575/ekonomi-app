// Delade typer för dashboarden (utbrutna ur Dashboard.tsx).

export type TransactionType = "income" | "expense";
export type PurchaseSource = "budget" | "free";
export type SubscriptionFrequency = "monthly" | "quarterly" | "semiannual" | "yearly" | "custom";

export type Transaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  type: TransactionType;
  source?: PurchaseSource;
  subscriptionId?: string;
};

export type TransactionForm = {
  title: string;
  amount: string;
  category: string;
  type: TransactionType;
  source: PurchaseSource;
  date: string;
};

export type QuickPurchaseSuggestion = {
  title: string;
  category: string;
};

export type Budget = {
  id: string;
  category: string;
  limit: number;
};

export type Subscription = {
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

export type Goal = {
  id: string;
  title: string;
  saved: number;
  target: number;
  linkedSavingsId?: string;
};

export type SavingsAccount = {
  id: string;
  name: string;
  amount: number;
  createdAt?: string;
};

export type Loan = {
  id: string;
  name: string;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  paymentDay: number;
};

export type TravelPurchase = {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
};

export type TravelBudget = {
  id: string;
  name: string;
  budget: number;
  startDate: string;
  endDate: string;
  separateFromFreeMoney: boolean;
  purchases: TravelPurchase[];
};

export type AffordabilityResult = {
  answer: "Ja" | "Nej" | "Ja, men tajt";
  tone: "good" | "warning" | "bad";
  summary: string;
  details: string[];
};

export type FinanceData = {
  openingBalance: number;
  transactions: Transaction[];
  budgets: Budget[];
  subscriptions: Subscription[];
  categories: string[];
  categoryDetails: Record<string, CategoryDetail>;
  goals: Goal[];
  savings: SavingsAccount[];
  loans: Loan[];
  travelBudgets: TravelBudget[];
};

export type CategoryDetail = {
  color: string;
  icon: string;
};

export type RemotePurchase = {
  id: number;
  beskrivning: string;
  belopp: number;
  kategori: string;
  created_at: string;
  source?: PurchaseSource | null;
  subscription_id?: number | null;
};

export type RemoteBudget = {
  id: number;
  category: string;
  monthly_budget: number;
};

export type RemoteCategory = {
  id: number;
  name: string;
  color: string;
  icon: string;
};

export type RemoteSubscription = {
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

export type RemoteGoal = {
  id: number;
  title: string;
  saved: number;
  target: number;
};

export type RemoteSavingsAccount = {
  id: number;
  name: string;
  amount: number;
  created_at?: string;
};

export type RemoteLoan = {
  id: number;
  name: string;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number;
  payment_day: number;
};

export type SupportTicket = {
  id: number;
  user_id?: string | null;
  type: "bug" | "idea" | "question" | "other";
  message: string;
  page?: string | null;
  app_version?: string | null;
  status: "new" | "reviewed" | "planned" | "done" | "closed";
  created_at: string;
};

export type RemoteTravelPurchase = {
  id: number;
  travel_budget_id: number;
  title: string;
  amount: number;
  category: string;
  purchase_date: string;
};

export type RemoteTravelBudget = {
  id: number;
  name: string;
  budget: number;
  start_date: string;
  end_date: string;
  separate_from_free_money: boolean;
  travel_purchases?: RemoteTravelPurchase[];
};


export type AppExportPayload = {
  app?: string;
  version?: string;
  exportedAt?: string;
  month?: string;
  data?: Partial<FinanceData>;
};
export type LayoutTheme =
  | "red"
  | "orange"
  | "yellow"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "purple"
  | "rose"
  | "slate";

