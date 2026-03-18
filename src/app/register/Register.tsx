"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setError(""); setSuccess(""); setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { 
          data: { first_name: form.firstName, last_name: form.lastName },
          emailRedirectTo: `${window.location.origin}/dashboard`
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.user && !data.session) {
        setSuccess("Account created! Please check your email to confirm your registration.");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div
        className="relative hidden md:flex flex-col justify-center items-start px-14 py-16 overflow-hidden"
        style={{ background: "linear-gradient(160deg,#3D2B1F 0%,#8C3A1A 55%,#B5552A 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")` }}
        />
        <h1 className="font-sora font-extrabold text-4xl text-white leading-tight mb-5 relative z-10">
          Join the <span className="text-clay">Network</span>
        </h1>
        <p className="text-white/70 text-[15px] leading-relaxed max-w-sm relative z-10">
          Register as a heritage evaluator and contribute to the preservation of ancestral houses across the Philippines.
        </p>
      </div>
      <div className="flex flex-col justify-center items-center bg-white px-8 md:px-16 py-16">
        <div className="w-full max-w-sm">
          <h2 className="font-sora font-bold text-3xl text-ink mb-2">Create account</h2>
          <p className="text-[var(--ink-lt)] text-sm mb-8">Join HAVEN-RVS as an evaluator</p>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-sm block mb-2">First Name</label>
                <input className="input-field" placeholder="Juan" required value={form.firstName} onChange={set("firstName")} />
              </div>
              <div>
                <label className="label-sm block mb-2">Last Name</label>
                <input className="input-field" placeholder="dela Cruz" required value={form.lastName} onChange={set("lastName")} />
              </div>
            </div>
            <div>
              <label className="label-sm block mb-2">Email Address</label>
              <input type="email" className="input-field" placeholder="you@example.com" required value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className="label-sm block mb-2">Password</label>
              <input type="password" className="input-field" placeholder="Min. 8 characters" required value={form.password} onChange={set("password")} />
            </div>
            <div>
              <label className="label-sm block mb-2">Confirm Password</label>
              <input type="password" className="input-field" placeholder="Repeat password" required value={form.confirm} onChange={set("confirm")} />
            </div>
            {error && <p className="text-[var(--risk-high)] text-sm bg-[var(--risk-high-bg)] px-3 py-2 rounded-lg">{error}</p>}
            {success && <p className="text-[var(--risk-low)] text-sm bg-[var(--risk-low-bg)] px-3 py-2 rounded-lg">{success}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Creating…" : "Create Account →"}
            </button>
          </form>
          <p className="text-center text-sm text-[var(--ink-lt)] mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-terracotta font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
