import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
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
  "travel_budgets",
  "travel_purchases",
  "feedback",
] as const;

type ProfileActivityRow = {
  user_id?: string | null;
  full_name?: string | null;
  last_seen_at?: string | null;
};

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

function getTime(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
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
    return NextResponse.json({ error: "Supabase är inte konfigurerat." }, { status: 503 });
  }

  if (!token) {
    return NextResponse.json({ error: "Du behöver vara inloggad som admin." }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const email = authData.user?.email?.toLowerCase();

  if (authError || !email || !getAdminEmails().includes(email)) {
    return NextResponse.json({ error: "Du har inte adminbehörighet." }, { status: 403 });
  }

  if (!serviceRoleKey) {
    return NextResponse.json({
      configured: false,
      message: "Lägg till SUPABASE_SERVICE_ROLE_KEY i Vercel för att visa auth-statistik.",
      generatedAt: new Date().toISOString(),
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const users: User[] = [];
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
  const profileRows = await getSafeRows(adminClient, "profile", "user_id, full_name, last_seen_at") as ProfileActivityRow[];
  const profileByUserId = new Map(
    profileRows
      .filter((profile) => profile.user_id)
      .map((profile) => [profile.user_id as string, profile])
  );
  const getUserLastSeenAt = (user: typeof users[number]) =>
    profileByUserId.get(user.id)?.last_seen_at ?? user.last_sign_in_at ?? null;

  const active7Users = users.filter((user) => getTime(getUserLastSeenAt(user)) >= now - 7 * 24 * 60 * 60 * 1000);
  const active30Users = users.filter((user) => getTime(getUserLastSeenAt(user)) >= now - 30 * 24 * 60 * 60 * 1000);
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
      .sort((a, b) => {
        const activityDiff = getTime(getUserLastSeenAt(b)) - getTime(getUserLastSeenAt(a));
        if (activityDiff !== 0) return activityDiff;

        return getTime(b.created_at) - getTime(a.created_at);
      })
      .slice(0, 8)
      .map((user) => {
        const profile = profileByUserId.get(user.id);

        return {
          id: user.id,
          email: user.email,
          name: profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          createdAt: user.created_at,
          lastSeenAt: profile?.last_seen_at ?? null,
          lastSignInAt: user.last_sign_in_at,
        };
      }),
  });
}
