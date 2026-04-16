/**
 * Skeleton shown while /chat server component resolves (auth + convo + docs).
 * Matches the three-panel layout so the transition feels continuous.
 */

export default function ChatLoading() {
  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background">
      <div className="h-14 shrink-0 border-b border-border/30 bg-background/80" />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-border/40 lg:block">
          <div className="flex h-full flex-col gap-3 p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-2 w-full animate-pulse rounded bg-muted" />
            <div className="mt-6 space-y-3">
              <div className="h-12 animate-pulse rounded-md bg-muted" />
              <div className="h-20 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 px-6 py-8">
            <div className="flex justify-start">
              <div className="h-16 w-[70%] max-w-md animate-pulse rounded-2xl bg-muted" />
            </div>
            <div className="flex justify-end">
              <div className="h-10 w-[45%] max-w-xs animate-pulse rounded-2xl bg-primary/15" />
            </div>
            <div className="flex justify-start">
              <div className="h-14 w-[60%] max-w-sm animate-pulse rounded-2xl bg-muted" />
            </div>
          </div>
          <div className="h-20 shrink-0 border-t border-border/30 p-4">
            <div className="mx-auto h-12 max-w-2xl animate-pulse rounded-xl bg-muted" />
          </div>
        </main>
        <aside className="hidden w-80 shrink-0 border-l border-border/40 lg:block">
          <div className="flex h-full flex-col gap-3 p-5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-24 animate-pulse rounded-md bg-muted" />
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          </div>
        </aside>
      </div>
    </div>
  );
}
