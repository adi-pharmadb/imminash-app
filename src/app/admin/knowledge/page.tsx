"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface OccupationEntry {
  anzsco_code: string;
  title: string;
  has_knowledge: boolean;
}

/**
 * Admin knowledge base list view.
 * Protected by Supabase auth + admin role check (via API).
 * Shows all occupations with search/filter and knowledge status indicators.
 */
export default function AdminKnowledgePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<"checking" | "unauthorized" | "forbidden" | "authorized">("checking");
  const [occupations, setOccupations] = useState<OccupationEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function checkAuthAndFetch() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setAuthState("unauthorized");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/knowledge");
        if (res.status === 401) {
          setAuthState("unauthorized");
          setLoading(false);
          return;
        }
        if (res.status === 403) {
          setAuthState("forbidden");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setAuthState("forbidden");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setOccupations(data.occupations ?? []);
        setAuthState("authorized");
      } catch {
        setAuthState("forbidden");
      }
      setLoading(false);
    }

    checkAuthAndFetch();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (authState === "unauthorized") {
    // Redirect to login
    router.push("/auth");
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  if (authState === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You do not have permission to access the admin panel. Contact the administrator for access.
          </p>
        </div>
      </div>
    );
  }

  const filtered = occupations.filter((occ) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      occ.title.toLowerCase().includes(q) ||
      occ.anzsco_code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto w-full max-w-3xl px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5" style={{ color: "var(--primary)" }} />
            <h1 className="font-display text-xl text-foreground">Agent Knowledge Base</h1>
          </div>
          <span className="text-xs text-muted-foreground">
            {occupations.filter((o) => o.has_knowledge).length}/{occupations.length} enriched
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 space-y-4 pb-12">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or ANZSCO code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
            data-testid="knowledge-search"
          />
        </div>

        {/* Occupation list */}
        <div className="space-y-1" data-testid="occupation-list">
          {filtered.map((occ) => (
            <button
              key={occ.anzsco_code}
              onClick={() => router.push(`/admin/knowledge/${occ.anzsco_code}`)}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/5"
              style={{
                border: "1px solid oklch(0.25 0.015 260 / 0.4)",
              }}
              data-testid={`occ-row-${occ.anzsco_code}`}
            >
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: occ.has_knowledge
                    ? "var(--success)"
                    : "oklch(0.35 0.015 260)",
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {occ.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  ANZSCO {occ.anzsco_code}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No occupations match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
