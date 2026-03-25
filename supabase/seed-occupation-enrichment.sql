-- Seed: Occupation enrichment data from ANZSCO 1220.0 First Edition Rev 1
-- Populates qualification_level_required, unit_group_description, and industry_keywords
-- for occupations based on their ANZSCO unit group (first 4 digits of anzsco_code).
--
-- Uses ON CONFLICT for idempotent execution.
-- Run after occupations have been seeded.

-- ANZSCO Skill Level mappings:
-- Skill Level 1: Bachelor degree or higher
-- Skill Level 2: AQF Associate Degree, Advanced Diploma or Diploma
-- Skill Level 3: AQF Certificate IV or Certificate III (at least 2 years)
-- Skill Level 4: AQF Certificate II or III
-- Skill Level 5: AQF Certificate I or secondary education

-- Unit Group 1211: Aquaculture Farmers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Aquaculture Farmers plan, organise and perform farming operations to breed and raise fish, crustaceans, molluscs and other aquatic stock for harvest.',
  industry_keywords = ARRAY['aquaculture', 'fish farming', 'marine', 'breeding', 'harvesting', 'hatchery']
WHERE substring(anzsco_code from 1 for 4) = '1211';

-- Unit Group 1212: Crop Farmers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Crop Farmers plan, organise and perform farming operations to grow and harvest crops including cotton, flowers, fruit, grain, grapes, sugar cane and vegetables.',
  industry_keywords = ARRAY['agriculture', 'crop farming', 'horticulture', 'grain', 'fruit', 'vegetable', 'harvesting']
WHERE substring(anzsco_code from 1 for 4) = '1212';

-- Unit Group 1213: Livestock Farmers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Livestock Farmers plan, organise and perform farming operations to breed and raise livestock including cattle, sheep, pigs, goats, deer and horses.',
  industry_keywords = ARRAY['livestock', 'cattle', 'sheep', 'dairy', 'animal husbandry', 'farming']
WHERE substring(anzsco_code from 1 for 4) = '1213';

-- Unit Group 1214: Mixed Crop and Livestock Farmers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Mixed Crop and Livestock Farmers plan, organise and perform farming operations to grow crops and breed and raise livestock.',
  industry_keywords = ARRAY['mixed farming', 'agriculture', 'crop', 'livestock', 'diversified farming']
WHERE substring(anzsco_code from 1 for 4) = '1214';

-- Unit Group 1311: Advertising, Public Relations and Sales Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Advertising, Public Relations and Sales Managers plan, organise, direct, control and coordinate advertising, public relations, sales and marketing activities within organisations.',
  industry_keywords = ARRAY['advertising', 'public relations', 'sales', 'marketing', 'media', 'campaigns', 'brand management']
WHERE substring(anzsco_code from 1 for 4) = '1311';

-- Unit Group 1321: Corporate Services Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Corporate Services Managers plan, organise, direct, control and coordinate the overall administration of an organisation.',
  industry_keywords = ARRAY['corporate services', 'administration', 'management', 'governance', 'operations']
WHERE substring(anzsco_code from 1 for 4) = '1321';

-- Unit Group 1322: Finance Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Finance Managers plan, organise, direct, control and coordinate the financial and accounting activities within an organisation.',
  industry_keywords = ARRAY['finance', 'accounting', 'financial management', 'budgeting', 'treasury', 'financial planning']
WHERE substring(anzsco_code from 1 for 4) = '1322';

-- Unit Group 1323: Human Resource Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Human Resource Managers plan, organise, direct, control and coordinate the human resource and workplace relations activities within an organisation.',
  industry_keywords = ARRAY['human resources', 'HR', 'recruitment', 'workplace relations', 'talent management', 'employee relations']
WHERE substring(anzsco_code from 1 for 4) = '1323';

-- Unit Group 1324: Policy and Planning Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Policy and Planning Managers plan, organise, direct, control and coordinate policy advice and strategic planning within organisations.',
  industry_keywords = ARRAY['policy', 'strategic planning', 'governance', 'public policy', 'planning']
WHERE substring(anzsco_code from 1 for 4) = '1324';

-- Unit Group 1325: Research and Development Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Research and Development Managers plan, organise, direct, control and coordinate research and development activities within organisations.',
  industry_keywords = ARRAY['research', 'development', 'R&D', 'innovation', 'product development']
