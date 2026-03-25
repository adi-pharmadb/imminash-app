-- Supabase SQL Seed File
-- This seeds the assessing_body_requirements table with the Big 4.
-- For occupations, state_nominations, and invitation_rounds, use the
-- TypeScript seed script (scripts/seed.ts) which parses CSV files.
--
-- Run with: npx supabase db reset (applies migrations + this seed)
-- Or for just the TS seed: npx tsx scripts/seed.ts

-- Assessing Body Requirements: ACS
insert into public.assessing_body_requirements (body_name, required_documents, duty_descriptors, qualification_requirements, experience_requirements, formatting_notes, conversation_template)
values (
  'ACS',
  '{"documents":[{"type":"Employment Reference","description":"Employer reference letter on company letterhead detailing ICT duties, dates, and hours","required":true},{"type":"CV/Resume","description":"Detailed CV showing employment history with ICT focus","required":true},{"type":"Statutory Declaration","description":"Statutory declaration for self-employment or where employer reference is unavailable","required":false},{"type":"RPL Report","description":"Recognition of Prior Learning report for applicants without ICT qualifications","required":false},{"type":"Qualification Documents","description":"Certified copies of degree certificates and transcripts","required":true}]}'::jsonb,
  '{"focus":"ICT-specific duties and responsibilities","categories":["Software development and programming","Systems analysis and design","Database administration and management","Network engineering and administration","ICT project management","ICT security and cyber security","Web development and multimedia","ICT support and testing"],"guidance":"Duties must clearly demonstrate ICT content at the nominated skill level. At least 65% of duties should be ICT-related."}'::jsonb,
  '{"pathways":[{"name":"ICT Major","description":"Bachelor or higher with ICT major","experience_required":"2 years closely related, or 4 years related"},{"name":"ICT Minor","description":"Bachelor or higher with ICT minor","experience_required":"5 years closely related, or 6 years related"},{"name":"Non-ICT Qualification","description":"Bachelor or higher in non-ICT field","experience_required":"6 years closely related work"},{"name":"No Qualification","description":"No tertiary qualification","experience_required":"8 years closely related work"}]}'::jsonb,
  '{"minimum_years":2,"closely_related":"Work must be closely related to the nominated ANZSCO occupation","recency":"Experience should be recent (within last 10 years)","deductions":"ACS may deduct years for qualification-experience alignment. Typical deduction: 2-4 years."}'::jsonb,
  'Employment references must be on company letterhead with ABN/ACN, include start and end dates (dd/mm/yyyy), hours per week, detailed duties list, and be signed by a direct supervisor or HR manager. Each role should have 6-8 ICT-specific duty statements.',
  '{"phases":[{"name":"Introduction","prompt":"Welcome and explain ACS process. Ask about ICT specialization."},{"name":"Employment History","prompt":"Gather employment role details."},{"name":"Duty Gathering","prompt":"Ask user to describe daily ICT tasks."},{"name":"Duty Alignment","prompt":"Rewrite duties to align with ANZSCO descriptors."},{"name":"Document Generation","prompt":"Generate reference letter, CV, statutory declarations."},{"name":"Review","prompt":"Present documents for review."}]}'::jsonb
)
on conflict (body_name) do update set
  required_documents = excluded.required_documents,
  duty_descriptors = excluded.duty_descriptors,
  qualification_requirements = excluded.qualification_requirements,
  experience_requirements = excluded.experience_requirements,
  formatting_notes = excluded.formatting_notes,
  conversation_template = excluded.conversation_template,
  updated_at = now();

