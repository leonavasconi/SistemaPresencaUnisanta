export function PageBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(41,22,111,0.10),transparent),radial-gradient(ellipse_60%_50%_at_100%_110%,rgba(218,37,28,0.08),transparent)]" />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