WHERE substring(anzsco_code from 1 for 4) = '1325';

-- Unit Group 1331: Construction Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Construction Managers plan, organise, direct, control and coordinate construction of civil engineering, building and other construction projects.',
  industry_keywords = ARRAY['construction', 'project management', 'building', 'civil engineering', 'site management']
WHERE substring(anzsco_code from 1 for 4) = '1331';

-- Unit Group 1332: Engineering Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Engineering Managers plan, organise, direct, control and coordinate engineering and technical activities within organisations.',
  industry_keywords = ARRAY['engineering', 'technical management', 'manufacturing', 'production engineering']
WHERE substring(anzsco_code from 1 for 4) = '1332';

-- Unit Group 1334: Manufacturing Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Manufacturing Managers plan, organise, direct, control and coordinate production in manufacturing operations.',
  industry_keywords = ARRAY['manufacturing', 'production', 'factory management', 'operations', 'quality control']
WHERE substring(anzsco_code from 1 for 4) = '1334';

-- Unit Group 1335: Production Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Production Managers plan, organise, direct, control and coordinate production activities including mining, forestry and agriculture production.',
  industry_keywords = ARRAY['production', 'mining', 'forestry', 'agriculture', 'resource management']
WHERE substring(anzsco_code from 1 for 4) = '1335';

-- Unit Group 1336: Supply and Distribution Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Supply and Distribution Managers plan, organise, direct, control and coordinate the supply, storage and distribution of goods.',
  industry_keywords = ARRAY['supply chain', 'distribution', 'logistics', 'warehousing', 'procurement', 'inventory']
WHERE substring(anzsco_code from 1 for 4) = '1336';

-- Unit Group 1341-1344: Education Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Education Managers plan, organise, direct, control and coordinate educational services within schools and educational institutions.',
  industry_keywords = ARRAY['education', 'school management', 'curriculum', 'academic', 'teaching administration']
WHERE substring(anzsco_code from 1 for 4) IN ('1341', '1342', '1343', '1344');

-- Unit Group 1351: ICT Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'ICT Managers plan, organise, direct, control and coordinate ICT strategies, operations and resources within organisations.',
  industry_keywords = ARRAY['ICT', 'information technology', 'IT management', 'technology strategy', 'digital transformation', 'software']
WHERE substring(anzsco_code from 1 for 4) = '1351';

-- Unit Group 1399: Other Specialist Managers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Other Specialist Managers plan, organise, direct, control and coordinate the operations of specialised units within organisations.',
  industry_keywords = ARRAY['specialist management', 'operations', 'quality management', 'environmental management']
WHERE substring(anzsco_code from 1 for 4) = '1399';

-- Unit Group 1411-1419: Accommodation and Hospitality Managers
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Accommodation and Hospitality Managers plan, organise, direct, control and coordinate the operations of accommodation and hospitality establishments.',
  industry_keywords = ARRAY['hospitality', 'accommodation', 'hotel management', 'restaurant', 'catering', 'tourism']
WHERE substring(anzsco_code from 1 for 4) IN ('1411', '1412', '1413', '1414', '1419');

-- Unit Group 1421: Retail Managers
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Retail Managers plan, organise, direct, control and coordinate the operations of retail establishments.',
  industry_keywords = ARRAY['retail', 'store management', 'merchandise', 'customer service', 'sales']
WHERE substring(anzsco_code from 1 for 4) = '1421';

-- Unit Groups 1491-1499: Other Managers
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Other Managers plan, organise, direct, control and coordinate the operations of various service-oriented establishments.',
  industry_keywords = ARRAY['management', 'operations', 'service management', 'business administration']
WHERE substring(anzsco_code from 1 for 4) IN ('1491', '1492', '1493', '1494', '1499');

-- Unit Group 2111: Accountants
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Accountants plan and provide systems and services relating to the financial dealings of organisations and individuals, and advise on associated record-keeping and compliance requirements.',
  industry_keywords = ARRAY['accounting', 'auditing', 'taxation', 'financial reporting', 'bookkeeping', 'CPA', 'chartered accountant']
WHERE substring(anzsco_code from 1 for 4) = '2111';