-- Assessing Body Requirements: VETASSESS
insert into public.assessing_body_requirements (body_name, required_documents, duty_descriptors, qualification_requirements, experience_requirements, formatting_notes, conversation_template)
values (
  'VETASSESS',
  '{"documents":[{"type":"Employment Reference","description":"Employer reference letter detailing duties aligned to ANZSCO unit group descriptors","required":true},{"type":"CV/Resume","description":"Comprehensive CV showing employment history and qualifications","required":true},{"type":"Cover Letter","description":"Personal statement explaining alignment to nominated occupation","required":true},{"type":"Qualification Documents","description":"Certified copies of degree certificates, transcripts, and course syllabi","required":true}]}'::jsonb,
  '{"focus":"ANZSCO unit group aligned duties","categories":["Core tasks from ANZSCO unit group description","Supervisory or management responsibilities","Technical or professional competencies","Industry-specific knowledge application","Client or stakeholder engagement","Compliance and regulatory awareness"],"guidance":"VETASSESS assesses whether qualification and employment are highly relevant to the nominated ANZSCO occupation at the required skill level."}'::jsonb,
  '{"pathways":[{"name":"Qualification Match","description":"Qualification highly relevant to nominated occupation","experience_required":"1 year post-qualification"},{"name":"Qualification + Additional Experience","description":"Qualification relevant but not highly relevant","experience_required":"2-3 years post-qualification"}]}'::jsonb,
  '{"minimum_years":1,"skill_level_match":"Employment must be at the ANZSCO skill level","recency":"At least 1 year within the last 5 years","hours":"Minimum 20 hours per week"}'::jsonb,
  'Employment references should detail specific duties aligning with ANZSCO unit group description. Include exact dates, hours, and salary information. References must be on official letterhead and signed.',
  '{"phases":[{"name":"Introduction","prompt":"Welcome and explain VETASSESS process."},{"name":"Qualification Review","prompt":"Ask about qualifications and field of study."},{"name":"Employment History","prompt":"Gather employment details."},{"name":"Duty Gathering","prompt":"Ask about responsibilities aligned to ANZSCO."},{"name":"Duty Alignment","prompt":"Rewrite duties to ANZSCO unit group descriptors."},{"name":"Document Generation","prompt":"Generate reference, CV, cover letter."},{"name":"Review","prompt":"Present for review."}]}'::jsonb
)
on conflict (body_name) do update set
  required_documents = excluded.required_documents,
  duty_descriptors = excluded.duty_descriptors,
  qualification_requirements = excluded.qualification_requirements,
  experience_requirements = excluded.experience_requirements,
  formatting_notes = excluded.formatting_notes,
  conversation_template = excluded.conversation_template,
  updated_at = now();

-- Assessing Body Requirements: Engineers Australia
insert into public.assessing_body_requirements (body_name, required_documents, duty_descriptors, qualification_requirements, experience_requirements, formatting_notes, conversation_template)
values (
  'Engineers Australia',
  '{"documents":[{"type":"Competency Demonstration Report (CDR)","description":"Core document package including Career Episodes, Summary Statement, and CPD","required":true},{"type":"Career Episode 1","description":"Detailed narrative of an engineering project (1000-2500 words)","required":true},{"type":"Career Episode 2","description":"Second engineering project narrative","required":true},{"type":"Career Episode 3","description":"Third engineering project narrative","required":true},{"type":"Summary Statement","description":"Cross-reference mapping Career Episode paragraphs to competency elements","required":true},{"type":"CV/Resume","description":"Engineering-focused CV","required":true},{"type":"Continuing Professional Development (CPD)","description":"List of professional development activities","required":true}]}'::jsonb,
  '{"focus":"Engineering competency elements","categories":["Knowledge and Skill Base","Engineering Application Ability","Professional and Personal Attributes","Design and synthesis of engineering solutions","Project management and professional practice","Research and investigation"],"guidance":"Engineers Australia assesses competency against 16 elements grouped into 3 categories."}'::jsonb,
  '{"pathways":[{"name":"Washington Accord","description":"4-year engineering degree from Washington Accord signatory"},{"name":"Sydney Accord","description":"3-year engineering technology degree"},{"name":"Dublin Accord","description":"2-year engineering associate degree"},{"name":"Non-Accord","description":"Engineering degree from non-signatory institution"}]}'::jsonb,
  '{"minimum_episodes":3,"episode_requirements":"Each Career Episode must be 1000-2500 words","australian_episode":"At least one should cover Australian work if applicable","recency":"Within last 10 years preferred"}'::jsonb,
  'Career Episodes must use numbered paragraphs (e.g., CE1.1, CE1.2). Use first person. Each episode must describe YOUR personal engineering contribution. Summary Statement cross-references paragraph numbers to competency elements. Total CDR should not exceed 25 pages.',
  '{"phases":[{"name":"Introduction","prompt":"Welcome and explain CDR process."},{"name":"Career Episode Planning","prompt":"Identify 3 engineering projects."},{"name":"Career Episode 1 Drafting","prompt":"Guide Episode 1 writing."},{"name":"Career Episode 2 Drafting","prompt":"Guide Episode 2 writing."},{"name":"Career Episode 3 Drafting","prompt":"Guide Episode 3 writing."},{"name":"Summary Statement","prompt":"Generate cross-reference table."},{"name":"CV and CPD","prompt":"Generate CV and CPD list."},{"name":"Review","prompt":"Review all CDR documents."}]}'::jsonb
)
on conflict (body_name) do update set
  required_documents = excluded.required_documents,
  duty_descriptors = excluded.duty_descriptors,
  qualification_requirements = excluded.qualification_requirements,
  experience_requirements = excluded.experience_requirements,
  formatting_notes = excluded.formatting_notes,
  conversation_template = excluded.conversation_template,
  updated_at = now();

