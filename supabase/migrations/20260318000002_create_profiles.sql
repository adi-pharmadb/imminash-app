-- Migration: Create profiles table
-- Stores authenticated user profiles linked to Supabase Auth

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  first_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_email on public.profiles (email);

-- RLS policies
alter table public.profiles enable row level security;
