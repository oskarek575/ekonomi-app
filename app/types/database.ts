export interface Budget {
  id: number;
  category: string;
  monthly_budget: number;
}

export interface Purchase {
  id: number;
  beskrivning: string;
  belopp: number;
  kategori: string;
  created_at: string;
  source?: "budget" | "free";
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Subscription {
  id: number;
  name: string;
  amount: number;
  category: string;
  day_of_month: number;
  active: boolean;
}

export interface Goal {
  id: number;
  title: string;
  saved: number;
  target: number;
  created_at: string;
}

export interface SavingsAccount {
  id: number;
  name: string;
  amount: number;
  created_at: string;
}