-- Unit Group 2112: Auditors, Company Secretaries and Corporate Treasurers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Auditors, Company Secretaries and Corporate Treasurers examine, verify and analyse records and financial affairs, manage corporate governance, and plan and direct treasury operations.',
  industry_keywords = ARRAY['auditing', 'corporate governance', 'treasury', 'compliance', 'financial analysis', 'company secretary']
WHERE substring(anzsco_code from 1 for 4) = '2112';

-- Unit Group 2113: Financial Dealers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Financial Dealers buy and sell financial products and services, advise on investment strategies, and manage financial risks.',
  industry_keywords = ARRAY['financial dealing', 'investment', 'trading', 'securities', 'financial markets', 'stockbroking']
WHERE substring(anzsco_code from 1 for 4) = '2113';

-- Unit Group 2121: Architects and Landscape Architects
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Architects and Landscape Architects design buildings and other structures, and plan and design external areas for functional, aesthetic and environmental purposes.',
  industry_keywords = ARRAY['architecture', 'landscape architecture', 'building design', 'urban design', 'planning', 'construction']
WHERE substring(anzsco_code from 1 for 4) = '2121';

-- Unit Group 2122-2124: Surveyors and Cartographers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Surveyors and Cartographers determine the exact position of features on the earths surface and in the air, underground and on the sea bed, and prepare maps and charts.',
  industry_keywords = ARRAY['surveying', 'cartography', 'mapping', 'geospatial', 'land surveying', 'GIS']
WHERE substring(anzsco_code from 1 for 4) IN ('2122', '2123', '2124');

-- Unit Group 2211: Actuaries, Mathematicians and Statisticians
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Actuaries, Mathematicians and Statisticians analyse data and apply mathematical, statistical and actuarial concepts and techniques to solve problems.',
  industry_keywords = ARRAY['actuarial', 'mathematics', 'statistics', 'data analysis', 'risk assessment', 'probability']
WHERE substring(anzsco_code from 1 for 4) = '2211';

-- Unit Group 2212: Agricultural Consultants and Scientists
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Agricultural Consultants and Scientists study commercial plants and animals, and develop procedures to improve the productivity and sustainability of agricultural systems.',
  industry_keywords = ARRAY['agricultural science', 'agronomy', 'soil science', 'crop science', 'livestock science', 'sustainable agriculture']
WHERE substring(anzsco_code from 1 for 4) = '2212';

-- Unit Group 2221: Chemists
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Chemists study the chemical and physical properties of substances and develop and monitor chemical processes and production.',
  industry_keywords = ARRAY['chemistry', 'chemical analysis', 'laboratory', 'pharmaceutical', 'materials science']
WHERE substring(anzsco_code from 1 for 4) = '2221';

-- Unit Group 2222-2223: Earth Scientists
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Earth Scientists study the composition, structure and other physical attributes of the earth, locate minerals and other resources, and advise on environmental issues.',
  industry_keywords = ARRAY['geology', 'geophysics', 'earth science', 'mining', 'environmental science', 'geochemistry']
WHERE substring(anzsco_code from 1 for 4) IN ('2222', '2223');

-- Unit Group 2231: Life Scientists
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Life Scientists study living organisms, their environment and the ways in which they interact, and apply this knowledge to a wide range of fields.',
  industry_keywords = ARRAY['biology', 'life science', 'biotechnology', 'microbiology', 'ecology', 'genetics', 'biochemistry']
WHERE substring(anzsco_code from 1 for 4) = '2231';

-- Unit Group 2232: Marine Scientists
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Marine Scientists study marine organisms, their behaviours and interactions with the environment, and the properties and processes of the ocean.',
  industry_keywords = ARRAY['marine science', 'oceanography', 'marine biology', 'aquatic science', 'fisheries science']
WHERE substring(anzsco_code from 1 for 4) = '2232';

-- Unit Group 2241: Environmental Scientists
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Environmental Scientists study, develop and advise on policies and plans for managing and protecting the environment and natural resources.',
  industry_keywords = ARRAY['environmental science', 'conservation', 'ecology', 'sustainability', 'environmental management', 'climate']
WHERE substring(anzsco_code from 1 for 4) = '2241';

