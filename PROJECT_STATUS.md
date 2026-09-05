# PROJECT_STATUS.md

Senast uppdaterad: 2026-08-31

## Senaste ändring: faktisk appaktivitet i adminpanelen

Adminpanelen använder nu appens egen aktivitetsmarkör `profile.last_seen_at` för att visa aktiva användare och senaste aktivitet. Klienten uppdaterar värdet sparsamt när en inloggad användare har synkat med Supabase, högst ungefär var tionde minut per enhet. Admin-API:t faller tillbaka till Supabase Auth `last_sign_in_at` om `last_seen_at` saknas.

Databasändringen finns i `supabase/migrations/202608310001_add_profile_last_seen.sql` och är även inlagd i `supabase/release-setup.sql`.

## Senaste ändring: fler layoutfärger

Inställningarna för personlig layoutfärg har utökats med fler grundfärger: röd, orange, gul, lime, grön, turkos, cyan, mörkblå, indigo, lila, rosa och grå. Färgvalet använder fortfarande samma enkla temasystem med CSS-variabler och sparas per användare i webbläsaren.

## Senaste ändring: tydligare kärnflöde på översikten

Översikten har fått en diskret "Dagens koll"-ruta som översätter fria pengar, fritt per dag, återstående dagar, fasta utgifter och eventuella tajta budgetar till en kort mänsklig status. "Varför har jag fria pengar?"-förklaringen är kvar och bygger på befintliga beräkningar. Transaktionsformuläret visar nu en tydligare varning när ett köp går över budget eller riskerar att gå över fria pengar. Snabbköpen använder tidigare köp som förslag när det finns historik, annars visas enkla standardval.

## Senaste ändring: Fria köp först i köpflödet

Köpflödets kategoriväljare prioriterar nu alltid "Fria köp" först för vanliga utgifter. "Dagens koll" fokuserar också på fria köp/fria pengar istället för att lyfta en enskild budgetkategori.

Det här dokumentet beskriver nuläget i repositoryt `oskars-ekonomi-app`. Det är skrivet som en teknisk handoff till en tech lead, produktarkitekt eller annan utvecklare som ska förstå projektet utan att behöva läsa hela historiken i chatten.

Den här genomgången är baserad på faktisk kod i repositoryt. Ingen produktkod ändrades när dokumentet skapades.

## 1. Projektöversikt

### Vad appen gör idag

Appen är en personlig ekonomiapp med fokus på:

- fria pengar: hur mycket användaren faktiskt kan spendera efter reserverade pengar;
- enkel kassabok: inkomster, budgetköp och fria köp;
- budgetar per kategori;
- fasta utgifter, inklusive återkommande betalningar månadsvis, kvartalsvis, halvårsvis, årsvis eller eget intervall;
- sparmål och sparkonton;
- resebudget;
- lån med automatisk koppling till fasta utgifter;
- rapporter, saldoanalys och utgifter per kategori;
- enklare AI-insights och "har jag råd?"-analys;
- support/feedback;
- adminpanel för ägaren;
- PWA-installation på iOS/Android.

Appen är i praktiken en beta/PWA-produkt. Den kan köras lokalt med `npm run dev` och är byggd för att deployas via Vercel med Supabase som backend.

### Teknikstack

- Next.js `16.2.9`
- React `19.2.4`
- TypeScript `^5`
- Supabase JS `^2.108.2`
- Recharts `^3.9.0`
- lucide-react `^1.21.0`
- Tailwind CSS `^4`
- ESLint `^9` med `eslint-config-next`
- Node test runner för ekonomiberäkningar
- PWA via Next metadata + `app/manifest.ts`

Viktiga scripts i `package.json`:

- `npm run dev` startar utvecklingsservern.
- `npm run build` bygger produktion.
- `npm run start` startar byggd produktion.
- `npm run lint` kör ESLint.
- `npm run test` kör testerna för `finance-calculator`.

### Övergripande arkitektur

Appen är byggd som en Next.js App Router-app.

Nuvarande huvudflöde:

1. `app/page.tsx` håller aktiv sektion och hash-navigation.
2. `app/components/Sidebar.tsx` visar desktop-sidebar och mobil bottom-nav.
3. `app/components/dashboard/Dashboard.tsx` är huvudcontainern för den inloggade ekonomiappen.
4. `app/lib/api.ts` är Supabase-API-lagret.
5. `app/lib/finance-calculator.ts` är den renaste affärslogiken för fria pengar, saldo, budgetar, fasta utgifter och periodlogik.
6. `app/api/admin/stats/route.ts` är server-side API-route för adminstatistik via Supabase service role key.
7. `supabase/release-setup.sql` är den samlade SQL-filen för databasschema, RLS och index.

Viktigt: `Dashboard.tsx` är fortfarande väldigt stor och äger mycket state, formulärlogik och rendering. En del refaktorering har påbörjats, exempelvis `LoansSection`, men stora delar bör brytas ut stegvis.

## 2. Alla funktioner som finns

### Autentisering

Finns i:

- `app/components/dashboard/Dashboard.tsx`
- `app/lib/api.ts`
- Supabase Auth

Funktioner:

- logga in med e-post och lösenord;
- skapa konto med namn, e-post och lösenord;
- spara namn i Supabase user metadata och `profile.full_name`;
- logga ut;
- hämta aktiv användare via `getCurrentUser`;
- lyssna på auth-förändringar via `onAuthChange`.

Data:

- Supabase Auth user;
- `profile`-tabellen;
- auth metadata: `full_name` och `name`.

### Per-user dataseparering

Finns i:

- `supabase/release-setup.sql`
- `supabase/security-fix-rls.sql`
- `supabase/migrations/*`
- `app/lib/api.ts`

Funktion:

- nästan alla appdata-tabeller har `user_id`;
- RLS är tänkt att vara aktivt;
- policies begränsar select/insert/update/delete till `auth.uid() = user_id`;
- `user_id` defaultar till `auth.uid()`.

Data:

- `budgets`
- `kop`
- `categories`
- `subscriptions`
- `goals`
- `savings_accounts`
- `profile`
- `travel_budgets`
- `travel_purchases`
- `loans`
- `feedback`

### Lokal cache/offlineläge

Finns i:

- `Dashboard.tsx`

Funktion:

- appdata sparas även i `localStorage`;
- nycklar är användarspecifika när användaren är inloggad;
- om Supabase inte svarar kan appen fortsätta med lokal cache;
- `SyncStatusPanel` visar om appen synkar, är offline eller kör lokal cache.

Data:

- `oskars-ekonomi-v2-{user.id}`
- `oskars-ekonomi-theme-{user.id}`
- `oskars-ekonomi-onboarding-{user.id}`

### Löner och ekonomiperiod

Finns i:

- `Dashboard.tsx`
- `finance-calculator.ts`

Funktion:

- appen räknar ekonomi utifrån löneperiod, inte vanlig kalendermånad;
- standard är löneperiod från den 25:e föregående månad till den 25:e vald månad;
- datumvalet i dashboarden styr perioden;
- nya transaktioner får defaultdatum inom rätt period.

Data:

- `kop.created_at`
- valt månadsvärde i UI
- konstant `salaryDay = 25`

### Fria pengar

Finns i:

- Dashboardens översikt
- `Fria köp`-sektionen
- `finance-calculator.ts`

Funktion:

Fria pengar är den centrala produkten. Den beräknas som:

- inkomst
- minus reserverade budgetar
- minus schemalagda fasta utgifter
- minus fria köp
- minus resebudgetar som påverkar fria pengar
- minus budgetöverskridanden

Budgetköp som håller sig inom budget ska inte dra ner fria pengar. Om en budget överskrids dras bara överskridandet från fria pengar.

Data:

- `kop`
- `budgets`
- `subscriptions`
- `travel_budgets`
- `travel_purchases`
- valt löneperiodintervall

### Ny transaktion / köp / inkomst

Finns i:

- översiktens `Ny transaktion`-ruta;
- `Transaktioner`;
- `Fria köp`;
- `Dashboard.tsx`;
- `api.ts`.

Funktion:

- användaren kan skapa inkomst eller utgift;
- utgifter kan klassas som `budget` eller `free`;
- om vald kategori har budget, ska köpet som huvudregel behandlas som budgetköp;
- om kategorin saknar budget eller source är `free`, påverkar köpet fria pengar;
- transaktioner kan redigeras och tas bort;
- duplicate submit-skydd finns via `isDuplicateSubmit`;
- belopp parsas med stöd för svenska decimaler via `parseMoney`.

Data:

- `kop.id`
- `kop.beskrivning`
- `kop.belopp`
- `kop.kategori`
- `kop.created_at`
- `kop.source`
- `kop.subscription_id`

### Transaktionslistor

Finns i:

- `Transaktioner`
- `Fria köp`
- översiktens senaste transaktioner
- äldre route: `app/purchases/page.tsx`

Funktion:

- visar transaktioner i aktuell löneperiod;
- kan söka/filtera;
- visar små ikoner baserat på butik/merchant eller kategori;
- redigera och radera finns i dashboardflödet;
- klick från vissa kort navigerar till filtrerade listor.

Data:

- `kop`
- kategoriuppsättning
- budgetuppsättning för att skilja fria köp från budgetköp.

### Budgetar

Finns i:

- `Budget`
- översiktens budgetwidget
- `finance-calculator.ts`
- äldre route: `app/budgets/page.tsx`

Funktion:

- skapa budget per kategori;
- redigera budget;
- radera budget;
- förhindra dubbla budgetar för samma kategori i dashboardflödet;
- visa använt, kvar, procent och eventuell övertrassering;
- om köpet ligger inom budget påverkas inte fria pengar.

Data:

- `budgets.category`
- `budgets.monthly_budget`
- `kop.kategori`
- `kop.source`

### Kategorier

Finns i:

- `Kategorier`
- transaktionsformulär
- budgetformulär
- rapporter

Funktion:

- skapa kategori;
- radera kategori;
- vissa kategorier är låsta i UI: `Lön`, `Fria köp`, `Prenumerationer`;
- kategorier används för transaktioner, budgetar, rapportdiagram och ikonvisning;
- sparkonton läggs också in i kategori-listan i appens state så att spartransaktioner kan kopplas mot sparkonto.

Data:

- `categories.name`
- `categories.color`
- `categories.icon`
- lokala defaultkategorier i `Dashboard.tsx`

### Fasta utgifter / abonnemang

Finns i:

