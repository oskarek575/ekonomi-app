import { supabase } from "./supabase";

export async function getBudgets() {
  const { data, error } = await supabase
    .from("budgets")
    .select("*");

  if (error) throw error;

  return data;
}
function getCurrentMonth() {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
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
export async function addPurchase(
  beskrivning: string,
  belopp: number,
  kategori: string,
  subscription_id?: number
) {
  const { error } = await supabase
    .from("kop")
    .insert([
      {
        beskrivning,
        belopp,
        kategori,
        subscription_id,
      },
    ]);

  if (error) throw error;
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
  kategori: string
) {
  const { error } = await supabase
    .from("kop")
    .update({
      beskrivning,
      belopp,
      kategori,
    })
    .eq("id", id);

  if (error) throw error;
}
export async function addBudget(
  category: string,
  monthly_budget: number
) {
  const { error } = await supabase
    .from("budgets")
    .insert([
      {
        category,
        monthly_budget,
      },
    ]);

  if (error) throw error;
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
  const { error } = await supabase
    .from("categories")
    .insert([
      {
        name,
        color,
        icon,
      },
    ]);

  if (error) throw error;
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
  const { error } = await supabase
    .from("subscriptions")
    .insert([
      {
        name,
        amount,
        category,
        day_of_month,
      },
    ]);

  if (error) throw error;
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

    await supabase
      .from("kop")
      .insert([
        {
          beskrivning: subscription.name,
          belopp: subscription.amount,
          kategori: subscription.category,
          subscription_id: subscription.id,
        },
      ]);
  }
}