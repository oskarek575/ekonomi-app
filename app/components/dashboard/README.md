# Dashboard structure

Dashboard-koden är uppdelad efter ansvar så att nya funktioner hamnar på rätt plats direkt.

## Mappar

- `Dashboard.tsx` är den nuvarande huvudcontainern för den inloggade ekonomiappen.
- `overview/` innehåller komponenter som hör till översiktssidan och äldre översiktsbyggstenar.
- `cards/` innehåller återanvändbara kort, diagram och panels.
- `lists/` innehåller listkomponenter.
- `actions/` innehåller komponenter som skapar eller triggar något.

## När ny kod läggs till

- Ny fristående ruta eller widget: lägg den i `cards/`.
- Ny lista: lägg den i `lists/`.
- Ny knapp-/formulärdriven action: lägg den i `actions/`.
- Ny hel dashboard-sektion, till exempel en framtida lånevy eller rapportvy: skapa en egen `sections/`-mapp och låt `Dashboard.tsx` bara välja vilken sektion som visas.

## Nästa refaktor-steg

`Dashboard.tsx` är fortfarande stor eftersom den äger mycket state och alla sidsektioner. Nästa säkra steg är att bryta ut en sektion i taget, börja med de mest isolerade:

1. `LoansSection`
2. `TravelSection`
3. `ReportsSection`
4. `SettingsSection`

Målet är att `Dashboard.tsx` till slut bara laddar data, håller global state och renderar rätt sektion.