-- Unit Group 2242-2249: Other Natural and Physical Science Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Natural and Physical Science Professionals apply scientific knowledge and techniques in areas including physics, food science, conservation and other specialised fields.',
  industry_keywords = ARRAY['physical science', 'food science', 'conservation', 'physics', 'materials science', 'laboratory']
WHERE substring(anzsco_code from 1 for 4) IN ('2242', '2243', '2244', '2245', '2246', '2247', '2249');

-- Unit Group 2251-2253: Medical and Health Sciences
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Medical and Health Science Professionals conduct research and provide medical and health science services in areas such as pharmacology, pathology and medical imaging.',
  industry_keywords = ARRAY['medical science', 'health science', 'pharmacology', 'pathology', 'medical research', 'clinical science']
WHERE substring(anzsco_code from 1 for 4) IN ('2251', '2252', '2253');

-- Unit Group 2311-2312: Air Transport Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Air Transport Professionals control aircraft, provide air traffic control services, and manage flight operations.',
  industry_keywords = ARRAY['aviation', 'pilot', 'air traffic control', 'flight operations', 'aerospace']
WHERE substring(anzsco_code from 1 for 4) IN ('2311', '2312');

-- Unit Group 2321-2326: Architects, Designers and Planners
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Designers, Planners and Urban Design Professionals design products, interiors, graphics and other visual displays, and plan urban and regional development.',
  industry_keywords = ARRAY['design', 'urban planning', 'interior design', 'graphic design', 'industrial design']
WHERE substring(anzsco_code from 1 for 4) IN ('2321', '2322', '2323', '2324', '2325', '2326');

-- Unit Group 2331-2339: Engineering Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Engineering Professionals apply engineering principles and techniques in the design, development, construction, maintenance and management of systems, structures and processes.',
  industry_keywords = ARRAY['engineering', 'civil engineering', 'mechanical engineering', 'electrical engineering', 'structural engineering', 'design', 'construction']
WHERE substring(anzsco_code from 1 for 4) IN ('2331', '2332', '2333', '2334', '2335', '2336', '2339');

-- Unit Group 2341-2349: ICT Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'ICT Professionals design, develop, implement, modify and maintain ICT systems, software and hardware to meet business and technical requirements.',
  industry_keywords = ARRAY['ICT', 'software development', 'systems analysis', 'database', 'network', 'cybersecurity', 'programming', 'cloud computing']
WHERE substring(anzsco_code from 1 for 4) IN ('2341', '2342', '2343', '2344', '2345', '2346', '2347', '2349');

-- Unit Group 2411-2415: Education Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Education Professionals teach and educate students at various levels of the education system, and develop curriculum and educational materials.',
  industry_keywords = ARRAY['education', 'teaching', 'curriculum', 'training', 'pedagogy', 'academic', 'early childhood']
WHERE substring(anzsco_code from 1 for 4) IN ('2411', '2412', '2413', '2414', '2415');

-- Unit Group 2421-2422: University and Vocational Education Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'University and Vocational Education Professionals teach and conduct research at tertiary level and train apprentices and others in vocational subjects.',
  industry_keywords = ARRAY['university', 'tertiary education', 'vocational training', 'research', 'lecturing', 'academic']
WHERE substring(anzsco_code from 1 for 4) IN ('2421', '2422');

-- Unit Group 2491-2493: Other Education Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Other Education Professionals provide specialist educational services including tutoring, special needs education, and education review.',
  industry_keywords = ARRAY['education', 'tutoring', 'special needs', 'education review', 'learning support']
WHERE substring(anzsco_code from 1 for 4) IN ('2491', '2492', '2493');

-- Unit Group 2511-2519: Health Diagnostic and Promotion Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Health Diagnostic and Promotion Professionals diagnose, treat and prevent human physical and mental disorders and injuries, and promote health and wellbeing.',
  industry_keywords = ARRAY['healthcare', 'nutrition', 'dietetics', 'occupational therapy', 'physiotherapy', 'health promotion']
WHERE substring(anzsco_code from 1 for 4) IN ('2511', '2512', '2513', '2514', '2515', '2519');

