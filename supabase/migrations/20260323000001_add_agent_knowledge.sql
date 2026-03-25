-- Migration: Create agent_knowledge table
-- Stores migration agent's strategic advice, tips, and notes per occupation.

create table if not exists public.agent_knowledge (
  id uuid primary key default gen_random_uuid(),
  anzsco_code text not null,
  strategic_advice text,
  common_pitfalls text,
  recommended_approach text,
  tips_and_hacks text,
  custom_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_agent_knowledge_occupation
    foreign key (anzsco_code)
    references occupations (anzsco_code)
    on delete cascade
);

create unique index idx_agent_knowledge_anzsco_code on public.agent_knowledge (anzsco_code);

alter table public.agent_knowledge enable row level security;
