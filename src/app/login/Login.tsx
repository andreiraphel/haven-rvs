"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else router.push("/dashboard");
    setLoading(false);
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Hero panel */}
      <div
        className="relative hidden md:flex flex-col justify-center items-start px-14 py-16 overflow-hidden"
        style={{ background: "linear-gradient(160deg,#3D2B1F 0%,#8C3A1A 55%,#B5552A 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")` }}
        />
        <div className="flex items-center gap-3 mb-12 relative z-10">
          <span className="bg-white/20 text-white text-xs font-bold font-sora px-3 py-1.5 rounded-lg tracking-wider">
            HAVEN-RVS
          </span>
        </div>
        <h1 className="font-sora font-extrabold text-4xl text-white leading-tight mb-5 relative z-10">
          Preserving <span className="text-clay">Heritage</span>,<br />Assessing Risk
        </h1>
        <p className="text-white/70 text-[15px] leading-relaxed max-w-sm relative z-10 mb-8">
          A specialized rapid visual screening tool for heritage and ancestral houses of the Philippines.
        </p>
        <div className="flex flex-wrap gap-2 relative z-10 mb-auto">
          {["📍 Philippines", "🔬 Research-Grade", "🤖 AI-Powered", "📊 Risk Analytics"].map(t => (
            <span key={t} className="bg-white/10 border border-white/15 text-white/90 text-xs px-3 py-1.5 rounded-full">{t}</span>
          ))}
        </div>
        <div className="absolute bottom-8 left-14 flex gap-3 z-10">
          <Link href="/about" className="border border-white/30 text-white/80 text-sm px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors">About</Link>
          <Link href="/contact" className="border border-white/30 text-white/80 text-sm px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors">Contact Us</Link>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center items-center bg-white px-8 md:px-16 py-16">
        <div className="w-full max-w-sm">
          <h2 className="font-sora font-bold text-3xl text-ink mb-2">Welcome back</h2>
          <p className="text-[var(--ink-lt)] text-sm mb-8">Sign in to your HAVEN-RVS account</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label-sm block mb-2">Email Address</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="evaluator@example.com"
              />
            </div>
            <div>
              <label className="label-sm block mb-2">Password</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="••••••••"
              />
            </div>
            {error && <p className="text-[var(--risk-high)] text-sm bg-[var(--risk-high-bg)] px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--ink-lt)] mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-terracotta font-semibold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
