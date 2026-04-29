# OmniStage Next.js

Painel de convidados em Next.js com visual inspirado no layout premium Valentina XV.

## Variáveis de ambiente

Crie estas variáveis na Vercel:

NEXT_PUBLIC_SUPABASE_URL=https://uxhdenljjynvkgzeeiyv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4DalWxML4gSofZ5yNeVZug_0bwuREqH

## SQL mínimo

Execute no Supabase:

```sql
create extension if not exists "uuid-ossp";

create table if not exists guests (
  id uuid default uuid_generate_v4() primary key,
  nome text,
  name text,
  email text,
  telefone text,
  phone text,
  grupo text,
  status text default 'pendente',
  token text,
  checkin boolean default false,
  data_confirmacao text,
  link_cartao text,
  created_at timestamp default now()
);

alter table guests enable row level security;

drop policy if exists "Allow all" on guests;

create policy "Allow all"
on guests
for all
using (true)
with check (true);
```