- `Fasta utgifter`
- översiktens kommande abonnemang/fasta utgifter
- saldoanalys
- `finance-calculator.ts`

Funktion:

- skapa fast utgift;
- redigera fast utgift;
- aktivera/inaktivera;
- radera;
- välja dragdatum;
- välja frekvens:
  - varje månad;
  - varje kvartal;
  - varje halvår;
  - varje år;
  - eget intervall;
- skapa månadens fasta utgifter som transaktioner;
- matcha om en fast utgift redan är dragen via `subscription_id`, namn, belopp och datumtolerans.

Data:

- `subscriptions.name`
- `subscriptions.amount`
- `subscriptions.category`
- `subscriptions.day_of_month`
- `subscriptions.active`
- `subscriptions.frequency`
- `subscriptions.interval_months`
- `subscriptions.start_date`
- `kop.subscription_id`

### Lån

Finns i:

- `Lån`
- `app/components/dashboard/sections/LoansSection.tsx`
- `Dashboard.tsx`
- `api.ts`
- `supabase/migrations/202608090001_add_loans.sql`

Funktion:

- skapa lån med namn, kvarvarande skuld, månadsbetalning, ränta och dragdag;
- redigera lån;
- radera lån;
- visa total skuld;
- visa månadsbelastning som procent av inkomst;
- uppskatta ränta/månad, amortering/månad och tid kvar;
- visa närmast färdigt lån;
- när lån skapas eller ändras skapas/uppdateras motsvarande fast utgift med plan/kategori `Lån`, så användaren slipper dubbelregistrera månadsbetalningen.

Data:

- `loans`
- `subscriptions` för automatisk fast utgift
- aktuell inkomst från finance summary

Känd detalj:

- `LoansSection.tsx` innehåller fortfarande minst två mojibake-strängar i knapptext: `Spara l?n` och `L?gg till`.

### Mål och sparande

Finns i:

- `Mål`
- översiktens mål-/sparwidget
- `GoalPanel` i `Dashboard.tsx`
- `api.ts`

Funktion:

- skapa flera mål;
- redigera mål;
- radera mål;
- skapa sparkonto;
- redigera sparkonto;
- radera sparkonto;
- lägga till sparande som transaktion genom att välja sparkontots kategori;
- när en spartransaktion skapas, ändras sparkontots belopp via savings adjustment-logik;
- mål kan i UI kopplas mot sparkonto genom titel/namn-matchning eller lokal `linkedSavingsId`;
- totalsparande och målprogress beräknas med målsparande + fristående sparkonton.

Data:

- `goals.title`
- `goals.saved`
- `goals.target`
- `savings_accounts.name`
- `savings_accounts.amount`
- `kop` för spartransaktioner

Känd datamodellsak:

- `release-setup.sql` lägger till `goals.linked_savings_id`, men appens `addGoal`/`updateGoal` i `api.ts` skriver inte den kolumnen. Kopplingen verkar därför huvudsakligen leva i UI-state/localStorage eller genom namnmatchning. Det bör rensas upp om mål och sparkonton ska vara 100 procent robusta.

### Resebudget

Finns i:

- `Resebudget`
- översikt/finance summary om resa påverkar fria pengar
- `api.ts`
- `finance-calculator.ts`

Funktion:

- skapa resa med namn, total budget, startdatum och slutdatum;
- välja om resan är redan avsatt/separat från fria pengar;
- redigera och radera resa;
- lägga in köp på vald resa;
- radera reseköp;
- visa spenderat, kvar, per dag och kategorier;
- om resan inte är separat, påverkar den fria pengar.

Data:

- `travel_budgets`
- `travel_purchases`

### AI Insights

Finns i:

- `AI Insights`
- översiktens insight-widget
- `getAffordabilityResult` i `Dashboard.tsx`

Funktion:

- visar enkla regelbaserade insights, inte extern AI-modell;
- visar månadsstatus, sparpotential och måluppdatering;
- funktionen "Har jag råd?" tar namn och belopp och jämför mot fria pengar och dagar kvar;
- svaret blir `Ja`, `Ja, men tajt` eller `Nej` med kort motivering.

Data:

- `freeMoney`
- `remainingDays`
- budgetar
- fasta utgifter
- målprogress

### Rapporter

Finns i:

- `Rapporter`
- `Dashboard.tsx`

Funktion:

- visar summering för vald löneperiod:
  - inkomster;
  - reserverat;
  - fria pengar;
  - faktiskt saldo;
- `Saldoanalys` är kollapsad som standard och kan öppnas med knapp;
- saldoanalysen visar budget kvar, fria pengar, budget över gräns, planerat kvar, skillnad mot saldo och detaljerad breakdown;
- visar cirkeldiagram/donut över utgifter per kategori;
- kategori i rapporten kan klickas för att filtrera transaktioner.

Data:

- `financeSummary`
- `expensesByCategory`
- `balanceBreakdownRows`
- `missingPostedSubscriptions`

### Inställningar

Finns i:

- `Inställningar`
- `Dashboard.tsx`
- äldre route: `app/settings/page.tsx`

Funktion:

- byta layoutfärg;
- visa PWA-installationspanel;
- exportera/importera användardata;
- radera all egen data;
- redigera profilnamn;
- redigera ingående banksaldo;
- skicka support/feedback;
- se supportärenden;
- logga ut;
- se synkstatus och appstatus;
- adminpanelen visas bara för admin enligt appkod.

Data:

- `profile`
- `feedback`
- localStorage
- Supabase Auth

### Support/feedback

Finns i:

- Inställningar
- `FeedbackPanel`
- `SupportAdminPanel`
- `api.ts`
- `feedback`-tabellen

Funktion:

- användare kan skicka bug/idé/fråga/övrigt;
- supportärenden sparas i Supabase;
- användare ser sina egna ärenden;
- admin kan se och uppdatera status på ärenden;
- appen kan också skapa automatisk fellogg via `reportAppError` när browserfel eller ohanterade promise-rejections inträffar.

Data:

- `feedback.type`
- `feedback.message`
- `feedback.page`
- `feedback.app_version`
- `feedback.status`
- `feedback.created_at`

### Adminpanel

Finns i:

- Inställningar
- `Dashboard.tsx`
- `app/api/admin/stats/route.ts`

Funktion:

- visas bara om `isAdminUser(user)` är true;
- fallback-admin i appkod är `oskarek575@gmail.com`;
- adminmail kan konfigureras via `NEXT_PUBLIC_BETA_ADMIN_EMAILS`;
- hämtar adminstatistik via serverroute `/api/admin/stats`;
- route kräver bearer token och kontrollerar att användarens email är admin;
- om `SUPABASE_SERVICE_ROLE_KEY` finns på servern kan den hämta Supabase Auth-statistik:
  - totalt antal användare;
  - aktiva senaste 7/30 dagar;
  - nya senaste 30 dagar;
  - bekräftade konton;
  - app-rader per tabell;
  - supportärenden;
  - senaste användare.

Data:

- Supabase Auth admin API;
- `feedback`;
- alla appens publika tabeller för count-statistik.

Viktig säkerhetsnotering:

- `release-setup.sql` har admin-policy för `feedback` med enbart `oskarek575@gmail.com`.
- `Dashboard.tsx` fallbackar också till `oskarek575@gmail.com`.
- Men `supabase/migrations/202607230002_upgrade_feedback_to_support.sql` innehåller äldre policy som även inkluderar `oskarcool1337@gmail.com`. Om den migrationen körs efter den nya release-setupen kan den ge extra feedback-adminrättigheter på databassidan. Det bör konsolideras innan riktig lansering.

### PWA / mobilapp

Finns i:

- `app/manifest.ts`
- `app/layout.tsx`
- `public/pwa-icon*.png`
- `Dashboard.tsx`
- `globals.css`

Funktion:

- appen kan installeras som PWA på hemskärmen;
- iOS/Android-guide visas i inställningar;
- appen har manifest, ikoner och Apple Web App metadata;
- mobil layout har bottom navigation och specialanpassade kort.

Data:

- ingen särskild databastabell.

## 3. Mapp- och komponentstruktur

### Rotnivå

- `package.json`: scripts och dependencies.
- `README.md`: användar-/deployinstruktioner.
- `PROJECT_STATUS.md`: detta nulägesdokument.
- `next.config.ts`: tom Next-config.
- `tsconfig.json`: strict TypeScript, `allowJs`, noEmit.
- `eslint.config.mjs`: ESLint-konfiguration.
- `AGENTS.md`: instruktion om att läsa Next-dokumentation vid kodändringar.

### `app/`

- `app/page.tsx`: huvudsidan. Håller aktiv sektion, synkar navigation med hash och renderar `Sidebar` + `Dashboard`.
- `app/layout.tsx`: root layout, metadata, PWA/iOS-inställningar och fonts.
- `app/manifest.ts`: PWA manifest.
- `app/globals.css`: nästan all visuell styling för appen.
- `app/favicon.ico`: favicon.

### `app/components/`

- `Sidebar.tsx`: desktop-sidebar och mobil bottom-nav. Definierar `AppSection`.
- `dashboard/Dashboard.tsx`: huvudcontainern. Äger majoriteten av state, datahämtning, formulär, beräkningar, CRUD-handlers och rendering av sektioner.
- `dashboard/sections/LoansSection.tsx`: utbruten lånesektion.
- `dashboard/README.md`: kort dokumentation för dashboard-strukturen.
- `dashboard/actions`, `dashboard/cards`, `dashboard/lists`, `dashboard/overview`, `dashboard/sections`: påbörjad komponentuppdelning. Alla filer är inte fullt integrerade, men strukturen är tänkt att användas för att bryta ut mer från `Dashboard.tsx`.
- `budgets/*`, `categories/*`, `purchases/*`, `subscriptions/*`: äldre/fristående komponenter för äldre route-sidor.

### `app/lib/`

- `supabase.ts`: skapar Supabase browser client med public env vars.
- `api.ts`: alla Supabase CRUD-funktioner, authfunktioner och adminstats-anrop.
- `finance-calculator.ts`: ren affärslogik för ekonomi, perioder, fria pengar, budgetar, fasta utgifter och saldoanalys.

### `app/types/`

- `database.ts`: äldre TypeScript-interface för tabeller. Täcker Budget, Purchase, Category, Subscription, Goal och SavingsAccount. Den är inte fullständigt uppdaterad för travel, loans, feedback och nyare subscription-fält.

