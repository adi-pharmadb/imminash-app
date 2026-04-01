-- Payments table for tracking Stripe checkout sessions and payment status
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  amount_cents integer not null,
  currency text not null default 'aud',
  status text not null default 'pending',
  assessment_id uuid references public.assessments(id),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast user lookups
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);

-- RLS
alter table public.payments enable row level security;

-- Users can read their own payments
create policy "Users can read own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Service role can insert/update (used by webhook)
create policy "Service role can manage payments"
  on public.payments for all
  using (true)
  with check (true);
