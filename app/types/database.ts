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
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}