### `app/Hooks/`

- `useDashboard.ts`: äldre hook för tidigare dashboardflöde. Den verkar inte vara huvudvägen längre och bör betraktas som legacy/teknisk skuld.

### Äldre route-sidor

Följande finns kvar som egna App Router-sidor:

- `app/budgets/page.tsx`
- `app/categories/page.tsx`
- `app/purchases/page.tsx`
- `app/settings/page.tsx`
- `app/subscriptions/page.tsx`

De använder äldre komponenter och delar av `api.ts`. Huvudprodukten verkar däremot nu använda hash-baserade sektioner i `Dashboard.tsx`. Detta är en tydlig kandidat för framtida städning: antingen behålla dem som riktiga routes eller ta bort dem om de är ersatta.

### `supabase/`

- `release-setup.sql`: samlad setup-fil som användaren kan köra i Supabase.
- `security-fix-rls.sql`: äldre säkerhetsfix för RLS.
- `migrations/`: historiska SQL-ändringar.

### `scripts/`

- `finance-calculator.test.mjs`: tester för affärslogiken i `finance-calculator.ts`.

### `public/`

- PWA-ikoner.
- `bora-bora-goal.png`.
- standard SVG-assets från Next.

## 4. Databas / Supabase

### Miljövariabler

Klienten använder:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Adminroute använder dessutom:

- `SUPABASE_SERVICE_ROLE_KEY`

Adminbehörighet styrs i appkod av:

- fallback: `oskarek575@gmail.com`
- valfri override/lista: `NEXT_PUBLIC_BETA_ADMIN_EMAILS`

### Tabeller och kolumner

Kolumnerna nedan är identifierade från `release-setup.sql`, migrations och API-koden.

#### `profile`

- `id bigint identity primary key`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `full_name text`
- `monthly_income numeric not null default 0`
- `monthly_savings numeric not null default 0`
- `opening_balance numeric not null default 0`
- `created_at timestamptz not null default now()`

Används av:

- `getProfile`
- `ensureProfileForUser`
- `updateProfile`
- `updateProfileName`
- `updateOpeningBalance`

#### `kop`

Detta är transaktioner/köp.

- `id`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `beskrivning text`
- `belopp numeric`
- `kategori text`
- `created_at timestamptz not null default now()`
- `source text not null default 'budget'`
- `subscription_id bigint references subscriptions(id) on delete set null`

Identifierade constraints:

- `kop_source_check`: `source in ('budget', 'free')`

Används av:

- `getPurchases`
- `getPurchasesByDateRange`
- `addPurchase`
- `updatePurchase`
- `deletePurchase`
- `generateSubscriptionsForCurrentMonth`

#### `budgets`

- `id`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `category text`
- `monthly_budget numeric`

Används av:

- `getBudgets`
- `addBudget`
- `updateBudget`
- `deleteBudget`

#### `categories`

- `id`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `name text`
- `color text`
- `icon text`

Används av:

- `getCategories`
- `addCategory`
- `updateCategory`
- `deleteCategory`
- `deleteCategoryByName`

#### `subscriptions`

- `id`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `name text`
- `amount numeric`
- `category text`
- `day_of_month integer`
- `active boolean`
- `frequency text not null default 'monthly'`
- `interval_months integer not null default 1`
- `start_date date`

Identifierade constraints:

- `subscriptions_frequency_check`: `monthly`, `quarterly`, `semiannual`, `yearly`, `custom`
- `subscriptions_interval_months_check`: minst 1

Används av:

- `getSubscriptions`
- `addSubscription`
- `updateSubscription`
- `deleteSubscription`
- `generateSubscriptionsForCurrentMonth`
- lånkopplingen via `upsertLoanSubscription`

#### `goals`

- `id bigint identity primary key`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `title text not null`
- `saved numeric not null default 0`
- `target numeric not null`
- `linked_savings_id bigint references savings_accounts(id) on delete set null`
- `created_at timestamptz not null default now()`

Används av:

- `getGoals`
- `addGoal`
- `updateGoal`
- `deleteGoal`

Viktig notering:

- `linked_savings_id` finns i SQL, men `api.ts` verkar inte skriva eller läsa den. UI-kopplingen mellan mål och sparkonto sker därför inte fullt ut via databasen.

#### `savings_accounts`

- `id bigint identity primary key`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `name text not null`
- `amount numeric not null default 0`
- `created_at timestamptz not null default now()`

Index:

- unik per användare och namn: `savings_accounts_user_name_key on (user_id, lower(name))`

Används av:

- `getSavingsAccounts`
- `addSavingsAccount`
- `updateSavingsAccount`
- `deleteSavingsAccount`
- spartransaktionslogik i `Dashboard.tsx`

#### `travel_budgets`

- `id bigint identity primary key`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `name text not null`
- `budget numeric not null`
- `start_date date not null`
- `end_date date not null`
- `separate_from_free_money boolean not null default true`
- `created_at timestamptz not null default now()`

Constraints:

- budget större än 0
- slutdatum får inte vara före startdatum

Används av:

- `getTravelBudgets`
- `addTravelBudget`
- `updateTravelBudget`
- `deleteTravelBudget`

#### `travel_purchases`

- `id bigint identity primary key`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `travel_budget_id bigint not null references travel_budgets(id) on delete cascade`
- `title text not null`
- `amount numeric not null`
- `category text not null default 'Övrigt'`
- `purchase_date date not null`
- `created_at timestamptz not null default now()`

Constraints:

- amount större än 0

Används av:

- `addTravelPurchase`
- `deleteTravelPurchase`
- nested select i `getTravelBudgets`

#### `loans`

- `id bigint identity primary key`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `name text not null`
- `remaining_amount numeric not null default 0`
- `monthly_payment numeric not null default 0`
- `interest_rate numeric not null default 0`
- `payment_day integer not null default 25`
- `created_at timestamptz not null default now()`

Constraints:

- remaining_amount >= 0
- monthly_payment > 0
- interest_rate >= 0
- payment_day mellan 1 och 28

Används av:

- `getLoans`
- `addLoan`
- `updateLoan`
- `deleteLoan`

#### `feedback`

- `id bigint identity primary key`
- `user_id uuid references auth.users(id) on delete cascade default auth.uid()`
- `type text not null default 'bug'`
- `message text not null`
- `page text`
- `app_version text`
- `status text not null default 'new'`
- `created_at timestamptz not null default now()`

Constraints:

- type: `bug`, `idea`, `question`, `other`
- status: `new`, `reviewed`, `planned`, `done`, `closed`

Används av:

- `addFeedback`
- `getFeedbackTickets`
- `updateFeedbackStatus`
- `getAdminStats`
- automatisk fellogg i `Dashboard.tsx`

### Relationer

- Alla användardatatabeller kopplas till `auth.users` via `user_id`.
- `kop.subscription_id` kan kopplas till `subscriptions.id`.
- `travel_purchases.travel_budget_id` kopplas till `travel_budgets.id`.
- `goals.linked_savings_id` finns i databasen och refererar till `savings_accounts.id`, men appens API-lager använder den inte fullt ut.
- Lån skapar inte FK mot `subscriptions`, utan kopplingen görs på applikationsnivå genom namn/plan:
  - subscription name = lånets namn
  - subscription category/plan = `Lån`

### RLS och säkerhet

`release-setup.sql` aktiverar RLS för appens centrala tabeller och skapar policies där användare bara får läsa/skriva egna rader.

`travel_purchases` har extra skydd så insert/update även kräver att parent travel budget tillhör samma användare.

Admin-support:

- vanliga användare ser sina egna feedback-rader;
- admin kan se/uppdatera alla feedback-rader enligt email-policy.

Säkerhetsrisk att följa upp:

- Samla admin-email-policy i en enda källa. Just nu finns appkod, release SQL och historisk migration som inte är helt konsekventa.

## 5. Dashboard

### Layout

Dashboarden består av:

- desktop-sidebar till vänster;
- mobil bottom-nav;
- topbar med hälsning, notisikon, avatar och månadsväljare;
- innehåll som byts baserat på `activeSection`;
- `dashboard-shell` som får klass `theme-${layoutTheme}` och `mobile-${activeSection}`.

Navigation sker genom `app/page.tsx`, som sätter `activeSection` och använder URL hash för de flesta sektioner.

### Översikt

Översikten har:

- stor `Fria pengar`-hero högst upp;
- rund progress/ring för fria pengar;
- snabbknapp `Lägg till köp`;
- uträkning: inkomst, reserverat, fria köp, eventuellt budget över, resultat;
- mobilpills med kvar per dag, fria köp idag och periodens datum;
- ny transaktion-formulär;
- statkort för total saldo/faktiskt saldo, inkomster, utgifter och fria pengar;
- mobil snabbvy för senaste köp, kommande fast utgift, aktiv resa och starkaste mål;
- desktop-layout med:
  - utgifter per kategori/donut;
  - AI insights;
  - senaste transaktioner;
  - budgetöversikt;
  - kommande fasta utgifter;
  - mål/spar-widget.

### Kort

Exempel på kort:

- fria pengar;
- total/faktiskt saldo;
- inkomster;
- utgifter;
- budgetöversikt;
- senaste transaktioner;
- kommande fasta utgifter;
- mål/sparande;
- saldoanalys;
- support/admin/beta/pwa i inställningar.

### Diagram

Diagrammen är huvudsakligen CSS-baserade:

- donut/cirkeldiagram byggs med `conic-gradient`;
- fria pengar använder CSS-variabeln `--free-progress`;
- resebudget använder `--travel-progress`;
- mål/sparande använder progressbars.

Recharts är installerat, men den aktuella dashboarden verkar främst använda CSS för diagrammen.

### AI insights

AI insights är regelbaserad logik i frontend:

- månadsstatus baserat på fria pengar;
- sparpotential baserat på fasta utgifter och budgetar;
- måluppdatering baserat på progress;
- "Har jag råd?" jämför ett belopp mot fria pengar och kvarvarande dagar.

Ingen extern LLM/API-anrop görs i nuvarande implementation.

### Budgetinformation

Budgetinformation kommer från `financeSummary.budgetRows`, som räknas i `finance-calculator.ts`. Varje rad innehåller:

- kategori;
- budgetgräns;
- spenderat;
- kvar;
- procent;
- övertrassering.

### Köp

Köp ligger i `kop` och delas upp i:

- budgetköp;
- fria köp;
- inkomster;
- spartransaktioner;
- fasta utgifter som skapats från subscriptions/lån.

