## UI component best practices

- **Single Responsibility**: Each component should have one clear purpose and do it well
- **Reusability**: Design components to be reused across different contexts with configurable props
- **Composability**: Build complex UIs by combining smaller, simpler components rather than monolithic structures
- **Clear Interface**: Define explicit, well-documented props with sensible defaults for ease of use
- **Encapsulation**: Keep internal implementation details private and expose only necessary APIs
- **Consistent Naming**: Use clear, descriptive names that indicate the component's purpose and follow team conventions
- **State Management**: Keep state as local as possible; lift it up only when needed by multiple components
- **Minimal Props**: Keep the number of props manageable; if a component needs many props, consider composition or splitting it
- **Documentation**: Document component usage, props, and provide examples for easier adoption by team members

---

## Components vs Sections Architecture

A clear distinction must be made between **components** and **sections** to maintain a clean, scalable codebase.

### Components (Reusable UI Primitives)

Components are **reusable building blocks** that can be used across multiple pages and contexts. They should:

- Accept props for customization (variants, content, styling)
- Be context-agnostic (no page-specific logic)
- Be small, focused, and composable

**Examples:**
- `Breadcrumb.astro` - navigation trail with configurable items
- `FAQ.astro` - question/answer list with variant prop (accordion vs simple)
- `CTA.astro` - call-to-action block with title, description, button props
- `IconCard.astro` - card with icon, title, description
- `TwoColumnCompare.astro` - side-by-side comparison layout

**Location:** `src/components/ui/`

### Sections (Page-Specific Compositions)

Sections are **page-specific compositions** that use components to build complete page regions. They:

- Compose multiple components together
- Contain page-specific logic and content
- Are typically used once per page type
- May include hardcoded content relevant only to that page

**Examples:**
- `AlternativesHero.astro` - hero section specific to /alternatives pages
- `GlossaryHero.astro` - hero section specific to /glossary pages
- `ComparisonTable.astro` - comparison table for alternatives pages
- `RelatedTerms.astro` - related terms list for glossary pages

**Location:** `src/components/[page-type]/` (e.g., `components/alternatives/`, `components/glossary/`)

### The Reusability Rule

**When something looks reusable, extract it into a component.**

Before creating a new section-level component, ask:
1. Is this pattern used on multiple pages?
2. Could it be used elsewhere with different content?
3. Is the structure generic enough to be reused?

If yes to any of these → create a **component** in `ui/`
If no to all → create a **section** in `[page-type]/`

### Folder Organization

```
src/components/
├── ui/                    # Reusable primitives
│   ├── Breadcrumb.astro
│   ├── FAQ.astro
│   ├── CTA.astro
│   ├── IconCard.astro
│   └── TwoColumnCompare.astro
├── layout/                # Layout elements (used on every page)
│   ├── Navbar.astro
│   └── Footer.astro
├── home/                  # Homepage-specific sections
│   ├── Hero.astro
│   └── FeatureBento.astro
├── alternatives/          # /alternatives page sections
│   ├── AlternativesHero.astro
│   └── ComparisonTable.astro
├── glossary/              # /glossary page sections
│   ├── GlossaryHero.astro
│   └── RelatedTerms.astro
└── use-cases/             # /use-cases page sections
    ├── UseCaseHero.astro
    └── UseCasePrompt.astro
```

### Anti-Patterns to Avoid

1. **Duplicating components across page folders** - If two pages need the same breadcrumb, create ONE component in `ui/`
2. **Creating page-specific versions of generic components** - Don't create `AlternativesFAQ.astro` when `FAQ.astro` with props works
3. **Putting reusable components in page folders** - If it's reusable, it belongs in `ui/`
4. **Over-abstracting sections** - Not everything needs to be a component; sections can be inline if truly unique

### Variant Props vs Separate Components

Prefer using **variant props** over creating multiple similar components:

```astro
<!-- GOOD: One component with variants -->
<FAQ items={items} variant="accordion" />
<FAQ items={items} variant="simple" />

<!-- BAD: Separate components for each variant -->
<AccordionFAQ items={items} />
<SimpleFAQ items={items} />
```