-- Unit Group 2521-2527: Health Therapy Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Health Therapy Professionals assess, diagnose and treat human disorders and injuries through the application of therapeutic techniques.',
  industry_keywords = ARRAY['therapy', 'physiotherapy', 'speech pathology', 'audiology', 'podiatry', 'chiropractic', 'osteopathy']
WHERE substring(anzsco_code from 1 for 4) IN ('2521', '2522', '2523', '2524', '2525', '2526', '2527');

-- Unit Group 2531-2539: Medical Practitioners
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Medical Practitioners diagnose, treat and prevent physical and mental illness, disease and injury, and prescribe and administer associated treatments.',
  industry_keywords = ARRAY['medicine', 'medical practice', 'general practice', 'specialist medicine', 'surgery', 'healthcare', 'clinical']
WHERE substring(anzsco_code from 1 for 4) IN ('2531', '2532', '2533', '2534', '2535', '2539');

-- Unit Group 2541-2544: Nursing and Midwifery Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Nursing and Midwifery Professionals provide nursing and midwifery care to patients in hospitals, aged care, community and other healthcare settings.',
  industry_keywords = ARRAY['nursing', 'midwifery', 'healthcare', 'patient care', 'clinical nursing', 'registered nurse']
WHERE substring(anzsco_code from 1 for 4) IN ('2541', '2542', '2543', '2544');

-- Unit Group 2611: ICT Business and Systems Analysts
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'ICT Business and Systems Analysts identify and communicate the requirements of business and information systems, and develop and implement solutions.',
  industry_keywords = ARRAY['business analysis', 'systems analysis', 'ICT consulting', 'requirements analysis', 'solution architecture', 'digital transformation']
WHERE substring(anzsco_code from 1 for 4) = '2611';

-- Unit Group 2612: Multimedia Specialists and Web Developers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Multimedia Specialists and Web Developers design, create and modify web pages, and design and develop digital animations, imaging and multimedia presentations.',
  industry_keywords = ARRAY['web development', 'multimedia', 'UX design', 'UI design', 'front-end development', 'digital media', 'animation']
WHERE substring(anzsco_code from 1 for 4) = '2612';

-- Unit Group 2613: Software and Applications Programmers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Software and Applications Programmers design, develop, test, maintain and document software programs and systems to meet business and technical requirements.',
  industry_keywords = ARRAY['software engineering', 'programming', 'application development', 'software architecture', 'full stack development', 'DevOps', 'cloud']
WHERE substring(anzsco_code from 1 for 4) = '2613';

-- Unit Group 2621: Database and Systems Administrators, and ICT Security Specialists
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Database and Systems Administrators plan, develop, maintain and administer database management systems and ICT security policies and procedures.',
  industry_keywords = ARRAY['database administration', 'systems administration', 'cybersecurity', 'ICT security', 'network security', 'data management']
WHERE substring(anzsco_code from 1 for 4) = '2621';

-- Unit Group 2631: Computer Network Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Computer Network Professionals design, develop, configure, maintain and manage computer networking and telecommunications infrastructure.',
  industry_keywords = ARRAY['networking', 'telecommunications', 'network engineering', 'infrastructure', 'cloud networking', 'network architecture']
WHERE substring(anzsco_code from 1 for 4) = '2631';

-- Unit Group 2632-2633: ICT Support and Test Engineers
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'ICT Support and Test Engineers install, maintain, troubleshoot and test ICT systems, equipment and related products.',
  industry_keywords = ARRAY['ICT support', 'testing', 'quality assurance', 'technical support', 'system testing', 'troubleshooting']
WHERE substring(anzsco_code from 1 for 4) IN ('2632', '2633');

-- Unit Group 2711: Barristers and Solicitors
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Barristers and Solicitors advise clients on legal matters, prepare legal documents, and represent clients before courts and tribunals.',
  industry_keywords = ARRAY['law', 'legal practice', 'litigation', 'advocacy', 'legal advice', 'court']
WHERE substring(anzsco_code from 1 for 4) = '2711';

-- Unit Group 2712-2713: Judicial and Legal Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Judicial and Legal Professionals preside over legal proceedings, interpret and apply the law, and provide specialist legal services.',
  industry_keywords = ARRAY['law', 'judiciary', 'legal services', 'compliance', 'regulation']
WHERE substring(anzsco_code from 1 for 4) IN ('2712', '2713');