### Abonnemang/fasta utgifter

Dashboarden visar schemalagda fasta utgifter för aktuell löneperiod. Den kan också visa vilka som borde vara dragna men inte matchas av transaktion.

### Sparmål

Mål/sparande visar:

- total sparprogress;
- starkaste/närmast mest progressade mål;
- mål-lista;
- sparkonton;
- editor för mål;
- editor för sparkonto.

### Andra widgets

- resebudget;
- lån;
- PWA-installation;
- supportcenter;
- adminöversikt;
- beta-/lanseringschecklistor;
- integritetsinformation;
- changelog;
- import/export/radera data.

## 6. Senaste ändringarna

Git-historiken visar följande större arbeten nyligen:

- `4279789 Add beta safety and polish tools`
- `1d36d96 Harden loading states and form validation`
- `ed3198b Improve PWA install and feedback flow`
- `d58c555 Fix Swedish text encoding`
- `5670ba8 Structure dashboard components`
- `e958551 Remove investment legacy code`
- `f7acadc Sync loans with fixed expenses`
- `b7cf004 Replace investments with loans`
- `4a8497a Collapse balance analysis by default`
- `d3e031e Restrict admin access to owner email`
- `f050fb3 Improve first setup guide`
- `10b4f8e Sync opening balance with profile`
- `d3486e9 Refine finance balance calculations`
- `a72ef22 Subtract budget overspend from free money`
- `41d5c67 Show missing fixed expenses in balance report`
- `0c727dc Add balance analysis report`
- `1010dde Add private admin analytics panel`
- `735196a Link savings total to single goal cards`
- `36a3c00 Fix mobile goal and savings actions`
- `69486cf Fix goal savings account linkage`

Sammanfattat:

- fria pengar-logiken har blivit mer robust;
- budgetöverskridanden påverkar fria pengar;
- faktiskt saldo använder `opening_balance`;
- saldoanalys finns men är kollapsad som standard;
- adminpanelen är begränsad till ägaradmin i appkod;
- PWA, support och beta-polish har förbättrats;
- investeringar togs bort och ersattes med lån;
- lån synkar till fasta utgifter;
- mål/sparkonton har kopplats bättre i UI;
- dashboarden har börjat struktureras upp, men huvudfilen är fortfarande stor.

## 7. Kodkvalitet

### TypeScript-status

`npm run build` körde TypeScript och gick igenom utan fel.

Resultat 2026-08-29:

- `npm run build`: godkänd
- Next.js `16.2.9`
- 11 routes genererades
- `/api/admin/stats` är dynamisk route

### Lint-status

`npm run lint` kördes 2026-08-29 och gick igenom utan ESLint-fel.

### Test-status

`npm run test` kördes 2026-08-29.

Resultat:

- 7 tester
- 7 passerade
- 0 fel

Testerna täcker just nu:

- budgetköp inom budget ska inte minska fria pengar;
- bara budgetöverskridande ska minska fria pengar;
- fria köp ska minska fria pengar direkt;
- sparkontosaldo ska inte räknas som dold periodutgift;
- spartransaktion ska räknas en gång;
- fast utgift ska inte markeras som saknad när den matchas via `subscription_id`;
- opening balance ska påverka faktiskt saldo.

### Kända problem

- `Dashboard.tsx` är fortfarande för stor och blandar datahämtning, affärslogik, formulärlogik och UI.
- Viss affärslogik finns duplicerad mellan `Dashboard.tsx` och `finance-calculator.ts`, exempelvis period- och subscriptionhjälpare.
- Äldre route-sidor och komponenter finns kvar bredvid nya dashboardflödet.
- `app/types/database.ts` är inte komplett uppdaterad med alla nyare tabeller och kolumner.
- `goals.linked_savings_id` finns i SQL men används inte fullt ut i API-lagret.
- `app/page.tsx` sektionlistan verkar sakna `loans`, trots att `Sidebar.tsx` har `loans` i `AppSection`. Det kan påverka direktlänk/hash `#loans` vid sidladdning.
- `LoansSection.tsx` har kvar teckenfel i knapptexter: `Spara l?n` och `L?gg till`.
- `supabase/migrations/202607230002_upgrade_feedback_to_support.sql` har äldre adminpolicy som inkluderar `oskarcool1337@gmail.com`, medan nyare appkod/release-setup pekar på `oskarek575@gmail.com`.

### Teknisk skuld

Prioriterad teknisk skuld:

1. Bryt ut fler dashboard-sektioner från `Dashboard.tsx`.
2. Flytta all duplicerad period-/subscription-/sparlogik till `finance-calculator.ts` eller små domain-filer.
3. Uppdatera `app/types/database.ts` till hela schema.
4. Bestäm om äldre route-sidor ska tas bort eller göras till riktiga primära routes.
5. Konsolidera Supabase migrationer/release SQL så nya miljöer blir konsekventa.
6. Säkerställ att admin-email bara definieras på ett ställe.
7. Koppla `goals.linked_savings_id` fullt ut eller ta bort kolumnen om den inte ska användas.

## 8. UI / Design

### Nuvarande designsystem

Designen är en mörk, iOS-inspirerad dashboard med:

- mörkblå/svart bakgrund;
- kort med rundade hörn;
- tunna borders;
- glass/gradient-känsla;
- tydliga CTA-knappar;
- bottom-nav på mobil;
- progressbars och rings;
- färgteman.

### Färger

Basfärger i `:root`:

- `--bg: #0c131b`
- `--panel: #141e28`
- `--border: #26313d`
- `--muted: #94a1af`
- `--text: #f5f7fa`
- `--green: #39d979`

Kategori- och accentfärger finns i `Dashboard.tsx`:

- Bostad: lila
- Mat & Livsmedel: grön
- Transport: blå
- Drivmedel: turkos
- Nöjen: orange
- Shopping: rosa
- Fria köp: grön
- Prenumerationer: ljusblå
- Lön: grön
- Övrigt: grå

Layoutteman:

- mörkblå;
- grön;
- lila;
- rosa;
- orange.

### Spacing och komponentstil

- Desktop använder sidebar + maxbreddad dashboard-yta.
- Kort använder `panel`, `stat-card`, `table-row`, `wide-button`, `management-form` osv.
- Många formulär är CSS-grid-baserade.
- Mobil har särskilda media queries och bottom-nav.

### Responsivitet

Responsivitet finns i `globals.css`:

- vid cirka 1100px kollapsar sidebar till ikonläge;
- vid cirka 720px döljs sidebar och bottom-nav/mobile layout används;
- flera sektioner har mobilanpassade grids, kort och overflow-fixar.

Det har gjorts specifika mobilfixar för:

- översikt;
- fria pengar högst upp;
- rapporternas cirkeldiagram;
- mål/sparkonton;
- resebudgettext;
- bottom-nav.

### Vad som fortfarande bör förbättras

- Minska visuell komplexitet i dashboardens desktop-del om produkten ska fokusera mer på fria pengar/kassabok/översikt.
- Göra alla sidor lika premium och konsekventa som den nya mål-/sparande-sidan.
- Bryta CSS i mer hanterbara filer eller komponentnära klasser om projektet växer.
- Skapa en liten design token-struktur för färg, spacing och radius.
- Fortsätta testa faktisk iPhone-layout, eftersom mobil UX är produktens viktigaste miljö.

## 9. Saker som inte är klara

### Halvfärdiga eller riskabla funktioner

- Full databaskoppling mellan mål och sparkonto via `linked_savings_id`.
- Adminpolicy är inte helt konsoliderad mellan release SQL och äldre migrationer.
- Lånesidan har kvar mojibake i minst två knapptexter.
- `Dashboard.tsx` är halvrefaktorerad; bara lån är tydligt utbrutet till egen section-komponent.
- Import/export finns, men bör produkttestas mer innan bred beta.
- Automatisk fellogg finns, men det finns ingen extern notifiering/e-post.
- Support är Supabase-baserad, men inte kopplad till riktig supportinkorg.
- PWA-installation finns, men ingen native App Store/Play Store-app.

### Placeholders / legacy

- Pro-version-rutan i sidebar är demo/placeholder.
- Sidebarens profilrad är hårdkodad till `Oskar Ek` / `oskarek@example.com` och bör kopplas till riktig användare eller tas bort.
- Äldre sidor i `app/budgets`, `app/purchases`, `app/settings`, `app/subscriptions`, `app/categories` kan vara legacy.
- `useDashboard.ts` är troligen legacy.
- `generateSubscriptionsForCurrentMonth()` i `api.ts` verkar vara äldre logik som använder kalenderperiod snarare än nya löneperioden.

### Kända buggar eller potentiella buggar

- `#loans` kan vara en direktlänkbugg eftersom `app/page.tsx` inte verkar ha med `loans` i sin tillåtna sections-array.
- Låneknappar visar fel tecken i källfilen.
- `goals.linked_savings_id` finns i databasen men verkar inte rundtrippas via API.
- Om gamla migrations körs i fel ordning kan feedback-adminpolicy bli bredare än avsett.

## 10. Rekommenderade nästa steg

Rangordnade rekommendationer:

1. Fixa adminpolicy-mismatchen i migrationerna så bara rätt ägarmejl kan få adminrättigheter.
2. Fixa kvarvarande encodingfel i `LoansSection.tsx`.
3. Lägg till `loans` i route/hash-sektionslistan i `app/page.tsx` om lånesidan ska kunna direktlänkas.
4. Gör `goals.linked_savings_id` till riktig databasrelation i API-lagret, eller ta bort kolumnen och dokumentera namnmatchning som avsiktlig.
5. Bryt ut `ReportsSection`, `SettingsSection`, `TravelSection`, `GoalsSection` och `TransactionsSection` från `Dashboard.tsx`.
6. Uppdatera `app/types/database.ts` så den speglar hela Supabase-schemat.
7. Ta beslut om legacy routes: behåll som riktiga URLs eller ta bort till förmån för hash-dashboarden.
8. Lägg till fler tester runt saldoanalys, fasta utgifter per kvartal/halvår och lån-till-subscription-synk.
9. Gör ett beta-testprotokoll: iPhone, Android, desktop, ny användare, gammal användare, offline, Supabase-fel.
10. Produktfokusera appen: om strategin är "fria pengar + kassabok + översikt", minska eller göm mer avancerade moduler bakom sekundära vyer så första upplevelsen känns enklare.

