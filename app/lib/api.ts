import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";
import type { HabitCheckStatus, HabitData } from "./habits/model";

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

export type LoanInput = {
  name: string;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number;
  payment_day: number;
};

export type FeedbackInput = {
  type: "bug" | "idea" | "question" | "other";
  message: string;
  page?: string;
  app_version?: string;
};

export type HabitInput = {
  name: string;
  weekdays: number[];
  created: string;
};

export type AdminStats = {
  configured: boolean;
  message?: string;
  generatedAt: string;
  users?: {
    total: number;
    active7: number;
    active30: number;
    new30: number;
    confirmed: number;
  };
  app?: {
    activeWriters30: number;
    rowsByTable: { table: string; rows: number | null; last30: number | null }[];
  };
  support?: {
    open: number;
    total: number;
  };
  recentUsers?: {
    id: string;
    email?: string;
    name?: string | null;
    createdAt?: string;
    lastSeenAt?: string | null;
    lastSignInAt?: string | null;
  }[];
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
  opening_balance?: number;
  full_name?: string | null;
  last_seen_at?: string | null;
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
        opening_balance: 0,
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

export async function updateLastSeenAt() {
  const user = await getCurrentUser();
  if (!user) return;

  await ensureProfileForUserSafe(user);

  const { error } = await supabase
    .from("profile")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", user.id);

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

export async function updateProfileName(full_name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Du behöver vara inloggad för att ändra namn.");

  await ensureProfileForUser(user, full_name);

  const { error: profileError } = await supabase
    .from("profile")
    .update({ full_name })
    .eq("user_id", user.id);

  if (profileError) throw profileError;

  const { data, error: authError } = await supabase.auth.updateUser({
    data: {
      full_name,
      name: full_name,
    },
  });

  if (authError) throw authError;

  return data.user;
}

export async function updateOpeningBalance(opening_balance: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Du behöver vara inloggad för att spara ingående saldo.");

  await ensureProfileForUser(user);

  const { error } = await supabase
    .from("profile")
    .update({ opening_balance })
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

export async function deleteCategoryByName(name: string) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("name", name);

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

export async function getLoans() {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data;
}

export async function addLoan(input: LoanInput) {
  const { data, error } = await supabase
    .from("loans")
    .insert([input])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateLoan(id: number, input: LoanInput) {
  const { error } = await supabase
    .from("loans")
    .update(input)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteLoan(id: number) {
  const { error } = await supabase
    .from("loans")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function deleteCurrentUserData() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Du behöver vara inloggad för att radera din data.");

  const tables = [
    "feedback",
    "habit_checks",
    "habit_pauses",
    "journal_entries",
    "habits",
    "travel_purchases",
    "travel_budgets",
    "loans",
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

type HabitRow = {
  id: number | string;
  name: string;
  weekdays: number[] | string | null;
  created_day: string;
  habit_pauses?: HabitPauseRow[] | null;
};

type HabitPauseRow = {
  id: number | string;
  from_day: string;
  until_day: string | null;
};

type HabitCheckRow = {
  habit_id: number | string;
  day: string;
  status: HabitCheckStatus;
};

type JournalEntryRow = {
  day: string;
  text: string | null;
  mood: number | null;
};

function parseHabitWeekdays(value: HabitRow["weekdays"]) {
  if (Array.isArray(value)) return value.map(Number).filter((day) => Number.isInteger(day));

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(Number).filter((day) => Number.isInteger(day));
    } catch {
      return [];
    }
  }

  return [];
}

function toRemoteId(id: string) {
  const remoteId = Number(id);
  if (!Number.isFinite(remoteId)) {
    throw new Error("Ogiltigt id.");
  }

  return remoteId;
}

async function getHabitUserId() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Du behöver vara inloggad för att använda vanor.");
  }

  return user.id;
}

export async function getHabitData(): Promise<HabitData> {
  const userId = await getHabitUserId();
  const [habitsResult, checksResult, journalResult] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, weekdays, created_day, habit_pauses(id, from_day, until_day)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_checks")
      .select("habit_id, day, status")
      .eq("user_id", userId),
    supabase
      .from("journal_entries")
      .select("day, text, mood")
      .eq("user_id", userId)
      .order("day", { ascending: false }),
  ]);

  if (habitsResult.error) throw habitsResult.error;
  if (checksResult.error) throw checksResult.error;
  if (journalResult.error) throw journalResult.error;

  const checks: HabitData["checks"] = {};
  (checksResult.data as HabitCheckRow[] | null)?.forEach((row) => {
    if (row.status !== "done" && row.status !== "skipped") return;

    const habitId = String(row.habit_id);
    checks[habitId] ??= {};
    checks[habitId][row.day] = row.status;
  });

  const journal: HabitData["journal"] = {};
  (journalResult.data as JournalEntryRow[] | null)?.forEach((row) => {
    journal[row.day] = {
      text: row.text ?? "",
      mood: row.mood,
    };
  });

  return {
    habits: ((habitsResult.data as HabitRow[] | null) ?? []).map((row) => ({
      id: String(row.id),
      name: row.name,
      weekdays: parseHabitWeekdays(row.weekdays),
      created: row.created_day,
      pauses: (row.habit_pauses ?? []).map((pause) => ({
        id: String(pause.id),
        from: pause.from_day,
        until: pause.until_day,
      })),
    })),
    checks,
    journal,
  };
}

export async function addHabit(input: HabitInput) {
  const userId = await getHabitUserId();
  const { data, error } = await supabase
    .from("habits")
    .insert([{
      user_id: userId,
      name: input.name,
      weekdays: input.weekdays,
      created_day: input.created,
    }])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function renameHabit(id: string, name: string) {
  const userId = await getHabitUserId();
  const { error } = await supabase
    .from("habits")
    .update({ name })
    .eq("id", toRemoteId(id))
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteHabit(id: string) {
  const userId = await getHabitUserId();
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", toRemoteId(id))
    .eq("user_id", userId);

  if (error) throw error;
}

export async function setHabitCheck(habitId: string, day: string, status: HabitCheckStatus | null) {
  const userId = await getHabitUserId();
  const remoteHabitId = toRemoteId(habitId);

  if (!status) {
    const { error } = await supabase
      .from("habit_checks")
      .delete()
      .eq("habit_id", remoteHabitId)
      .eq("user_id", userId)
      .eq("day", day);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("habit_checks")
    .upsert([{
      user_id: userId,
      habit_id: remoteHabitId,
      day,
      status,
    }], { onConflict: "user_id,habit_id,day" });

  if (error) throw error;
}

export async function toggleHabitPause(habitId: string, today: string) {
  const userId = await getHabitUserId();
  const remoteHabitId = toRemoteId(habitId);
  const { data: openPause, error: readError } = await supabase
    .from("habit_pauses")
    .select("id, from_day")
    .eq("habit_id", remoteHabitId)
    .eq("user_id", userId)
    .is("until_day", null)
    .maybeSingle();

  if (readError) throw readError;

  if (openPause) {
    if (openPause.from_day === today) {
      const { error } = await supabase
        .from("habit_pauses")
        .delete()
        .eq("id", openPause.id)
        .eq("user_id", userId);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("habit_pauses")
      .update({ until_day: today })
      .eq("id", openPause.id)
      .eq("user_id", userId);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("habit_pauses")
    .insert([{
      user_id: userId,
      habit_id: remoteHabitId,
      from_day: today,
      until_day: null,
    }]);

  if (error) throw error;
}

export async function saveJournalEntry(day: string, text: string, mood: number | null) {
  const userId = await getHabitUserId();
  const trimmedText = text.trim();

  if (!trimmedText && mood === null) {
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("user_id", userId)
      .eq("day", day);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("journal_entries")
    .upsert([{
      user_id: userId,
      day,
      text: trimmedText,
      mood,
    }], { onConflict: "user_id,day" });

  if (error) throw error;
}

export async function addFeedback(input: FeedbackInput) {
  const { data, error } = await supabase
    .from("feedback")
    .insert([input])
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getFeedbackTickets() {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function updateFeedbackStatus(id: number, status: string) {
  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function getAdminStats() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Du behöver vara inloggad som admin.");

  const response = await fetch("/api/admin/stats", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Kunde inte hämta adminstatistik.");
  }

  return payload as AdminStats;
}
