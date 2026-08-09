import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const fallbackAdminEmails = ["oskarek575@gmail.com"];
const appTables = [
  "profile",
  "kop",
  "budgets",
  "categories",
  "subscriptions",
  "goals",
  "savings_accounts",
  "loans",
  "investments",
  "travel_budgets",
  "travel_purchases",
  "feedback",
] as const;

function getAdminEmails() {
  const configuredEmails = process.env.NEXT_PUBLIC_BETA_ADMIN_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return configuredEmails?.length ? configuredEmails : fallbackAdminEmails;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return date.toISOString();
}

async function getSafeCount(
  client: SupabaseClient,
  table: string,
  options: { column?: string; gte?: string; eq?: [string, string] } = {}
) {
  let query = client
    .from(table)
    .select("*", { count: "exact", head: true });

  if (options.column && options.gte) {
    query = query.gte(options.column, options.gte);
  }

  if (options.eq) {
    query = query.eq(options.eq[0], options.eq[1]);
  }

  const { count, error } = await query;

  if (error) {
    console.warn(`Admin stats skipped ${table}:`, error.message);
    return null;
  }

  return count ?? 0;
}

async function getSafeRows(
  client: SupabaseClient,
  table: string,
  columns: string,
  options: { column?: string; gte?: string } = {}
) {
  let query = client
    .from(table)
    .select(columns)
    .limit(5000);

  if (options.column && options.gte) {
    query = query.gte(options.column, options.gte);
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`Admin rows skipped ${table}:`, error.message);
    return [];
  }

  return data ?? [];
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase Ã¤r inte konfigurerat." }, { status: 503 });
  }

  if (!token) {
    return NextResponse.json({ error: "Du behÃ¶ver vara inloggad som admin." }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const email = authData.user?.email?.toLowerCase();

  if (authError || !email || !getAdminEmails().includes(email)) {
    return NextResponse.json({ error: "Du har inte adminbehÃ¶righet." }, { status: 403 });
  }

  if (!serviceRoleKey) {
    return NextResponse.json({
      configured: false,
      message: "LÃ¤gg till SUPABASE_SERVICE_ROLE_KEY i Vercel fÃ¶r att visa auth-statistik.",
      generatedAt: new Date().toISOString(),
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const users = [];
  let page = 1;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) throw error;

    users.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }

  const now = Date.now();
  const thirtyDaysAgo = daysAgo(30);
  const active7Users = users.filter((user) => user.last_sign_in_at && new Date(user.last_sign_in_at).getTime() >= now - 7 * 24 * 60 * 60 * 1000);
  const active30Users = users.filter((user) => user.last_sign_in_at && new Date(user.last_sign_in_at).getTime() >= now - 30 * 24 * 60 * 60 * 1000);
  const new30Users = users.filter((user) => user.created_at && new Date(user.created_at).getTime() >= now - 30 * 24 * 60 * 60 * 1000);

  const [openTickets, totalTickets, rowsByTable] = await Promise.all([
    getSafeCount(adminClient, "feedback", { eq: ["status", "new"] }),
    getSafeCount(adminClient, "feedback"),
    Promise.all(appTables.map(async (table) => ({
      table,
      rows: await getSafeCount(adminClient, table),
      last30: await getSafeCount(adminClient, table, { column: "created_at", gte: thirtyDaysAgo }),
    }))),
  ]);

  const activityRows = await Promise.all(
    appTables
      .filter((table) => table !== "profile")
      .map((table) => getSafeRows(adminClient, table, "user_id, created_at", { column: "created_at", gte: thirtyDaysAgo }))
  );
  const activeAppUserIds = new Set(
    activityRows
      .flat()
      .map((row) => (row as { user_id?: string | null }).user_id)
      .filter(Boolean)
  );

  return NextResponse.json({
    configured: true,
    generatedAt: new Date().toISOString(),
    users: {
      total: users.length,
      active7: active7Users.length,
      active30: active30Users.length,
      new30: new30Users.length,
      confirmed: users.filter((user) => user.email_confirmed_at).length,
    },
    app: {
      activeWriters30: activeAppUserIds.size,
      rowsByTable,
    },
    support: {
      open: openTickets ?? 0,
      total: totalTickets ?? 0,
    },
    recentUsers: users
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 8)
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
      })),
  });
}