## Aktuell verifiering

Kört 2026-08-29:

- `npm run test`: godkänd, 7/7 tester passerade.
- `npm run lint`: godkänd.
- `npm run build`: godkänd.

Git-status innan dokumentet skapades:

- inga kodändringar;
- en redan existerande untracked fil: `Microsoft Teams (PWA).lnk`, ej rörd.

## Product Focus Cleanup Plan

Senast uppdaterad: 2026-08-29

Syfte: göra en säker scope-/cleanup-analys inför en eventuell nedskalning av produkten. Detta är bara analys. Ingen produktkod, design eller databas ändras i detta steg.

Status:

- Cleanup steg 1 genomfört 2026-08-29 och justerat 2026-08-30: primär navigation visar nu Översikt, Transaktioner, Budget, Fasta utgifter, Resebudget, Kategorier, Rapporter och Inställningar. Fria pengar/Fria köp som separat sida, Mål, Lån och AI Insights är gömda från synlig navigation men finns kvar i kod/rendering för eventuell återaktivering.
- Översiktens kärnvärden uppdaterade 2026-08-29: `finance-calculator.ts` beräknar nu ett separat `reservedRemaining`/Reserverat kvar. Värdet är budget kvar plus fasta utgifter i aktuell löneperiod som ännu inte matchas av en bokförd transaktion. Befintlig fria-pengar-formel ändrades inte.
- Tillfällig beta-information tillagd 2026-08-29: Översikten visar en liten, diskret informationsruta under de ekonomiska kärnvärdena. Den är en isolerad presentationskomponent utan databas, state, feature flag eller ny beta-/adminarkitektur.

Ny produktkärna:

1. Fria pengar
2. Kassabok / transaktioner
3. Budgetar
4. Planerade transaktioner / fasta utgifter
5. Resebudget
6. Enkel ekonomiöversikt
7. Endast nödvändiga inställningar för ovanstående

Viktig produktprincip:

Planerade transaktioner ska kunna ligga på ett framtida datum men räknas bort från fria pengar direkt när löneperioden börjar, så att fria pengar visar vad som faktiskt är tillgängligt att använda.

### 1. Inventering av nuvarande funktioner

#### A. Behåll

Funktioner som direkt stödjer den nya kärnan.

| Funktion | Var finns den | Varför behålla |
| --- | --- | --- |
| Fria pengar | `Dashboard.tsx`, `finance-calculator.ts` | Produktens huvudvärde. Räknar fram vad användaren faktiskt kan spendera. |
| Kassabok / transaktioner | `Dashboard.tsx`, `api.ts`, `kop` | Grunden för inkomster, köp, budgetköp, fria köp och saldo. |
| Fria köp | `Dashboard.tsx`, `finance-calculator.ts`, `kop.source` | Direkt kopplat till fria pengar och appens huvudidé. |
| Budgetar | `Dashboard.tsx`, `finance-calculator.ts`, `api.ts`, `budgets` | Reserverar pengar direkt och gör att budgetköp inte dras dubbelt från fria pengar. |
| Kategorier | `Dashboard.tsx`, `api.ts`, `categories` | Behövs för kassabok, budgetar och rapportering. Bör behållas men förenklas. |
| Fasta utgifter / planerade transaktioner | `Dashboard.tsx`, `finance-calculator.ts`, `api.ts`, `subscriptions` | Behövs för att reservera framtida dragningar direkt i löneperioden. |
| Löneperiod från dag 25 | `Dashboard.tsx`, `finance-calculator.ts` | Central för hur användaren tänker kring lön och månad. |
| Resebudget | `Dashboard.tsx`, `api.ts`, `finance-calculator.ts`, `travel_budgets`, `travel_purchases` | Ingår uttryckligen i nya kärnan. |
| Enkel översikt | `Dashboard.tsx`, `Sidebar.tsx` | Behövs som startvy, men bör fokuseras. |
| Nödvändiga inställningar | `Dashboard.tsx`, `api.ts`, `profile` | Namn, tema, PWA, export/import, saldoavstämning och konto behövs. |
| Auth / användarseparering | `api.ts`, Supabase Auth, RLS SQL | Måste behållas för all riktig användning. |
| Supabase-synk och localStorage fallback | `Dashboard.tsx`, `api.ts` | Viktigt för beta och robusthet. |
| PWA-installation | `layout.tsx`, `manifest.ts`, `Dashboard.tsx`, `public/*icon*` | Behövs för mobiltest utan App Store ännu. |

#### B. Göm tills vidare

Funktioner som fungerar eller delvis fungerar men inte hör till den nya kärnan. Rekommendation: dölj från navigation/UI först, radera inte direkt.

| Funktion | Filer | Beroenden/referenser | Risk för kärnan | Delar data/state med kärnan |
| --- | --- | --- | --- | --- |
| Mål | `Dashboard.tsx`, `api.ts`, `supabase/release-setup.sql`, `supabase/migrations/202607030002_add_goals_and_savings.sql` | `activeSection === "goals"`, `GoalPanel`, `getGoals`, `addGoal`, `updateGoal`, `deleteGoal`, `goals` i `FinanceData` | Medel. Mål/sparande är inkopplat i översikten och `financeSummary` tar emot `savings`. | Ja. Delar `data.goals`, `data.savings`, kategorier och transaktioner via sparlogik. |
| Sparkonton | `Dashboard.tsx`, `api.ts`, `finance-calculator.ts`, SQL för `savings_accounts` | `getSavingsAccounts`, `addSavingsAccount`, `updateSavingsAccount`, `deleteSavingsAccount`, `getSavingsAdjustments` | Medel/hög om man tar bort direkt. Spartransaktioner påverkar nu sparkonton och målwidgets. | Ja. Sparkonton läggs in som kategorier och används av spartransaktioner. |
| Lån | `Dashboard.tsx`, `components/dashboard/sections/LoansSection.tsx`, `api.ts`, `supabase/migrations/202608090001_add_loans.sql` | `activeSection === "loans"`, `LoansSection`, `getLoans`, `addLoan`, `updateLoan`, `deleteLoan`, `upsertLoanSubscription` | Medel. Lån skapar/uppdaterar fasta utgifter, vilket påverkar fria pengar. | Ja. Delar `subscriptions` genom automatisk fast utgift med plan `Lån`. |
| AI Insights / "Har jag råd?" | `Dashboard.tsx`, CSS | `activeSection === "insights"`, `InsightsPanel`, `getAffordabilityResult`, översiktens insights | Låg/medel. Läser mest summary-data och navigerar till andra sektioner. | Ja, men främst read-only från `freeMoney`, `remainingDays`, mål och subscriptions. |
| Avancerade rapporter / saldoanalys | `Dashboard.tsx`, `finance-calculator.ts`, CSS | `activeSection === "reports"`, `showBalanceAnalysis`, `balanceBreakdownRows`, `expensesByCategory` | Medel. Saldoanalys läser kärnlogik och är nyttig för felsökning, men kan döljas bakom knapp. | Ja. Läser alla kärndata men skriver inget. |
| Adminpanel | `Dashboard.tsx`, `app/api/admin/stats/route.ts`, `api.ts` | `showAdminPanels`, `AdminOverviewPanel`, `getAdminStats`, `/api/admin/stats` | Låg för vanlig användar-UX om den bara göms. Hög säkerhetsmässigt om fel adminpolicy. | Ja via counts på alla tabeller, men skriver normalt inte kärndata. |
| Support/feedback | `Dashboard.tsx`, `api.ts`, SQL för `feedback` | `FeedbackPanel`, `SupportAdminPanel`, `addFeedback`, `getFeedbackTickets`, `updateFeedbackStatus`, automatisk fellogg | Låg för kärnberäkningar. | Delar auth/user och settings UI, men inte ekonomiuträkningen. |
| Beta-/launchchecklistor | `Dashboard.tsx` | `BetaStatusPanel`, `LaunchChecklistPanel`, `betaChecks`, `launchChecks` | Låg. | Läser appstatus, men påverkar inte ekonomi. |
| Changelog | `Dashboard.tsx` | `ChangelogPanel` | Låg. | Nej, bara UI/text. |
| Pro-demo / Pro-version | `Sidebar.tsx`, `Dashboard.tsx` | `proActive`, `toggleProDemo`, `pro-card` | Låg. | Minimal state, ej databaskritisk. |

#### C. Kandidat för borttagning

Kod som med hög sannolikhet är legacy, duplicerad eller utanför huvudflödet. Rekommendation: ta bort först när grep/import-verifiering + build bekräftar att huvudflödet inte påverkas.

| Kandidat | Filer | Beroenden/referenser | Säker verifiering | Risk för kärnan |
| --- | --- | --- | --- | --- |
| Äldre budgetroute | `app/budgets/page.tsx`, `components/budgets/*` | Importeras av `app/budgets/page.tsx`. Huvudflödet använder `Dashboard.tsx`, inte dessa komponenter. | `rg` visar komponenterna bara används av denna route. | Låg om `/budgets` inte används som publik route. Medel om någon använder direkt URL. |
| Äldre köproute | `app/purchases/page.tsx`, `components/purchases/*` | Importeras av `app/purchases/page.tsx`. | `rg` visar komponenterna bara används av denna route. | Låg/medel. Route använder `api.ts`, men inte huvud-Dashboard. |
| Äldre subscriptionsroute | `app/subscriptions/page.tsx`, `components/subscriptions/*` | Importeras av `app/subscriptions/page.tsx`. | `rg` visar modal-komponenterna bara används av denna route. | Låg/medel. Kan påverka direkt URL `/subscriptions`, inte huvudflödet. |
| Äldre categoriesroute | `app/categories/page.tsx`, `components/categories/*` | Importeras av `app/categories/page.tsx`. | `rg` visar komponenterna bara används av denna route. | Låg/medel. Kan påverka direkt URL `/categories`, inte huvudflödet. |
| Äldre settingsroute | `app/settings/page.tsx` | Fristående route som använder `getProfile`/`updateProfile`. | Ingen import från huvudflödet identifierad. | Låg om `/settings` inte används. |
| Gammal dashboard hook | `app/Hooks/useDashboard.ts` | `rg` visar ingen import av `useDashboard`. | Hög säkerhet: inga referenser hittade. | Låg. |
| Gamla dashboard-komponenter under `dashboard/cards`, `dashboard/actions`, `dashboard/lists`, `dashboard/overview` | Exempel: `FreeMoneyCard.tsx`, `DashboardStats.tsx`, `DashboardBottom.tsx`, `AIInsights.tsx`, `SpendingChart.tsx` | De importerar varandra internt, men `Dashboard.tsx` importerar dem inte. | `rg` visar att huvud-Dashboard bara importerar `LoansSection`. | Medel om man planerar återanvända dem. Låg för runtime om de inte importeras. |
| Legacy API-funktion `generateSubscriptionsForCurrentMonth` | `api.ts` | `rg` visar ingen användning utanför egen definition. | Ingen referens hittad i nuvarande huvudflöde. | Låg, men rör subscriptions/kop och bör tas efter tester. |
| `app/types/database.ts` delvis gammal typfil | `app/types/database.ts` | Används av äldre routes/hook. | Inte komplett för ny schema. | Medel om äldre routes behålls; låg om de tas bort. |

