"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Proactive check: if already logged in, skip this page
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session) {
        router.replace("/dashboard");
      }
    }
    checkUser();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const sb = getSupabase();
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to initialize Supabase");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      
      {/* Hero panel */}
      <div
        className="relative hidden md:flex flex-col justify-center items-start px-14 py-16 overflow-hidden"
        style={{ background: "linear-gradient(160deg,#3D2B1F 0%,#8C3A1A 55%,#B5552A 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="flex flex-col items-center justify-center text-center w-full relative z-10">
          <h1 className="font-sora font-extrabold text-4xl text-white leading-tight mb-5 opacity-0 animate-slide-up">
            Heritage And Ancestral Houses Visual
            Evaluation Network - Rapid Visual Screening<br />
            <span className="text-clay">(HAVEN-RVS)</span>
          </h1>

          <p className="text-white/70 text-[15px] leading-relaxed max-w-sm mb-8 opacity-0 animate-slide-up delay-100">
            A specialized rapid visual screening tool for heritage and ancestral houses of the Philippines.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-auto opacity-0 animate-slide-up delay-200">
            {["📍 Philippines", "🔬 Research-Grade", "🤖 AI-Powered", "📊 Risk Analytics"].map(t => (
              <span
                key={t}
                className="bg-white/10 border border-white/15 text-white/90 text-xs px-3 py-1.5 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-14 flex gap-3 z-10 opacity-0 animate-fade-in delay-300">
          <Link
            href="/about"
            className="border border-white/30 text-white/80 text-sm px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="border border-white/30 text-white/80 text-sm px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>

      {/* Form panel */}
      <div 
        className="flex flex-col justify-center items-center px-8 md:px-16 py-16 relative overflow-hidden"
        style={{ 
          backgroundImage: 'url("/heritage-house.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Semi-transparent overlay to help with readability if needed */}
        <div className="absolute inset-0 bg-bark/10 backdrop-brightness-95" />

        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm p-10 rounded-3xl border border-white/30 shadow-2xl relative z-10 opacity-0 animate-slide-up delay-100">
          <h2 className="font-sora font-bold text-3xl text-white mb-2 text-center md:text-left">Welcome back</h2>
          <p className="text-white/70 text-sm mb-8 text-center md:text-left">Sign in to your HAVEN-RVS account</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="opacity-0 animate-slide-up delay-200">
              <label className="label-sm block mb-2 text-white/90">Email Address</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field bg-white/50 backdrop-blur-sm border-white/40 focus:bg-white/90"
                placeholder="evaluator@example.com"
              />
            </div>
            <div className="opacity-0 animate-slide-up delay-300">
              <label className="label-sm block mb-2 text-white/90">Password</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field bg-white/50 backdrop-blur-sm border-white/40 focus:bg-white/90" 
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-white text-sm bg-risk-high/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10 animate-fade-in">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base mt-2 shadow-xl opacity-0 animate-slide-up delay-400">
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm text-white/60 mt-8 opacity-0 animate-fade-in delay-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-clay font-bold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
