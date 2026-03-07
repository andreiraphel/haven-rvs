"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
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
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                path === n.href
                  ? "bg-sand text-terracotta font-semibold"
                  : "text-[var(--ink-lt)] hover:bg-sand hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/questionnaire" className="btn-primary text-xs px-4 py-2">
            + New Assessment
          </Link>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-terracotta to-sienna text-white text-sm font-bold font-sora flex items-center justify-center hover:opacity-90 transition-opacity"
            title={`Sign out (${user?.email ?? "User"})`}
          >
            {initial}
          </button>
        </div>
      </div>
    </header>
  );
}
