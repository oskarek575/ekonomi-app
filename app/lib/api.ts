import { supabase } from "./supabase";

export type PurchaseSource = "budget" | "free";

export type GoalInput = {
  title: string;
  saved: number;
  target: number;
};

export type SavingsInput = {
  name: string;
  amount: number;
};

export async function getBudgets() {
  const { data, error } = await supabase
    .from("budgets")
    .select("*");

  if (error) throw error;

  return data;
}
export async function getPurchases(
  month: number,
  year: number
) {
 const start = new Date(year, month, 1).toISOString();
const end = new Date(year, month + 1, 1).toISOString();

  const { data, error } = await supabase
    .from("kop")
    .select("*")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function getGoals() {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data;
}

export async function addGoal({ title, saved, target }: GoalInput) {
  const { data, error } = await supabase
    .from("goals")
    .insert([{ title, saved, target }])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateGoal(
  id: number,
  { title, saved, target }: GoalInput
) {
  const { error } = await supabase
    .from("goals")
    .update({ title, saved, target })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteGoal(id: number) {
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getSavingsAccounts() {
  const { data, error } = await supabase
    .from("savings_accounts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data;
}

export async function addSavingsAccount({ name, amount }: SavingsInput) {
  const { data, error } = await supabase
    .from("savings_accounts")
    .insert([{ name, amount }])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateSavingsAccount(
  id: number,
  { name, amount }: SavingsInput
) {
  const { error } = await supabase
    .from("savings_accounts")
    .update({ name, amount })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteSavingsAccount(id: number) {
  const { error } = await supabase
    .from("savings_accounts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
export async function getPurchasesByDateRange(
  start: Date,
  end: Date
) {
  const { data, error } = await supabase
    .from("kop")
    .select("*")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}
export async function addPurchase(
  beskrivning: string,
  belopp: number,
  kategori: string,
  subscription_id?: number,
  created_at?: string,
  source?: PurchaseSource
) {
  const payload: {
    beskrivning: string;
    belopp: number;
    kategori: string;
    subscription_id?: number;
    created_at?: string;
    source?: PurchaseSource;
  } = {
    beskrivning,
    belopp,
    kategori,
  };

  if (subscription_id !== undefined) {
    payload.subscription_id = subscription_id;
  }

  if (created_at !== undefined) {
    payload.created_at = created_at;
  }

  if (source !== undefined) {
    payload.source = source;
  }

  const insertPurchase = async (nextPayload: typeof payload) => supabase
    .from("kop")
    .insert([nextPayload])
    .select()
    .single();

  let { data, error } = await insertPurchase(payload);

  if (error && source !== undefined) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.source;
    ({ data, error } = await insertPurchase(fallbackPayload));
  }

  if (error) throw error;

  return data;
}
export async function deletePurchase(id: number) {
  const { error } = await supabase
    .from("kop")
    .delete()
    .eq("id", id);

  if (error) throw error;
}export async function getProfile() {
  const { data, error } = await supabase
    .from("profile")
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function updateProfile(
  monthly_income: number,
  monthly_savings: number
) {
  const { error } = await supabase
    .from("profile")
    .update({
      monthly_income,
      monthly_savings,
    })
    .eq("id", 1);

  if (error) throw error;
}
export async function updatePurchase(
  id: number,
  beskrivning: string,
  belopp: number,
  kategori: string,
  created_at?: string,
  source?: PurchaseSource
) {
  const payload: {
    beskrivning: string;
    belopp: number;
    kategori: string;
    created_at?: string;
    source?: PurchaseSource;
  } = {
    beskrivning,
    belopp,
    kategori,
    created_at,
  };

  if (source !== undefined) {
    payload.source = source;
  }

  const updatePurchaseRow = async (nextPayload: typeof payload) => supabase
    .from("kop")
    .update(nextPayload)
    .eq("id", id);

  let { error } = await updatePurchaseRow(payload);

  if (error && source !== undefined) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.source;
    ({ error } = await updatePurchaseRow(fallbackPayload));
  }

  if (error) throw error;
}
export async function addBudget(
  category: string,
  monthly_budget: number
) {
  const { data, error } = await supabase
    .from("budgets")
    .insert([
      {
        category,
        monthly_budget,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateBudget(
  id: number,
  category: string,
  monthly_budget: number
) {
  const { error } = await supabase
    .from("budgets")
    .update({
      category,
      monthly_budget,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteBudget(id: number) {
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw error;

  return data;
}

export async function addCategory(
  name: string,
  color: string,
  icon: string
) {
  const { data, error } = await supabase
    .from("categories")
    .insert([
      {
        name,
        color,
        icon,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateCategory(
  id: number,
  name: string,
  color: string,
  icon: string
) {
  const { error } = await supabase
    .from("categories")
    .update({
      name,
      color,
      icon,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCategory(id: number) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
export async function getSubscriptions() {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("day_of_month");

  if (error) throw error;

  return data;
}

export async function addSubscription(
  name: string,
  amount: number,
  category: string,
  day_of_month: number
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert([
      {
        name,
        amount,
        category,
        day_of_month,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateSubscription(
  id: number,
  name: string,
  amount: number,
  category: string,
  day_of_month: number,
  active: boolean
) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      name,
      amount,
      category,
      day_of_month,
      active,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteSubscription(id: number) {
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
export async function generateSubscriptionsForCurrentMonth() {
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("active", true);

  if (error) throw error;

  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  ).toISOString();

  for (const subscription of subscriptions) {
    const { data: existing } = await supabase
      .from("kop")
      .select("id")
      .eq("subscription_id", subscription.id)
      .gte("created_at", start)
      .lt("created_at", end)
      .limit(1);

    if (existing && existing.length > 0) {
      continue;
    }

    await addPurchase(
      subscription.name,
      subscription.amount,
      subscription.category,
      subscription.id,
      undefined,
      "budget"
    );
  }
}
