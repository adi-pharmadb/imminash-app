-- Migration: Add enrichment columns to occupations table
-- Adds qualification level, unit group description, and industry keywords
-- sourced from ANZSCO 1220.0 First Edition Rev 1.

alter table public.occupations
  add column if not exists qualification_level_required text,
  add column if not exists unit_group_description text,
  add column if not exists industry_keywords text[];
