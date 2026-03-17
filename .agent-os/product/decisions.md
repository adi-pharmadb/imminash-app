# Design Decisions

## 2026-03-18: Rebuild from Scratch

**Decision:** Rebuild Imminash from scratch rather than iterating on the Lovable-generated legacy codebase.

**Rationale:** The legacy codebase was built on Lovable with constraints (Lovable AI gateway, Supabase-only backend, single-page state machine architecture). The rebuild gives us full control over tech stack, AI model selection, backend architecture, and the ability to build toward the skill assessment document prep product (Phase 2) from day one.

**Legacy reference:** The legacy codebase at `/Users/adityadeshpande/Orgs/Imminash/Imminash-legacy` contains working implementations of points calculation, state nomination logic, occupation matching, and data files that should be referenced during rebuild.

## 2026-03-18: AI for Matching + Documents Only

**Decision:** Use AI only for occupation matching and document generation. All other logic (points, pathways, state eligibility) stays rule-based.

**Rationale:** Rule-based outputs are deterministic, auditable, and don't hallucinate. AI adds value where pattern matching and natural language generation are needed. This split was validated in the legacy tool and should carry forward.

## 2026-03-18: Phase 2 is the Revenue Product

**Decision:** Phase 1 (migration intelligence) is the free lead-gen funnel. Phase 2 (skill assessment document prep) is the paid product.

**Rationale:** From the call -- migration agents charge $1,200-$1,500 for skill assessment prep. ~50% of applicants use an agent. The document prep workflow is largely templated and automatable with AI. Pricing target: $200-$800 depending on package (AI-only vs AI + human review).

## 2026-03-18: Human-in-the-Loop Positioning

**Decision:** Position the product as "AI-powered, human-vetted" regardless of how much human review actually happens.

**Rationale:** From the call -- people pay migration agents for risk elimination. The perception of human oversight builds trust and justifies pricing above pure-AI alternatives. Copywriting should emphasize speed + human review, not cost savings.