Osäkert:

- `release-setup.sql` och migrations ska inte tas bort. Även om vissa delar gäller funktioner som ska gömmas behövs historiken tills en ny konsoliderad migrationsstrategi finns.
- CSS-klasser för gamla komponenter kan vara svåra att säkert ta bort innan UI-sektioner har gömts och build/visuell test är gjord.

### 2. Beroenden för grupp B och C

#### Mål och sparkonton

Berörda filer:

- `Dashboard.tsx`
- `api.ts`
- `finance-calculator.ts`
- `supabase/release-setup.sql`
- `supabase/migrations/202607030002_add_goals_and_savings.sql`
- `app/types/database.ts`

Referenser:

- `FinanceData.goals`
- `FinanceData.savings`
- `Goal`, `SavingsAccount`
- `goalForm`, `savingsForm`
- `editingGoalId`, `editingSavingsId`
- `getGoals`, `addGoal`, `updateGoal`, `deleteGoal`
- `getSavingsAccounts`, `addSavingsAccount`, `updateSavingsAccount`, `deleteSavingsAccount`
- `getSavingsAdjustments`, `applySavingsAdjustments`, `findLinkedSavingsForGoal`
- `GoalPanel`
- `activeSection === "goals"`
- Sidebar-länk `"Mål"`

Risk mot kärnan:

- Direkt borttagning är riskabelt eftersom spartransaktioner och sparkonton även påverkar kategorilistan och lokalt state.
- Att bara gömma från navigation är betydligt säkrare.

#### Lån

Berörda filer:

- `Dashboard.tsx`
- `components/dashboard/sections/LoansSection.tsx`
- `api.ts`
- `finance-calculator.ts` indirekt via `subscriptions`
- `supabase/migrations/202608090001_add_loans.sql`
- `supabase/release-setup.sql`

Referenser:

- `FinanceData.loans`
- `getLoans`, `addLoan`, `updateLoan`, `deleteLoan`
- `upsertLoanSubscription`
- `loanSubscriptionPlan = "Lån"`
- `activeSection === "loans"`
- Sidebar-länk `"Lån"`

Risk mot kärnan:

- Lån i sig är utanför kärnan.
- Men lån skapar fasta utgifter, och fasta utgifter är kärna. Därför ska lån döljas först, inte tas bort direkt.

#### AI Insights

Berörda filer:

- `Dashboard.tsx`
- CSS i `globals.css`

Referenser:

- `InsightsPanel`
- `topInsights`
- `getAffordabilityResult`
- `affordabilityForm`
- `affordabilityResult`
- `activeSection === "insights"`
- Sidebar-länk `"AI Insights"`

Risk mot kärnan:

- Låg om den bara göms från navigation och översikt.
- Kan fortfarande behållas internt för framtiden.

#### Avancerade rapporter

Berörda filer:

- `Dashboard.tsx`
- `finance-calculator.ts`
- CSS i `globals.css`

Referenser:

- `activeSection === "reports"`
- `showBalanceAnalysis`
- `balanceBreakdownRows`
- `expensesByCategory`
- Sidebar-länk `"Rapporter"`

Risk mot kärnan:

- Rapportdelen läser kärnberäkningar. Att gömma hela rapportfliken är låg risk, men att ta bort beräkningsfält ur `finance-calculator.ts` är medel/hög risk.

#### Admin/support/beta

Berörda filer:

- `Dashboard.tsx`
- `api.ts`
- `app/api/admin/stats/route.ts`
- `supabase/release-setup.sql`
- `supabase/migrations/202607230001_add_feedback.sql`
- `supabase/migrations/202607230002_upgrade_feedback_to_support.sql`

Referenser:

- `showAdminPanels`
- `AdminOverviewPanel`
- `SupportAdminPanel`
- `FeedbackPanel`
- `BetaStatusPanel`
- `LaunchChecklistPanel`
- `getAdminStats`
- `addFeedback`
- `getFeedbackTickets`
- `updateFeedbackStatus`

Risk mot kärnan:

- Låg om gömt i UI.
- Säkerhetsmässigt bör adminpolicy ses över innan lansering.

#### Legacy routes och gamla komponenter

Berörda filer:

- `app/budgets/page.tsx`
- `app/categories/page.tsx`
- `app/purchases/page.tsx`
- `app/settings/page.tsx`
- `app/subscriptions/page.tsx`
- `app/components/budgets/*`
- `app/components/categories/*`
- `app/components/purchases/*`
- `app/components/subscriptions/*`
- `app/Hooks/useDashboard.ts`
- `app/components/dashboard/actions/*`
- `app/components/dashboard/cards/*`
- `app/components/dashboard/lists/*`
- `app/components/dashboard/overview/*`

Referenser:

- Äldre route-komponenter importeras bara av sina route-sidor.
- Gamla dashboard subkomponenter importeras internt av andra gamla dashboard subkomponenter.
- Nuvarande `Dashboard.tsx` importerar endast `LoansSection` från dashboard submapps-strukturen.

Risk mot kärnan:

- Låg om verifierat oanvända från huvudflödet.
- Medel om någon användare eller länk fortfarande öppnar `/budgets`, `/purchases`, `/settings`, `/subscriptions` eller `/categories` direkt.

### 3. Navigation

#### Nuvarande navigation

`app/components/Sidebar.tsx` definierar `AppSection`:

- `overview`
- `transactions`
- `freePurchases`
- `budgets`
- `categories`
- `goals`
- `loans`
- `travel`
- `subscriptions`
- `insights`
- `reports`
- `settings`

Sidebar visar alla dessa:

- Översikt
- Transaktioner
- Fria köp
- Budget
- Kategorier
- Mål
- Lån
- Resebudget
- Fasta utgifter
- AI Insights
- Rapporter
- Inställningar

`app/page.tsx` har en separat `sections`-array för hash-navigation:

- `overview`
- `transactions`
- `freePurchases`
- `budgets`
- `categories`
- `goals`
- `travel`
- `subscriptions`
- `insights`
- `reports`
- `settings`

Notering:

- `loans` finns i `Sidebar.tsx` och renderas i `Dashboard.tsx`, men saknas i `app/page.tsx` sections-array. Det betyder att klick i sidebar fungerar via state, men direktlänk/hash `#loans` kan falla tillbaka till overview vid första sidladdning.

#### Rekommenderad synlig navigation efter nedskalning

Synlig primär navigation:

1. Översikt
2. Fria pengar
3. Transaktioner
4. Budget
5. Fasta utgifter
6. Resebudget
7. Kategorier
8. Inställningar

Rekommenderad ordning på mobil:

1. Fria pengar
2. Transaktioner
3. Budget
4. Fasta utgifter
5. Resebudget
6. Mer / Inställningar

Göm tills vidare:

- Mål
- Lån
- AI Insights
- Rapporter

Flytta in bakom inställningar/admin eller dev-only:

- Adminpanel
- Beta-status
- Launch checklist
- Supportadmin
- Changelog
- Pro-demo

Behåll eventuellt support för betaägaren, men den bör inte dominera produktens kärn-UX.

### 4. Dashboard

#### Widgets som stödjer fria pengar

Behåll:

- `free-money-panel free-money-hero`
- fria pengar-ring
- `Lägg till köp`
- beräkningen inkomst - reserverat - fria köp - budget över = fritt
- kvar per dag
- fria köp idag
- vald löneperiod

Göm/förenkla:

- översiktens AI Insights
- måluppdatering/starkaste mål
- widgets som leder till mål/lån/avancerade rapporter

#### Widgets som stödjer transaktioner

Behåll:

- `Ny transaktion`
- senaste transaktioner
- transaktionslistan i `transactions`
- fria köp-listan i `freePurchases`
- redigera/radera transaktion
- kategori-/sökfilter
- små category/merchant-ikoner

Flytta/förenkla:

- separata äldre `/purchases`-route bör senare tas bort eller ersättas med huvudsektionen.

#### Widgets som stödjer budgetar

Behåll:

- budgetöversikt
- budgetformulär
- budgetrader med kvar/använt
- budgetöverskridande

Göm/förenkla:

- avancerad rapportvisning som inte behövs för att förstå budget kvar.

#### Widgets som stödjer fasta utgifter

Behåll:

- kommande fasta utgifter
- `Fasta utgifter`-sektionen
- frekvens/dragdatum
- skapa fasta utgifter som transaktioner
- saknade dragningar i saldoanalys kan vara kvar bakom expanderad knapp.

Viktigt:

- fasta utgifter måste fortsätta reserveras i fria pengar från periodstart även om dragdatum ligger senare.

#### Widgets som stödjer resebudget

Behåll:

- resebudget-hero
- skapa/redigera/radera resa
- separera från fria pengar-toggle
- reseköp
- kategorisummering för resa

Göm/förenkla:

- om resebudget får för stor plats på översikten kan den visas som ett litet statuskort och ha full vy i egen flik.

#### Allt annat

Kan gömmas:

- målwidget;
- sparkonto-widget;
- AI Insights-widget;
- admin/beta/checklistor från vanlig settingsvy;
- avancerad saldoanalys kan vara kvar kollapsad eller flyttas till "Avancerat".

Bör flyttas:

- support/beta/admin till admin-only eller dev-only del;
- import/export/radera data kan ligga kvar i inställningar men under "Avancerat".

Kan tas bort senare:

- legacy dashboard subkomponenter som inte importeras;
- legacy route-sidor när man är säker på att hash-dashboarden är enda appflödet.

### 5. Databas

#### Tabeller som behövs för nya kärnan

Behåll:

