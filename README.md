# Namalì Shift App

App React/Vite per gestione turni, timbrature e report di Namalì.

## Stack

- React + Vite
- Supabase Auth
- PostgreSQL + Row Level Security
- PWA con vite-plugin-pwa

## 1. Crea il progetto Supabase

Crea un nuovo progetto Supabase e conserva la password del database fuori dal repository.

## 2. Esegui lo schema

Nel **SQL Editor** di Supabase:

1. apri `supabase.sql`;
2. copia tutto il contenuto;
3. eseguilo una sola volta su un progetto nuovo.

Lo script crea:

- azienda Namalì;
- postazione `NAMALI-001`;
- tabelle, policy RLS e funzione RPC di timbratura;
- blocco doppia scansione;
- vincolo di un solo turno attivo per dipendente.

Lo script non crea utenti e non contiene password.

## 3. Crea gli utenti Auth

Vai in **Authentication → Users → Add user**.

### Admin

Usa l'email reale della titolare e una password scelta da lei.

### Dipendenti

Crea un account separato per ogni dipendente.

Regole:

- password casuale individuale;
- password diversa per ogni persona;
- nessuna password nel codice, SQL, README o GitHub;
- sessione persistente sul telefono;
- per revocare l'accesso, imposta `active = false` nel profilo;
- non eliminare gli utenti: i dati storici devono restare collegati.

Esempi di email tecniche per i test:

- `maria@namali.it`
- `laura@namali.it`

Le password vengono scelte nel Dashboard Supabase e consegnate privatamente.

## 4. Crea i profili

Dopo aver creato ogni utente, copia il relativo **User UID** da Authentication → Users.

Esegui nel SQL Editor un `INSERT` per ogni profilo.

### Titolare

```sql
INSERT INTO public.profiles (
  id, company_id, full_name, email, role, position, active
) VALUES (
  '<UID_TITOLARE>',
  '11111111-1111-1111-1111-111111111111',
  '<NOME_TITOLARE>',
  '<EMAIL_REALE_TITOLARE>',
  'admin',
  'Titolare',
  TRUE
);
```

### Dipendente

```sql
INSERT INTO public.profiles (
  id, company_id, full_name, email, role, position, active
) VALUES (
  '<UID_DIPENDENTE>',
  '11111111-1111-1111-1111-111111111111',
  '<NOME_DIPENDENTE>',
  '<EMAIL_ACCOUNT_DIPENDENTE>',
  'employee',
  '<POSIZIONE>',
  TRUE
);
```

Verifica:

```sql
SELECT id, full_name, email, role, active
FROM public.profiles
ORDER BY role, full_name;
```

## 5. Configura il frontend

Copia `.env.example` in `.env` e inserisci:

```env
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=tua-anon-key
VITE_DEMO_MODE=false
```

La chiave anon è prevista nel frontend. Non inserire mai la `service_role` nel progetto React.

## 6. Avvia

```bash
npm install
npm run dev
```

Build produzione:

```bash
npm run build
```

## Verifiche minime

1. La titolare accede selezionando **Admin**.
2. Il dipendente accede selezionando **Dipendente**.
3. Il dipendente preme **Simula scansione NFC**: viene registrata l'entrata.
4. Una seconda scansione entro 30 secondi viene rifiutata.
5. Dopo 30 secondi, la scansione chiude il turno.
6. L'admin vede turni, eventi e dipendenti della propria azienda.
7. Il dipendente vede soltanto i propri dati.
8. Impostando `active = false`, l'utente viene disconnesso al successivo controllo di sessione/login.
9. Il report mensile usa il fuso `Europe/Rome`.
10. Il CSV contiene durata, orari e dipendente.

## Query di controllo

### Permesso RPC

```sql
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'clock_in_out'
ORDER BY grantee;
```

Atteso: `authenticated = EXECUTE`; nessun permesso per `anon` o `PUBLIC`.

### Policy RLS

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Turno attivo unico

```sql
SELECT employee_id, COUNT(*)
FROM public.shifts
WHERE status = 'active'
GROUP BY employee_id
HAVING COUNT(*) > 1;
```

Atteso: zero righe.

### Eventi registrati

```sql
SELECT event_type, result, occurred_at
FROM public.clock_events
ORDER BY occurred_at DESC
LIMIT 20;
```

## Limiti della V1

Non sono ancora inclusi:

- lettura NFC fisica;
- ferie, permessi e malattie;
- notifiche push;
- gestione multi-azienda commerciale;
- creazione utenti direttamente dall'app.
