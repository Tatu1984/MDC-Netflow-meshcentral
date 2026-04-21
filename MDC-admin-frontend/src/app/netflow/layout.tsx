import Link from "next/link";

export const dynamic = "force-dynamic";

const TABS: { href: string; label: string }[] = [
  { href: "/netflow",            label: "Overview" },
  { href: "/netflow/physical",   label: "Physical" },
  { href: "/netflow/exporters",  label: "Exporters" },
  { href: "/netflow/collectors", label: "Collectors" },
];

export default function NetflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">NetFlow · Admin</h1>
        <nav className="flex gap-4 text-sm border-b" data-testid="netflow-tabs">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="py-2 hover:text-primary hover:underline">{t.label}</Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
