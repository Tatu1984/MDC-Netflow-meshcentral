import { Cloud } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 text-white hover:text-slate-300 transition-colors w-fit">
          <Cloud className="h-6 w-6 text-blue-500" />
          <span className="font-semibold">TS Edge Nest</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-slate-500 text-sm">
        <p>TS Edge Nest v1.0</p>
      </footer>
    </div>
  );
}
