-- Wave 2: body-aware UI config + eligibility rules.
-- Moves ACS-specific hardcodes out of TS/prompt into per-body DB rows so
-- VETASSESS, Engineers Australia, TRA (and future bodies) can ship without
-- touching application code.

alter table public.assessing_body_requirements
  add column if not exists ui_config jsonb,
  add column if not exists eligibility_rules jsonb;

-- ui_config shape:
--   pathway_label          text — what the UI calls this body's pathway
--   sidebar_layout         'acs-form' | 'chat-only' — workspace left-rail layout
--   primary_document_types text[] — doc types that drive the tab list
--   paywall                { title?, value_prop?, cta_label? } — paywall copy overrides
--
-- eligibility_rules shape:
--   paid_path_requires_any_of: array of predicates. Each predicate is one of:
--     { field, equals }            exact value match
--     { field, in }                value in provided list
--     { field, band_min }          ordered-band field is >= band_min (see code)
--   else_action: 'paywall' | 'calendly' — decision when no predicate matches
--
-- Ordered bands used by band_min (from smallest to largest):
--   australianExperience, experience: ["none","<1","1-3","3-5","5-8","8+"]

update public.assessing_body_requirements
set
  ui_config = jsonb_build_object(
    'pathway_label', 'General Skills Assessment',
    'sidebar_layout', 'acs-form',
    'primary_document_types', jsonb_build_array(
      'employment_reference', 'cpd_log', 'supporting_statement'
    ),
    'paywall', jsonb_build_object(
      'title', 'Unlock your ACS document workspace',
      'value_prop', 'Continue to have Imminash draft your employer references, build your ACS document checklist, and walk you through submission.',
      'cta_label', 'Continue to payment'
    )
  ),
  eligibility_rules = jsonb_build_object(
    'paid_path_requires_any_of', jsonb_build_array(
      jsonb_build_object('field', 'professionalYear', 'equals', 'Yes'),
      jsonb_build_object('field', 'australianExperience', 'band_min', '1-3'),
      jsonb_build_object('field', 'experience', 'band_min', '3-5')
    ),
    'else_action', 'calendly'
  )
where body_name = 'ACS';

update public.assessing_body_requirements
set
  ui_config = jsonb_build_object(
    'pathway_label', 'Skills Assessment',
    'sidebar_layout', 'chat-only',
    'primary_document_types', jsonb_build_array(
      'employment_reference', 'qualifications_statement', 'cv'
    ),
    'paywall', jsonb_build_object(
      'title', 'Unlock your VETASSESS document workspace',
      'value_prop', 'Continue to have Imminash draft your employer references, build your VETASSESS document checklist, and walk you through submission.',
      'cta_label', 'Continue to payment'
    )
  ),
  eligibility_rules = jsonb_build_object(
    'paid_path_requires_any_of', jsonb_build_array(
      jsonb_build_object('field', 'experience', 'band_min', '3-5'),
      jsonb_build_object('field', 'australianExperience', 'band_min', '1-3')
    ),
    'else_action', 'calendly'
  )
where body_name = 'VETASSESS';

update public.assessing_body_requirements
set
  ui_config = jsonb_build_object(
    'pathway_label', 'Competency Demonstration Report',
    'sidebar_layout', 'chat-only',
    'primary_document_types', jsonb_build_array(
      'cdr_career_episode', 'cdr_summary_statement', 'cpd_log'
    ),
    'paywall', jsonb_build_object(
      'title', 'Unlock your CDR workspace',
      'value_prop', 'Continue to have Imminash draft your Career Episodes, Summary Statement, and CPD log for Engineers Australia.',
      'cta_label', 'Continue to payment'
    )
  ),
  eligibility_rules = jsonb_build_object(
    'paid_path_requires_any_of', jsonb_build_array(
      jsonb_build_object('field', 'experience', 'band_min', '3-5'),
      jsonb_build_object('field', 'australianExperience', 'band_min', '1-3')
    ),
    'else_action', 'calendly'
  )
where body_name = 'Engineers Australia';

update public.assessing_body_requirements
set
  ui_config = jsonb_build_object(
    'pathway_label', 'Trades Recognition',
    'sidebar_layout', 'chat-only',
    'primary_document_types', jsonb_build_array(
      'employment_reference', 'qualifications_statement', 'portfolio'
    ),
    'paywall', jsonb_build_object(
      'title', 'Unlock your TRA workspace',
      'value_prop', 'Continue to have Imminash draft your employer references and build your TRA document checklist.',
      'cta_label', 'Continue to payment'
    )
  ),
  eligibility_rules = jsonb_build_object(
    'paid_path_requires_any_of', jsonb_build_array(
      jsonb_build_object('field', 'experience', 'band_min', '3-5'),
      jsonb_build_object('field', 'australianExperience', 'band_min', '1-3')
    ),
    'else_action', 'calendly'
  )
where body_name = 'TRA';
