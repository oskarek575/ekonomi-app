export interface Budget {
  id: number;
  user_id?: string;
  category: string;
  monthly_budget: number;
}

export interface Purchase {
  id: number;
  user_id?: string;
  beskrivning: string;
  belopp: number;
  kategori: string;
  created_at: string;
  source?: "budget" | "free";
}

export interface Category {
  id: number;
  user_id?: string;
  name: string;
  color: string;
  icon: string;
}

export interface Subscription {
  id: number;
  user_id?: string;
  name: string;
  amount: number;
  category: string;
  day_of_month: number;
  active: boolean;
}

export interface Goal {
  id: number;
  user_id?: string;
  title: string;
  saved: number;
  target: number;
  created_at: string;
}

export interface SavingsAccount {
  id: number;
  user_id?: string;
  name: string;
  amount: number;
  created_at: string;
}
