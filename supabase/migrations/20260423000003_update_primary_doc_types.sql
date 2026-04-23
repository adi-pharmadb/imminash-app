-- Pillar 2: align ui_config.primary_document_types with the new canonical
-- doc_type values emitted by [DOC_UPDATE:<type>:...] markers. The original
-- Wave 2 seed used best-guess names that predated the Pillar 2 marker
-- contract; this migration replaces them with the actual types the agent
-- now drafts and the server persists.

update public.assessing_body_requirements
set ui_config = jsonb_set(
  coalesce(ui_config, '{}'::jsonb),
  '{primary_document_types}',
  '["employment_reference","statutory_declaration","rpl_report","cv_structured"]'::jsonb
)
where body_name = 'ACS';

update public.assessing_body_requirements
set ui_config = jsonb_set(
  coalesce(ui_config, '{}'::jsonb),
  '{primary_document_types}',
  '["statement_of_service","cv_structured","evidence_bundle"]'::jsonb
)
where body_name = 'VETASSESS';

update public.assessing_body_requirements
set ui_config = jsonb_set(
  coalesce(ui_config, '{}'::jsonb),
  '{primary_document_types}',
  '["career_episode","summary_statement","cpd_log","cv_structured"]'::jsonb
)
where body_name = 'Engineers Australia';

update public.assessing_body_requirements
set ui_config = jsonb_set(
  coalesce(ui_config, '{}'::jsonb),
  '{primary_document_types}',
  '["msa_employer_template","evidence_bundle","statutory_declaration","cv_structured"]'::jsonb
)
where body_name = 'TRA';
