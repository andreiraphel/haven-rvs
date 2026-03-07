"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";

const NAV = [
  { label: "Dashboard",    href: "/dashboard" },
  { label: "Risk Summary", href: "/risk-summary" },
  { label: "Map View",     href: "/map" },
  { label: "About",        href: "/about" },
  { label: "Contact",      href: "/contact" },
];

export default function Topbar() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const sb = getSupabase();
    await sb.auth.signOut();
    router.push("/login");
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[var(--border)] shadow-sm">
      <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-gradient-to-br from-terracotta to-sienna text-white text-xs font-bold font-sora px-2.5 py-1 rounded-md tracking-wide">
            HAVEN
          </span>
          <span className="text-sm font-semibold text-[var(--ink-lt)] font-sora">RVS</span>
        </Link>

        {/* Nav */}
        <nav className="flex gap-1 flex-1">
          {user && NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                path === n.href
                  ? "bg-sand text-terracotta font-semibold"
                  : "text-[var(--ink-lt)] hover:bg-sand hover:text-bark"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 border-l border-[var(--border)] pl-4 ml-2">
              <Link href="/questionnaire" className="btn-primary text-xs px-4 py-2 mr-2">
                + New Assessment
              </Link>
              <div className="hidden lg:flex flex-col items-end mr-2">
                <span className="text-[10px] uppercase font-bold text-[var(--ink-lt)] opacity-60">Evaluator</span>
                <span className="text-xs font-semibold text-ink">{user.email}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-terracotta to-sienna text-white text-sm font-bold font-sora flex items-center justify-center shadow-sm">
                {initial}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-[var(--ink-lt)] hover:text-risk-high hover:bg-red-50 transition-all"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-xs px-5 py-2">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
