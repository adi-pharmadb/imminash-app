import { Search, BarChart3, TrendingUp, FileText } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Which occupation fits you?",
    description:
      "Tell us your job and qualifications. We will find the ANZSCO codes you actually qualify for.",
    delay: "delay-100" as const,
  },
  {
    icon: BarChart3,
    title: "What's your points score?",
    description:
      "Get an instant estimate across all 10 DHA categories. Know exactly where you stand.",
    delay: "delay-200" as const,
  },
  {
    icon: TrendingUp,
    title: "189, 190, or 491?",
    description:
      "See which visa subclass is your best shot, which states will nominate you, and what the gaps are.",
    delay: "delay-300" as const,
  },
  {
    icon: FileText,
    title: "Get your docs ready",
    description:
      "We will help you prepare your skill assessment application for ACS, VETASSESS, or Engineers Australia.",
    delay: "delay-400" as const,
  },
] as const;

export function FeatureCards() {
  return (
    <div
      className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-6 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="feature-cards"
    >
      {features.map((feature) => (
        <div
          key={feature.title}
          className={`animate-reveal-up ${feature.delay} glass-card group relative rounded-xl p-6 transition-all duration-300 hover:border-primary/20`}
          data-testid="feature-card"
        >
          {/* Top amber accent line */}
          <div className="absolute top-0 right-4 left-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Icon with amber glow background */}
          <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-primary/[0.07] ring-1 ring-primary/10 transition-all duration-300 group-hover:bg-primary/[0.12] group-hover:ring-primary/20">
            <feature.icon className="size-5 text-primary/80 transition-colors group-hover:text-primary" />
          </div>

          {/* Content */}
          <h3 className="mb-2 text-sm font-semibold tracking-tight text-foreground">
            {feature.title}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground/70">
            {feature.description}
          </p>

          {/* Subtle bottom border gradient on hover */}
          <div className="absolute right-4 bottom-0 left-4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      ))}
    </div>
  );
}