- `profile`: namn, månadsinkomst, ingående saldo och profilrelaterad data.
- `kop`: kassabok/transaktioner/fria köp/budgetköp/fasta utgifter som transaktioner.
- `budgets`: budgetar per kategori.
- `categories`: användarens kategorier.
- `subscriptions`: planerade/fasta utgifter.
- `travel_budgets`: resebudgetar.
- `travel_purchases`: köp i resebudget.

Behåll för auth men inte som egen public table:

- Supabase Auth `auth.users`.

#### Tabeller som tillhör funktioner att lägga åt sidan

Göm och behåll tills vidare:

- `goals`
- `savings_accounts`
- `loans`
- `feedback`

Motivering:

- De har RLS och befintlig användardata kan finnas.
- De ska inte raderas i cleanup-fas 1.
- Vissa delar delar state/logik med kärnan, särskilt `savings_accounts` och `loans`.

#### Databasändringar

Inga tabeller ska raderas eller ändras i denna fas.

Framtida möjlig databasförbättring:

- Om "planerade transaktioner" ska bli bredare än fasta utgifter bör man överväga en egen tabell eller tydligare modell för planerade engångstransaktioner.
- Idag hanteras återkommande planering via `subscriptions`. En vanlig framtida planerad engångstransaktion finns inte som separat modell.

### 6. Legacy / teknisk skuld

#### Gamla route-sidor

Kandidater:

- `app/budgets/page.tsx`
- `app/categories/page.tsx`
- `app/purchases/page.tsx`
- `app/settings/page.tsx`
- `app/subscriptions/page.tsx`

Varför de verkar legacy:

- Nuvarande huvudapp använder `app/page.tsx` + `Dashboard.tsx` + hash-sektioner.
- Sidorna har äldre layout och egna modaler.
- De syns som separata routes i `next build`, men sidebar navigerar inte till dem via vanliga länkar.

Verifiering:

- `rg` visar att deras komponenter importeras av respektive route.
- De är fortfarande runtime-routes, så "oanvända" betyder inte automatiskt säkert att radera. Beslut kräver att man accepterar att direkt-URL:erna försvinner.

#### Gamla komponenter

Kandidater:

- `app/components/budgets/*`
- `app/components/categories/*`
- `app/components/purchases/*`
- `app/components/subscriptions/*`
- `app/components/dashboard/actions/*`
- `app/components/dashboard/cards/*`
- `app/components/dashboard/lists/*`
- `app/components/dashboard/overview/*`

Varför de verkar legacy:

- Huvud-Dashboard importerar inte dessa, förutom `sections/LoansSection`.
- Flera verkar vara från en tidigare dashboard-arkitektur.

Verifiering:

- `rg` visar interna imports och imports från äldre routes.
- Exakt borttagning bör göras stegvis efter att route-strategin är beslutad.

#### Oanvänd hook

Kandidat:

- `app/Hooks/useDashboard.ts`

Varför den verkar legacy:

- `rg` hittar ingen import av `useDashboard`.
- Den använder äldre fält och äldre dashboardtänk.

Verifiering:

- Hög säkerhet att den inte används i nuvarande buildflöde.

#### Duplicerad affärslogik

Kandidater:

- datum-/periodfunktioner i både `Dashboard.tsx` och `finance-calculator.ts`;
- `isFreePurchase` finns både i `Dashboard.tsx` och `finance-calculator.ts`;
- subscription interval/frequency-logik finns både i `Dashboard.tsx` och `finance-calculator.ts`;
- savings/goal-koppling ligger i `Dashboard.tsx`, medan delar av savings finns i `finance-calculator.ts`.

Risk:

- Medel/hög. Detta är nära kärnlogiken och ska inte städas utan tester.

### 7. Säkerhet

Saker att fixa innan framtida lansering, men inte i denna analysfas:

#### RLS

Status:

- `release-setup.sql` aktiverar RLS på centrala tabeller.
- Policies är user-owned via `auth.uid() = user_id`.
- `travel_purchases` har extra parent-check mot `travel_budgets`.

Risk:

- Om gamla SQL-filer körs i fel ordning kan policies skilja sig från appens tänkta nuvarande läge.
- Kör alltid slutlig konsoliderad SQL i rätt ordning i en testdatabas innan riktig lansering.

#### Admin-policy

Status:

- Appkodens fallback-admin är `oskarek575@gmail.com`.
- `release-setup.sql` använder också `oskarek575@gmail.com` för feedback-admin.
- Äldre migration `202607230002_upgrade_feedback_to_support.sql` inkluderar även `oskarcool1337@gmail.com`.

Risk:

- Om den äldre migrationen körs efter release setup kan fler än ägaren få feedback-adminrättigheter.

Rekommendation:

- Skapa en ny säkerhetsmigration som uttryckligen droppar gamla admin policies och skapar dem med enbart korrekt adminlista.
- Håll adminlista på ett ställe där det går, helst server/env för appåtkomst och SQL-policy för DB-åtkomst.

#### Auth

Status:

- Supabase Auth används.
- Sign-up sparar namn i metadata och skapar/uppdaterar profile.
- Email confirmation kan påverka om ny användare kan logga in direkt beroende på Supabase-inställning.

Risk:

- UX kring email confirmation behöver vara tydlig för nya betatestare.

#### Användarseparering

Status:

- Data är designad som per-user via `user_id`.
- API:t använder Supabase client och RLS.
- Adminroute kräver bearer token och service role key server-side.

Risk:

- Service role key får aldrig exponeras som `NEXT_PUBLIC_*`.
- Adminstatistikroute ska fortsätta kontrollera email server-side.

### 8. Produktlogik: fria pengar mot önskad modell

Önskad modell:

- budgetar reserveras direkt;
- fasta/planerade utgifter reserveras direkt för aktuell löneperiod;
- fria köp dras direkt;
- budgetköp inom budget ska inte dras dubbelt;
- budgetöverskridande ska minska fria pengar;
- resebudget ska kunna vara separat eller påverka fria pengar;
- framtida planerade transaktioner ska kunna ha verkligt framtida datum men ändå vara reserverade från periodstart.

#### Stöds idag

Budgetar reserveras direkt:

- Ja.
- `reservedBudgetTotal = budgets.reduce(...)`.

Reserverat kvar:

- Ja.
- `reservedRemaining = budgetRemainingTotal + fixedExpenseRemaining`.
- `budgetRemainingTotal` är pengar kvar i budgetar efter bokförda budgetköp.
- `fixedExpenseRemaining` är fasta utgifter i aktuell löneperiod som ännu inte matchas av en bokförd/betald transaktion.
- Detta är ett separat presentations- och analysvärde. Det ersätter inte `reservedTotal` i fria-pengar-formeln.

Fasta utgifter reserveras direkt:

- Ja för `subscriptions` som är due i perioden.
- `fixedExpenseTotal` summerar alla schemalagda fasta utgifter som har `dueDate` i löneperioden.

Fria köp dras direkt:

- Ja.
- `freePurchaseSpent` summerar fria köp i perioden och dras från `freeMoney`.

Budgetköp inom budget dras inte dubbelt:

- Ja enligt både kod och tester.
- Budgetköp räknas in i `budgetRows.used`, men inte i `freePurchaseSpent`.

Budgetöverskridande minskar fria pengar:

- Ja.
- `budgetOverspendTotal` dras från `freeMoney`.
- Det finns test för detta.

Resebudget separat/påverkar fria pengar:

- Ja.
- `travel.separateFromFreeMoney` styr om reseköp räknas i `travelSpentAffectingFreeMoney`.

#### Delvis stödd

Framtida planerade transaktioner:

- Stöds för återkommande fasta utgifter genom `subscriptions`.
- En subscription med framtida `dueDate` i aktuell löneperiod räknas in i `fixedExpenseTotal`, vilket reserverar fria pengar från periodstart.
- Men det finns ingen generell modell för planerade engångstransaktioner utanför subscriptions.

Exempel:

- "Netflix dras den 20:e" kan reserveras direkt i perioden.
- "Jag vet att jag ska betala 900 kr för däckbyte den 12:e en enda gång" behöver idag troligen läggas som fast utgift eller vanlig transaktion, inte som en separat engångsplanerad transaktion.

Rekommenderad lösning senare:

1. Behåll `subscriptions` för återkommande fasta utgifter.
2. Lägg senare till ett tydligt koncept `planned_transactions` eller utöka `kop` med status/planeringsfält, men bara efter produktbeslut.
3. Kalkylatorn bör då reservera planerade transaktioner i perioden från periodstart, men bara räkna faktiskt saldo på rätt sätt när de faktiskt dragits.

### 9. Prioriterad cleanup-plan

Konservativ och säker ordning:

#### Steg 1: Göm icke-kärnflikar från navigationen

Sannolikt berörda filer:

- `app/components/Sidebar.tsx`
- eventuellt `app/page.tsx`

Åtgärd:

- Dölj `Mål`, `Lån`, `AI Insights`, `Rapporter` från synlig sidebar/bottom-nav.
- Låt `AppSection` och renderingen i `Dashboard.tsx` ligga kvar.

Risknivå:

- Låg.

Test efteråt:

- `npm run lint`
- `npm run build`
- klicka igenom synliga flikar: Översikt, Fria köp, Transaktioner, Budget, Kategorier, Fasta utgifter, Resebudget, Inställningar.

#### Steg 2: Fokusera översikten utan att ta bort kod

Sannolikt berörda filer:

- `Dashboard.tsx`
- `globals.css`

Åtgärd:

- Behåll fria pengar, snabbköp, statkort, senaste transaktioner, budgetstatus, fasta utgifter och resebudgetstatus.
- Göm mål-widget och AI-widget från översikten.
- Lämna komponent/funktioner kvar i koden.

Risknivå:

- Medel, eftersom `Dashboard.tsx` är stor och översikten har många beroenden.

Test efteråt:

- skapa fria köp;
- skapa budgetköp inom budget;
- överskrid budget;
- skapa fast utgift;
- skapa reseköp med `separateFromFreeMoney` både true och false;
- mobil layout.

#### Steg 3: Förenkla inställningar visuellt

Sannolikt berörda filer:

- `Dashboard.tsx`
- `globals.css`

Åtgärd:

- Behåll profilnamn, ingående saldo, tema, PWA-installation, export/import/radera data och logga ut.
- Göm beta-status, launch checklist, adminstatistik, supportadmin och changelog bakom admin/dev eller senare vy.

Risknivå:

