# Oskars Ekonomi

En personlig ekonomiapp för budget, fria pengar, fasta utgifter, köp, sparkonton och mål.

## Starta lokalt

```bash
npm run dev
```

Öppna sedan:

```text
http://localhost:3000
```

## Supabase innan riktig användning

Kör den samlade release-filen i Supabase SQL Editor:

```text
supabase/release-setup.sql
```

Den lägger till:

- fria köp-källa på transaktioner
- tabeller för mål och sparkonton
- `user_id` på appens tabeller
- RLS-regler så varje användare bara ser sin egen data

Om gammal data redan finns i Supabase kan den behöva kopplas till ditt konto efter att RLS aktiverats.

## Miljövariabler

Appen behöver dessa i `.env.local` lokalt och i hostingen:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Publicera

Publicera som en vanlig Next.js-app, till exempel på Vercel.

När appen ligger på en HTTPS-adress kan den installeras på mobilen:

### iPhone

1. Öppna appens webbadress i Safari.
2. Tryck på dela-knappen.
3. Välj “Lägg till på hemskärmen”.

### Android

1. Öppna appens webbadress i Chrome.
2. Tryck på menyn.
3. Välj “Installera app” eller “Lägg till på startskärmen”.

## Kontroll inför release

Kör:

```bash
npm run lint
npm run build
```
