# Arbetssätt – så jobbar Oskar och Claude med apparna

Den här filen beskriver hur vi jobbar, så att en ny chatt (eller en annan app) kan göra likadant.
Säger Oskar "gör som i ekonomi-appen" betyder det: följ den här filen och använd
`oskarek575/ekonomi-app` som förebild.

## Kommunikation
- Svara på **svenska**, kort och tydligt – Oskar läser oftast i mobilen.
- "**Svara bara, bygg inget**" = bara svar/råd, ändra ingen kod.
- Vid större designändringar: **föreslå först** och gör en **skiss** (Design-canvas med iPhone-skärmar, 390×844). Bygg först när Oskar godkänt.
- Berätta efter varje leverans vad som ändrats, i punktform, och påminn om att **stänga och öppna appen** (den är en PWA med cache).

## Uppkoppling
- Koden ligger på GitHub (`oskarek575/...`). Koppla in repot och klona det.
- Vercel-projektet och Supabase-projektet nås via connectors. Hitta rätt GitHub-repo via Vercel-deployens metadata om namnet är okänt.
- Läs `PROJECT_STATUS.md` (och `AGENTS.md`/`CLAUDE.md`) först i varje repo.

## Bygga och leverera (standard om inget annat sägs)
1. Gör ändringen.
2. Kör tester (`npm test`) och en typkontroll av ändrade filer.
3. Uppdatera `PROJECT_STATUS.md` med en kort beskrivning av ändringen.
4. Committa på svenska och **pusha till `main`** → Vercel bygger produktion automatiskt.
   - Ett misslyckat bygge ersätter inte produktion, så det är säkert.
   - Vid stora ändringar: pusha först till en testgren, kontrollera Vercel-preview, slå sedan ihop.
   - Om Vercel inte startar ett produktionsbygge (samma commit som en preview): pusha en tom commit.
5. Kontrollera i Vercel att produktionsdeployen är **READY** innan du säger att det är klart.

## Databas (Supabase)
- Kolla alltid hur många rader en tabell har innan något tas bort. **Radera aldrig data utan att fråga.**
- Spara schemaändringar som filer i `supabase/migrations/` och applicera dem via Supabase-verktyget.
- RLS-policies skrivs med `(select auth.uid())`, inte `auth.uid()`, för prestanda.
- Kör Supabase-advisors (security + performance) vid genomgångar.

## Designstandard (från ekonomi-appen)
- Typsnitt Geist, vikter max 600–650, minsta textstorlek 12–13 px.
- Mobil: **bottenmeny** (Översikt, Köp, +, Budget, Mer) istället för hamburgare.
- Formulär öppnas som **ark nerifrån** på mobil; listor först.
- **Täta listrader** (ikon, namn, underrad, belopp till höger), grupperade per dag; tryck på rad = redigera.
- Kompakt topp, `env(safe-area-inset-top)` så inget hamnar under klockan.
- Negativa belopp röda, statusfärger: grön = ok, grå = slut, orange = över.
- Inga beloppsradbrytningar (`white-space: nowrap`), datumfält får inte sticka ut.