- Låg/medel.

Test efteråt:

- ändra namn;
- ändra ingående saldo;
- install guide/PWA-panel;
- logga ut/in;
- säkerställ att admin fortfarande kan nå eventuell admininformation om den ska finnas kvar.

#### Steg 4: Lägg test runt planerade utgifter

Sannolikt berörda filer:

- `scripts/finance-calculator.test.mjs`
- eventuellt bara testdata, ingen produktkod om befintlig logik redan klarar det.

Åtgärd:

- Lägg test som bekräftar att framtida fast utgift i aktuell löneperiod reserveras direkt från fria pengar.
- Lägg test för kvartalsvis/halvårsvis subscription.
- Lägg test för resebudget true/false.

Risknivå:

- Låg.

Test efteråt:

- `npm run test`
- `npm run lint`
- `npm run build`

#### Steg 5: Besluta route-strategi

Sannolikt berörda filer:

- `app/page.tsx`
- legacy routes under `app/*/page.tsx`

Åtgärd:

- Besluta om appen ska använda hash-sektioner eller riktiga routes.
- För betan: enklast är att behålla hash-sektioner tills vidare.

Risknivå:

- Medel.

Test efteråt:

- direktlänkar;
- refresh på varje flik;
- mobil navigation;
- Vercel deployment.

#### Steg 6: Ta bort bevisat oanvänd hook

Sannolikt berörda filer:

- `app/Hooks/useDashboard.ts`

Åtgärd:

- Ta bort filen om `rg useDashboard app` fortfarande bara visar definitionen.

Risknivå:

- Låg.

Test efteråt:

- `npm run lint`
- `npm run build`

#### Steg 7: Ta bort eller arkivera gamla dashboard subkomponenter

Sannolikt berörda filer:

- `app/components/dashboard/actions/*`
- `app/components/dashboard/cards/*`
- `app/components/dashboard/lists/*`
- `app/components/dashboard/overview/*`

Åtgärd:

- Ta bort bara om de fortfarande inte importeras av huvudflödet.
- Alternativt vänta tills `Dashboard.tsx` har refaktorerats och använda bra delar.

Risknivå:

- Medel.

Test efteråt:

- `npm run lint`
- `npm run build`
- visuell kontroll desktop/mobil.

#### Steg 8: Ta bort legacy routes

Sannolikt berörda filer:

- `app/budgets/page.tsx`
- `app/categories/page.tsx`
- `app/purchases/page.tsx`
- `app/settings/page.tsx`
- `app/subscriptions/page.tsx`
- deras modal/list-komponenter
- eventuellt `app/types/database.ts`

Åtgärd:

- Ta bort routes bara om produktbeslutet är att de inte ska finnas.
- Efter borttagning ska `next build` inte längre lista dem.

Risknivå:

- Medel.

Test efteråt:

- `npm run lint`
- `npm run build`
- kontrollera att huvudappens hash-navigation fungerar.

#### Steg 9: Konsolidera affärslogik

Sannolikt berörda filer:

- `Dashboard.tsx`
- `finance-calculator.ts`
- `scripts/finance-calculator.test.mjs`

Åtgärd:

- Flytta duplicerade helpers från `Dashboard.tsx` till `finance-calculator.ts` eller en liten domain-fil.
- Gör ett litet steg åt gången.

Risknivå:

- Hög.

Test efteråt:

- full testsvit;
- manuell ekonomitestmatris;
- build/lint;
- jämför fria pengar före/efter med samma data.

#### Steg 10: Skapa framtida modell för engångs-planerade transaktioner

Sannolikt berörda filer:

- `finance-calculator.ts`
- `Dashboard.tsx`
- `api.ts`
- ny SQL migration om ny tabell behövs

Åtgärd:

- Vänta med detta tills scope-cleanup är klar.
- Produktbeslut krävs: egen tabell eller utöka `kop`.

Risknivå:

- Hög.

Test efteråt:

- planerad engångsutgift framtida datum;
- faktisk dragning;
- dubbelräkning;
- budgetköp kontra fria köp;
- faktisk saldo kontra fria pengar.

### 10. Sammanfattning

#### Behåll

Behåll och stärk:

- Fria pengar
- Kassabok/transaktioner
- Fria köp
- Budgetar
- Kategorier
- Fasta/planerade utgifter
- Löneperiod dag 25
- Resebudget
- Enkel översikt
- Nödvändiga inställningar
- Auth, RLS, Supabase-synk och PWA

#### Göm tills vidare

Göm i första cleanup-rundan:

- Mål
- Sparkonton
- Lån
- AI Insights
- Avancerade rapporter
- Adminstatistik
- Supportadmin
- Beta-/launchchecklistor
- Changelog
- Pro-demo

#### Kandidat för borttagning med hög säkerhet

Högst sannolik borttagning senare:

- `app/Hooks/useDashboard.ts`
- legacy route-sidor om direkt-URLs inte behövs
- gamla modal/list-komponenter som bara används av legacy routes
- gamla dashboard subkomponenter som inte importeras av huvudflödet
- `generateSubscriptionsForCurrentMonth` om den fortsatt är oanvänd

#### Risker

Största riskerna:

- `Dashboard.tsx` är stor, så UI-gömning kan råka påverka state eller forms.
- Lån delar data med fasta utgifter via subscriptions.
- Sparkonton/mål delar kategori- och transaktionslogik.
- Adminpolicy skiljer sig mellan nyare release SQL och äldre migration.
- Det finns ingen generell modell för planerade engångstransaktioner ännu.

#### Rekommenderad ordning

1. Göm icke-kärnflikar från navigation.
2. Fokusera översikten.
3. Förenkla inställningar.
4. Lägg tester runt planerade/fasta utgifter och resebudget.
5. Bestäm route-strategi.
6. Ta bort `useDashboard.ts` om fortfarande oanvänd.
7. Ta bort gamla dashboard subkomponenter om fortfarande oanvända.
8. Ta bort legacy routes om produktbeslutet är taget.
9. Konsolidera affärslogik försiktigt.
10. Designa eventuell ny modell för engångs-planerade transaktioner.

### Cleanup genomförd 2026-08-30

Följande bevisat oanvända/legacy-delar har tagits bort utan att ändra kärnflödet i `app/page.tsx` + `Dashboard.tsx`:

- gammal dashboard-hook: `app/Hooks/useDashboard.ts`
- gamla dashboard-subkomponenter under `app/components/dashboard/actions`, `cards`, `lists` och `overview`
- gamla separata App Router-sidor: `/budgets`, `/categories`, `/purchases`, `/settings`, `/subscriptions`
- gamla modal/list-komponenter under `app/components/budgets`, `categories`, `purchases` och `subscriptions`
- legacy-API-hjälpen `generateSubscriptionsForCurrentMonth`, som bara användes av den borttagna `/subscriptions`-routen
- gamla `app/types/database.ts`, efter att inga imports fanns kvar till filen

Aktiv navigation och huvudappen är fortsatt hash-baserad via `app/page.tsx`, `Sidebar.tsx` och `Dashboard.tsx`. Dolda men fortfarande renderbara funktioner i huvud-Dashboard, exempelvis mål/sparkonton/lån/AI insights/rapporter/admin/support, har inte raderats i denna cleanup.

### Översiktsdiagram återlagt 2026-08-30

Översikten visar åter en mobilvänlig ruta med cirkeldiagram för utgifter per kategori. Rutan återanvänder befintlig `expensesByCategory` och `donutGradient` i `Dashboard.tsx`, så ingen ny ekonomilogik eller databaslogik lades till.

### Kategorival för köp förbättrat 2026-08-30

Köpformulären i Översikten och Transaktioner använder nu tryckbara kategorikort för utgifter i stället för en scrollig kategoridropdown. Korten återanvänder befintliga kategorier, budgetrader och transaktionsstate, så ingen ny databaslogik eller ekonomilogik lades till.

### Egna kategoriikoner och färger 2026-08-30

Kategorier kan nu skapas med valt ikon- och färgtema. Appen återanvänder Supabase-fälten `icon` och `color` i `categories` och visar metadata i kategoriväljaren, kategoriöversikten och transaktionsraderna. Ingen ny databasstruktur eller ekonomilogik lades till.

### Transaktionsform och kategorirapport justerad 2026-08-30

Transaktioner-sidan har nu ett hopfällbart formulär så kategori-korten inte gör sidan onödigt lång. Cirkeldiagrammet för utgifter per kategori är borttaget från Översikten och ligger i stället på Rapporter-sidan, som åter är synlig i navigationen. Egna kategorier kan raderas direkt via soptunnan; låsta systemkategorier skyddas fortfarande.

### Kategoriväljare justerad 2026-08-30

Transaktionsformuläret är åter fast synligt. Endast kategorifältet kan fällas ut, och den öppna kategorilistan har egen scroll-yta med begränsad höjd så mobilscroll inte lika lätt flyttar hela sidan.

### Fria pengar-sidan gömd från navigation 2026-08-30

Den separata `freePurchases`-sektionen finns kvar i kod och kan nås/återaktiveras senare, men visas inte längre i desktop-sidebar eller mobil bottom-nav. Översiktens klick för “Fritt idag” går i stället till Transaktioner, så köpflödet samlas i kassaboken utan att ta bort befintlig Fria pengar-kod.

### Löneperiod vid månadsslut fixad 2026-08-31

Appens automatiska val av aktuell löneperiod använder nu `getCurrentFinancialMonth` i `finance-calculator.ts`. Fixen hindrar datum som 31 augusti från att hoppa två månader framåt när nästa månad är kortare. Regressionstest finns för 24/25/31 augusti och nästa brytdag.

### Fria pengar och köpflöde förtydligat 2026-08-31

Översikten visar nu löneperiodens namn tillsammans med datumintervallet, en hopfällbar “Varför har jag fria pengar?”-förklaring samt tydligare köp-hintar som visar om vald kategori går mot budget eller dras från fria pengar. Själva ekonomiberäkningen ändrades inte.

### Översikt polerad mot kärnflödet 2026-08-31

Översikten har fått en mer fokuserad periodcoach med fritt per dag, pengar med jobb, nästa dragning och budgetar som behöver uppmärksamhet. AI- och målsektionerna finns kvar i kod/rendering men visas inte längre som dominerande widgets på startsidan. Transaktionsflödet har fått ett mjukt dublettskydd där en misstänkt identisk transaktion kräver ett extra spar-klick.