-- Unit Group 2721-2726: Social and Welfare Professionals
UPDATE occupations SET
  qualification_level_required = 'Bachelor degree or higher',
  unit_group_description = 'Social and Welfare Professionals assess the social needs of individuals, families and groups, assist and empower people to develop their skills and access resources.',
  industry_keywords = ARRAY['social work', 'counselling', 'psychology', 'welfare', 'community services', 'mental health']
WHERE substring(anzsco_code from 1 for 4) IN ('2721', '2723', '2724', '2725', '2726');

-- Unit Group 3111: Agricultural Technicians
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Agricultural Technicians conduct tests, experiments and perform technical functions in support of agricultural scientists and farm managers.',
  industry_keywords = ARRAY['agricultural technology', 'farm technology', 'crop testing', 'soil testing', 'agricultural equipment']
WHERE substring(anzsco_code from 1 for 4) = '3111';

-- Unit Group 3112-3114: Medical and Science Technicians
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Medical and Science Technicians perform technical functions and tests in medical, scientific and laboratory settings.',
  industry_keywords = ARRAY['laboratory', 'medical technology', 'science technology', 'testing', 'diagnostics']
WHERE substring(anzsco_code from 1 for 4) IN ('3112', '3113', '3114');

-- Unit Group 3121-3129: Building and Engineering Technicians
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Building and Engineering Technicians perform technical functions in support of architects, engineers and surveyors in design, project management and construction.',
  industry_keywords = ARRAY['building technology', 'engineering technology', 'drafting', 'surveying', 'construction technology', 'CAD']
WHERE substring(anzsco_code from 1 for 4) IN ('3121', '3122', '3123', '3124', '3125', '3126', '3129');

-- Unit Group 3131-3132: ICT Support Technicians
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'ICT Support Technicians install, maintain and repair computer hardware, software and telecommunications systems.',
  industry_keywords = ARRAY['ICT support', 'computer repair', 'telecommunications', 'help desk', 'technical support', 'hardware']
WHERE substring(anzsco_code from 1 for 4) IN ('3131', '3132');

-- Unit Group 3211-3212: Automotive Trades Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Automotive Trades Workers maintain, diagnose faults, repair and overhaul motor vehicles and automotive components.',
  industry_keywords = ARRAY['automotive', 'mechanic', 'motor vehicle', 'diesel', 'auto electrical', 'vehicle repair']
WHERE substring(anzsco_code from 1 for 4) IN ('3211', '3212');

-- Unit Group 3221-3223: Fabrication Engineering Trades Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Fabrication Engineering Trades Workers cut, shape, join and finish metal and other materials to make or repair products and structures.',
  industry_keywords = ARRAY['fabrication', 'welding', 'metal work', 'boilermaking', 'sheet metal', 'engineering trades']
WHERE substring(anzsco_code from 1 for 4) IN ('3221', '3222', '3223');

-- Unit Group 3231-3234: Mechanical Engineering Trades Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Mechanical Engineering Trades Workers fit, assemble, manufacture, maintain and repair machinery, engines and other mechanical equipment.',
  industry_keywords = ARRAY['mechanical trades', 'fitting', 'machining', 'toolmaking', 'maintenance', 'mechanical engineering']
WHERE substring(anzsco_code from 1 for 4) IN ('3231', '3232', '3233', '3234');

-- Unit Group 3241-3243: Panelbeaters and Vehicle Painters
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Panelbeaters and Vehicle Painters repair damaged vehicle body panels, and apply paint finishes to vehicles and other surfaces.',
  industry_keywords = ARRAY['panelbeating', 'spray painting', 'vehicle body repair', 'automotive finishing']
WHERE substring(anzsco_code from 1 for 4) IN ('3241', '3242', '3243');

-- Unit Group 3311-3312: Bricklayers and Stonemasons
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Bricklayers and Stonemasons lay bricks, pre-cut stone and other masonry blocks to construct and repair walls, partitions, arches and other structures.',
  industry_keywords = ARRAY['bricklaying', 'stonemasonry', 'masonry', 'construction trades', 'building']
WHERE substring(anzsco_code from 1 for 4) IN ('3311', '3312');

