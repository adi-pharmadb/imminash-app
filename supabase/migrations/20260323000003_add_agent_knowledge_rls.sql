-- Migration: RLS policies for agent_knowledge table
-- Public read for anon/authenticated (same pattern as occupations).
-- Write restricted: admin writes happen via service role at the API layer.

create policy "public_read_agent_knowledge"
  on agent_knowledge for select
  to anon, authenticated
  using (true);
