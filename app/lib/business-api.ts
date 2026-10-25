import { supabase } from "./supabase";
import type {
  BusinessProfile,
  BusinessProfileInput,
  BusinessRecurringCost,
  BusinessScenario,
  BusinessScenarioAssumptions,
  BusinessServiceTemplate,
  BusinessTransaction,
  BusinessTransactionInput,
  BusinessWorkspace,
} from "./business/types";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Du behöver logga in igen.");
  return data.user.id;
}

async function loadTable<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function getBusinessWorkspace(): Promise<BusinessWorkspace> {
  await requireUserId();
  const [profiles, transactions, serviceTemplates, recurringCosts, scenarios] = await Promise.all([
    loadTable<BusinessProfile>("business_profiles"),
    loadTable<BusinessTransaction>("business_transactions"),
    loadTable<BusinessServiceTemplate>("business_service_templates"),
    loadTable<BusinessRecurringCost>("business_recurring_costs"),
    loadTable<BusinessScenario>("business_scenarios"),
  ]);
  return { profiles, transactions, serviceTemplates, recurringCosts, scenarios };
}

export async function createBusinessProfile(input: BusinessProfileInput): Promise<BusinessProfile> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("business_profiles")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as BusinessProfile;
}

export async function updateBusinessProfile(id: string, input: Partial<BusinessProfileInput>): Promise<BusinessProfile> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("business_profiles")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as BusinessProfile;
}

export async function saveBusinessTransaction(
  input: BusinessTransactionInput,
  id?: string,
): Promise<BusinessTransaction> {
  const userId = await requireUserId();
  const query = id
    ? supabase.from("business_transactions").update(input).eq("id", id).eq("user_id", userId)
    : supabase.from("business_transactions").insert({ ...input, user_id: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as BusinessTransaction;
}

export async function deleteBusinessTransaction(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("business_transactions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function saveBusinessServiceTemplate(
  input: Omit<BusinessServiceTemplate, "id" | "user_id" | "created_at" | "updated_at">,
  id?: string,
): Promise<BusinessServiceTemplate> {
  const userId = await requireUserId();
  const query = id
    ? supabase.from("business_service_templates").update(input).eq("id", id).eq("user_id", userId)
    : supabase.from("business_service_templates").insert({ ...input, user_id: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as BusinessServiceTemplate;
}

export async function deleteBusinessServiceTemplate(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("business_service_templates").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function saveBusinessRecurringCost(
  input: Omit<BusinessRecurringCost, "id" | "user_id" | "created_at" | "updated_at">,
  id?: string,
): Promise<BusinessRecurringCost> {
  const userId = await requireUserId();
  const query = id
    ? supabase.from("business_recurring_costs").update(input).eq("id", id).eq("user_id", userId)
    : supabase.from("business_recurring_costs").insert({ ...input, user_id: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as BusinessRecurringCost;
}

export async function deleteBusinessRecurringCost(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("business_recurring_costs").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function saveBusinessScenario(input: {
  profile_id: string;
  name: string;
  assumptions: BusinessScenarioAssumptions;
}, id?: string): Promise<BusinessScenario> {
  const userId = await requireUserId();
  const query = id
    ? supabase.from("business_scenarios").update(input).eq("id", id).eq("user_id", userId)
    : supabase.from("business_scenarios").insert({ ...input, user_id: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as BusinessScenario;
}

export async function deleteBusinessScenario(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("business_scenarios").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