-- Unit Group 3321-3322: Floor Finishers and Painters
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Floor Finishers and Painters apply paint, varnish and other finishes to buildings and structures, and lay floor tiles and coverings.',
  industry_keywords = ARRAY['painting', 'decorating', 'floor covering', 'tiling', 'finishing trades']
WHERE substring(anzsco_code from 1 for 4) IN ('3321', '3322');

-- Unit Group 3331-3334: Glaziers, Plasterers and Tilers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Glaziers, Plasterers and Tilers install glass, apply plaster and cement finishes, and lay wall and floor tiles.',
  industry_keywords = ARRAY['glazing', 'plastering', 'tiling', 'wall finishing', 'construction trades']
WHERE substring(anzsco_code from 1 for 4) IN ('3331', '3332', '3333', '3334');

-- Unit Group 3341: Plumbers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Plumbers install, maintain and repair pipes, fixtures and fittings of water, drainage, gas and other systems.',
  industry_keywords = ARRAY['plumbing', 'pipefitting', 'gas fitting', 'drainage', 'water systems', 'sanitary systems']
WHERE substring(anzsco_code from 1 for 4) = '3341';

-- Unit Group 3411: Electricians
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Electricians install, maintain, troubleshoot and repair electrical wiring, systems, equipment and fixtures.',
  industry_keywords = ARRAY['electrical', 'wiring', 'electrical systems', 'power', 'electrical installation', 'electrical maintenance']
WHERE substring(anzsco_code from 1 for 4) = '3411';

-- Unit Group 3421-3424: Electronics and Telecommunications Trades Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Electronics and Telecommunications Trades Workers install, maintain and repair electronic and telecommunications equipment and systems.',
  industry_keywords = ARRAY['electronics', 'telecommunications', 'electronic repair', 'communications', 'signal processing']
WHERE substring(anzsco_code from 1 for 4) IN ('3421', '3422', '3423', '3424');

-- Unit Group 3511-3514: Food Trades Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Food Trades Workers prepare and cook food, and make and decorate cakes, pastries, bread and confectionery.',
  industry_keywords = ARRAY['cooking', 'baking', 'butchery', 'pastry', 'food preparation', 'chef', 'culinary']
WHERE substring(anzsco_code from 1 for 4) IN ('3511', '3512', '3513', '3514');

-- Unit Group 3611-3627: Animal, Horticultural and Other Skilled Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Animal Attendants, Horticultural and Florist Workers care for animals, cultivate plants and gardens, and design and create floral arrangements.',
  industry_keywords = ARRAY['animal care', 'horticulture', 'veterinary nursing', 'floristry', 'gardening', 'landscaping']
WHERE substring(anzsco_code from 1 for 4) IN ('3611', '3613', '3621', '3622', '3623', '3624', '3625', '3627');

-- Unit Group 3911-3999: Other Technicians and Trades Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate III including at least 2 years on-the-job training',
  unit_group_description = 'Other Technicians and Trades Workers perform technical and trades functions in areas such as hairdressing, printing, textiles, woodworking and other specialist fields.',
  industry_keywords = ARRAY['trades', 'technical', 'hairdressing', 'printing', 'woodworking', 'upholstery', 'signwriting']
WHERE substring(anzsco_code from 1 for 4) IN ('3911', '3921', '3922', '3923', '3931', '3932', '3933', '3941', '3942', '3991', '3992', '3994', '3995', '3996', '3999');

-- Unit Group 4111-4117: Health and Welfare Support Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate II or III',
  unit_group_description = 'Health and Welfare Support Workers assist health professionals and support individuals with daily living activities, health care and social services.',
  industry_keywords = ARRAY['healthcare support', 'welfare', 'aged care', 'disability support', 'community services', 'dental assistance']
WHERE substring(anzsco_code from 1 for 4) IN ('4111', '4112', '4113', '4114', '4116', '4117');

-- Unit Group 4211: Carers and Aides
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate II or III',
  unit_group_description = 'Carers and Aides assist children, aged, disabled and other people with daily living activities and provide basic care.',
  industry_keywords = ARRAY['childcare', 'aged care', 'disability care', 'personal care', 'education aide']
WHERE substring(anzsco_code from 1 for 4) = '4211';

