# Moje recepty – React + Vite + Supabase

## 1. Nastavení prostředí

V kořenové složce projektu vytvoř `.env.local` podle `.env.example` a vlož:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Nikdy nevkládej `service_role` ani `secret` klíč do frontendu.

## 2. Instalace a spuštění

```bash
npm install
npm install @supabase/supabase-js
npm run dev
```

## 3. Databáze – důležitá migrace

Původní SQL vytvořilo tabulky, RLS a Storage policies. Nyní otevři Supabase → SQL Editor → New query a spusť celý obsah souboru:

`supabase/migrations/002_app_support.sql`

Tato migrace umožní editorům upravovat recepty a přidá bezpečnou funkci pro načtení pozvánek.

## 4. Přihlášení

Supabase Authentication:
- Email provider enabled.
- Site URL: `http://localhost:5173`
- Redirect URL: `http://localhost:5173/**`

Pokud je zapnuté potvrzování e-mailu, po registraci musí uživatelka potvrdit e-mail před prvním přihlášením.

## 5. Storage

Bucket musí být `recipe-photos`, Private, limit 10 MB a povolené MIME typy:
`image/jpeg, image/png, image/webp`

Použité Storage policies předpokládají cestu:
`OWNER_USER_ID/RECIPE_ID/filename.jpg`

## 6. Sdílení

Pozvaná uživatelka musí mít nejprve účet se stejnou e-mailovou adresou. Majitelka pak vytvoří pozvánku a uživatelka ji přijme po přihlášení.

## 7. Důležité limity této verze

- Recepty, přihlášení a sdílení vyžadují internetové připojení.
- PWA může uložit základní soubory aplikace do cache, ale zatím neprovádí offline synchronizaci změn.
- Oblíbené označení je v této verzi uložené u receptu a měnit ho může jeho majitelka.
- Přihlášení je zatím pouze e-mailem a heslem.
- Sdílení se vytváří pro e-mail již registrované uživatelky.