-- Assessing Body Requirements: TRA
insert into public.assessing_body_requirements (body_name, required_documents, duty_descriptors, qualification_requirements, experience_requirements, formatting_notes, conversation_template)
values (
  'TRA',
  '{"documents":[{"type":"Employment Reference","description":"Employer reference detailing trade-specific duties, tools used, and supervision level","required":true},{"type":"CV/Resume","description":"Trade-focused CV showing apprenticeship and employment history","required":true},{"type":"Trade Qualification Evidence","description":"Certified copies of trade certificates and licenses","required":true},{"type":"Statutory Declaration","description":"Statutory declaration for self-employment","required":false},{"type":"Photographic Evidence","description":"Photos of completed trade work for Technical Interview pathway","required":false}]}'::jsonb,
  '{"focus":"Trade-specific tasks, tools, materials, and techniques","categories":["Core trade tasks and operations","Tool and equipment operation and maintenance","Material selection and handling","Safety procedures and compliance","Quality control and inspection","Workplace communication and documentation","Supervision and training of junior workers"],"guidance":"TRA assesses trade skills through documentation review and may require a Job Ready Program. Duties must demonstrate hands-on trade work at journeyman level."}'::jsonb,
  '{"pathways":[{"name":"Offshore Skills Assessment","description":"For applicants with overseas trade qualifications"},{"name":"Job Ready Program (JRP)","description":"Onshore program with workplace assessment","stages":["Job Ready Employment (JRE)","Job Ready Workplace Assessment (JRWA)","Job Ready Final Assessment (JRFA)"]}]}'::jsonb,
  '{"minimum_years":3,"trade_qualification":"Must have completed apprenticeship or equivalent to Australian Certificate III","practical_hours":"Minimum 1,080 hours for JRP","recency":"Recent trade work preferred"}'::jsonb,
  'Employment references must detail specific trade tasks, tools and equipment used, materials worked with, and supervision level. Include trade license or certificate number where applicable.',
  '{"phases":[{"name":"Introduction","prompt":"Welcome and explain TRA process."},{"name":"Trade Qualification","prompt":"Gather trade qualification details."},{"name":"Employment History","prompt":"Collect trade employment details."},{"name":"Trade Duty Gathering","prompt":"Ask about specific trade tasks and tools."},{"name":"Duty Alignment","prompt":"Align duties to ANZSCO trade descriptors."},{"name":"Document Generation","prompt":"Generate reference, CV, declarations."},{"name":"Review","prompt":"Present for review."}]}'::jsonb
)
on conflict (body_name) do update set
  required_documents = excluded.required_documents,
  duty_descriptors = excluded.duty_descriptors,
  qualification_requirements = excluded.qualification_requirements,
  experience_requirements = excluded.experience_requirements,
  formatting_notes = excluded.formatting_notes,
  conversation_template = excluded.conversation_template,
  updated_at = now();