-- Unit Group 4314: Library Technicians
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Library Technicians assist Librarians in organising library resources, helping library users and maintaining library systems.',
  industry_keywords = ARRAY['library', 'information management', 'cataloguing', 'library systems']
WHERE substring(anzsco_code from 1 for 4) = '4314';

-- Unit Group 4412: Fire and Emergency Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate II or III',
  unit_group_description = 'Fire and Emergency Workers respond to fire and other emergency incidents, perform rescue operations and fire prevention activities.',
  industry_keywords = ARRAY['firefighting', 'emergency services', 'rescue', 'fire prevention', 'emergency response']
WHERE substring(anzsco_code from 1 for 4) = '4412';

-- Unit Group 4511-4518: Sports and Personal Service Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate II or III',
  unit_group_description = 'Sports and Personal Service Workers provide personal services including fitness instruction, beauty therapy, travel consulting and funeral services.',
  industry_keywords = ARRAY['fitness', 'personal training', 'beauty therapy', 'travel', 'hairdressing', 'personal service']
WHERE substring(anzsco_code from 1 for 4) IN ('4511', '4512', '4513', '4514', '4516', '4517', '4518');

-- Unit Group 4523-4524: Tourism and Hospitality Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate II or III',
  unit_group_description = 'Tourism and Hospitality Workers provide services in hotels, restaurants and other hospitality and tourism establishments.',
  industry_keywords = ARRAY['tourism', 'hospitality', 'hotel', 'bar service', 'restaurant service']
WHERE substring(anzsco_code from 1 for 4) IN ('4523', '4524');

-- Unit Group 5111: Contract, Program and Project Administrators
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Contract, Program and Project Administrators plan, organise and coordinate contracts, programs and projects on behalf of organisations.',
  industry_keywords = ARRAY['project management', 'contract administration', 'program management', 'coordination']
WHERE substring(anzsco_code from 1 for 4) = '5111';

-- Unit Group 5121: Office Managers and Practice Managers
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Office Managers and Practice Managers plan, organise, direct and coordinate the administrative activities of organisations and practices.',
  industry_keywords = ARRAY['office management', 'practice management', 'administration', 'operations']
WHERE substring(anzsco_code from 1 for 4) = '5121';

-- Unit Group 5212: Communication Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Communication Workers prepare, edit and present news and other information through print, electronic and broadcast media.',
  industry_keywords = ARRAY['media', 'journalism', 'communications', 'broadcasting', 'editing', 'public relations']
WHERE substring(anzsco_code from 1 for 4) = '5212';

-- Unit Group 5991-5999: Other Clerical and Administrative Workers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate II or III',
  unit_group_description = 'Clerical and Administrative Workers perform clerical, secretarial and other administrative tasks to support organisational operations.',
  industry_keywords = ARRAY['clerical', 'administration', 'data entry', 'office support', 'secretarial']
WHERE substring(anzsco_code from 1 for 4) IN ('5991', '5992', '5996', '5999');

-- Unit Group 6112: Sales Representatives
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate II or III',
  unit_group_description = 'Sales Representatives sell goods and services to retail, wholesale and other organisations on behalf of producers and wholesale distributors.',
  industry_keywords = ARRAY['sales', 'business development', 'account management', 'wholesale', 'commercial']
WHERE substring(anzsco_code from 1 for 4) = '6112';

-- Unit Group 6121: Real Estate Agents
UPDATE occupations SET
  qualification_level_required = 'AQF Associate Degree, Advanced Diploma or Diploma',
  unit_group_description = 'Real Estate Agents sell, lease and manage residential, commercial, rural and industrial property and businesses on behalf of clients.',
  industry_keywords = ARRAY['real estate', 'property management', 'property sales', 'leasing', 'commercial property']
WHERE substring(anzsco_code from 1 for 4) = '6121';

-- Unit Group 6392: Print Finishers
UPDATE occupations SET
  qualification_level_required = 'AQF Certificate II or III',
  unit_group_description = 'Print Finishers operate paper cutting, folding, collating and binding machines and equipment to finish printed products.',
  industry_keywords = ARRAY['printing', 'print finishing', 'binding', 'graphic production']
WHERE substring(anzsco_code from 1 for 4) = '6392';
