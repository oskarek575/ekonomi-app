import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export type PurchaseSource = "budget" | "free";
export type SubscriptionFrequency = "monthly" | "quarterly" | "semiannual" | "yearly" | "custom";

export type SubscriptionScheduleInput = {
  frequency: SubscriptionFrequency;
  interval_months: number;
  start_date: string;
};

export type TravelBudgetInput = {
  name: string;
  budget: number;
  start_date: string;
  end_date: string;
  separate_from_free_money: boolean;
};

export type TravelPurchaseInput = {
  travel_budget_id: number;
  title: string;
  amount: number;
  category: string;
  purchase_date: string;
};

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  return data.user;
}

export function onAuthChange(
  callback: (user: User | null) => void
) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  await ensureProfileForUserSafe(data.user);

  return data;
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      data: {
        full_name: name,
        name,
      },
    },
  });

  if (error) throw error;

  if (data.session) {
    await ensureProfileForUserSafe(data.user, name);
  }

  return data;
}

export type Profile = {
  id?: number;
  user_id?: string;
  monthly_income: number;
  monthly_savings: number;
  full_name?: string | null;
};

async function ensureProfileForUser(user: User | null, name?: string): Promise<Profile | null> {
  if (!user) return null;

  const fullName =
    name?.trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;

  const { data: existing, error: readError } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) throw readError;

  if (existing) {
    if (fullName && existing.full_name !== fullName) {
      const { data: updated, error: updateError } = await supabase
        .from("profile")
        .update({ full_name: fullName })
        .eq("user_id", user.id)
        .select()
        .maybeSingle();

      if (updateError) return existing as Profile;

      return updated as Profile | null;
    }

    return existing as Profile;
  }

  const { data: created, error: createError } = await supabase
    .from("profile")
    .insert([
      {
        user_id: user.id,
        monthly_income: 0,
        monthly_savings: 0,
        full_name: fullName,
      },
    ])
    .select()
    .single();

  if (createError) {
    const { data: fallbackCreated, error: fallbackCreateError } = await supabase
      .from("profile")
      .insert([
        {
          user_id: user.id,
          monthly_income: 0,
          monthly_savings: 0,
        },
      ])
      .select()
      .single();

    if (fallbackCreateError) throw createError;

    return fallbackCreated as Profile;
  }

  return created as Profile;
}

async function ensureProfileForUserSafe(user: User | null, name?: string) {
  try {
    await ensureProfileForUser(user, name);
  } catch (error) {
    console.warn("Profile could not be prepared yet.", error);
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

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
}

export async function getProfile() {
  const user = await getCurrentUser();

  return ensureProfileForUser(user);
}

export async function updateProfile(
  monthly_income: number,
  monthly_savings: number
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Du behöver vara inloggad för att spara profil.");

  await ensureProfileForUser(user);

  const { error } = await supabase
    .from("profile")
    .update({
      monthly_income,
      monthly_savings,
    })
    .eq("user_id", user.id);

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
  day_of_month: number,
  schedule?: SubscriptionScheduleInput
) {
  const payload = {
    name,
    amount,
    category,
    day_of_month,
    ...(schedule ?? {}),
  };

  let { data, error } = await supabase
    .from("subscriptions")
    .insert([payload])
    .select()
    .single();

  if (error && schedule) {
    ({ data, error } = await supabase
      .from("subscriptions")
      .insert([{ name, amount, category, day_of_month }])
      .select()
      .single());
  }

  if (error) throw error;

  return data;
}

export async function updateSubscription(
  id: number,
  name: string,
  amount: number,
  category: string,
  day_of_month: number,
  active: boolean,
  schedule?: SubscriptionScheduleInput
) {
  let { error } = await supabase
    .from("subscriptions")
    .update({
      name,
      amount,
      category,
      day_of_month,
      active,
      ...(schedule ?? {}),
    })
    .eq("id", id);

  if (error && schedule) {
    ({ error } = await supabase
      .from("subscriptions")
      .update({
        name,
        amount,
        category,
        day_of_month,
        active,
      })
      .eq("id", id));
  }

  if (error) throw error;
}

export async function deleteSubscription(id: number) {
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getTravelBudgets() {
  const { data, error } = await supabase
    .from("travel_budgets")
    .select("*, travel_purchases(*)")
    .order("start_date", { ascending: false });

  if (error) throw error;

  return data;
}

export async function addTravelBudget(input: TravelBudgetInput) {
  const { data, error } = await supabase
    .from("travel_budgets")
    .insert([input])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateTravelBudget(id: number, input: TravelBudgetInput) {
  const { error } = await supabase
    .from("travel_budgets")
    .update(input)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteTravelBudget(id: number) {
  const { error } = await supabase
    .from("travel_budgets")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function addTravelPurchase(input: TravelPurchaseInput) {
  const { data, error } = await supabase
    .from("travel_purchases")
    .insert([input])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteTravelPurchase(id: number) {
  const { error } = await supabase
    .from("travel_purchases")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCurrentUserData() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Du behöver vara inloggad för att radera din data.");

  const tables = [
    "travel_purchases",
    "travel_budgets",
    "kop",
    "budgets",
    "categories",
    "subscriptions",
    "goals",
    "savings_accounts",
    "profile",
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;
  }
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
