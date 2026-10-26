/**
 * Esquema do banco (PostgreSQL). É idempotente: roda sozinho na primeira requisição
 * de cada instância e pode ser executado manualmente quantas vezes quiser.
 * Valores monetários ficam em centavos (bigint).
 */
export const SCHEMA_SQL = `
create table if not exists condo_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Meu Condomínio',
  cnpj text,
  address text,
  fine_percent numeric(5,2) not null default 2.00,
  interest_percent numeric(5,2) not null default 1.00,
  default_due_day int not null default 10 check (default_due_day between 1 and 28),
  reserve_percent numeric(5,2) not null default 0
);
insert into condo_settings (id) values (1) on conflict do nothing;

create table if not exists units (
  id serial primary key,
  identifier text not null unique,
  block text,
  owner_name text not null,
  owner_email text,
  owner_phone text,
  resident_name text,
  ideal_fraction numeric(10,6) not null default 0 check (ideal_fraction >= 0),
  fixed_fee_cents bigint check (fixed_fee_cents is null or fixed_fee_cents >= 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id serial primary key,
  name text not null,
  email text not null,
  password_hash text not null,
  role text not null check (role in ('admin','financeiro','conselho','morador')),
  unit_id int references units(id) on delete set null,
  active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_key on users (lower(email));

create table if not exists accounts (
  id serial primary key,
  name text not null unique,
  kind text not null default 'banco' check (kind in ('banco','caixa','fundo_reserva')),
  opening_balance_cents bigint not null default 0,
  active boolean not null default true
);

create table if not exists categories (
  id serial primary key,
  name text not null,
  type text not null check (type in ('receita','despesa')),
  system_key text unique,
  active boolean not null default true,
  unique (type, name)
);

create table if not exists suppliers (
  id serial primary key,
  name text not null,
  document text,
  phone text,
  email text,
  notes text,
  active boolean not null default true
);

create table if not exists charges (
  id serial primary key,
  unit_id int not null references units(id),
  ref text not null,
  competence date not null,
  due_date date not null,
  description text not null,
  total_cents bigint not null check (total_cents >= 0),
  status text not null default 'aberta' check (status in ('aberta','paga','cancelada')),
  paid_at date,
  paid_cents bigint,
  fine_cents bigint not null default 0,
  interest_cents bigint not null default 0,
  account_id int references accounts(id),
  created_at timestamptz not null default now(),
  unique (unit_id, ref)
);
create index if not exists charges_status_due_idx on charges (status, due_date);
create index if not exists charges_competence_idx on charges (competence);

create table if not exists charge_items (
  id serial primary key,
  charge_id int not null references charges(id) on delete cascade,
  description text not null,
  category_id int references categories(id),
  amount_cents bigint not null
);
create index if not exists charge_items_charge_idx on charge_items (charge_id);

create table if not exists transactions (
  id serial primary key,
  type text not null check (type in ('receita','despesa')),
  description text not null,
  category_id int not null references categories(id),
  account_id int references accounts(id),
  supplier_id int references suppliers(id),
  unit_id int references units(id),
  charge_id int references charges(id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  due_date date not null,
  competence date not null,
  paid_at date,
  document_ref text,
  notes text,
  created_by int references users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (paid_at is null or account_id is not null)
);
create index if not exists transactions_paid_idx on transactions (paid_at);
create index if not exists transactions_due_idx on transactions (due_date) where paid_at is null;
create index if not exists transactions_charge_idx on transactions (charge_id);

create table if not exists transfers (
  id serial primary key,
  from_account_id int not null references accounts(id),
  to_account_id int not null references accounts(id),
  amount_cents bigint not null check (amount_cents > 0),
  date date not null,
  description text,
  created_by int references users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

create table if not exists audit_log (
  id bigserial primary key,
  user_id int,
  user_name text,
  action text not null,
  entity text,
  entity_id text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on audit_log (created_at desc);
`;
