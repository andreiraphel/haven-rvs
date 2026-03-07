"use client";
import { useState } from "react";
import Topbar from "@/components/layout/Topbar";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <>
      <Topbar />
      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="mb-7">
          <h2 className="font-sora font-bold text-2xl text-ink">Contact Us</h2>
          <p className="text-[var(--ink-lt)] text-sm mt-1">
            We welcome comments, suggestions, and collaboration inquiries
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact cards */}
          <div className="space-y-4">
            {[
              { icon: "✉️", label: "Personal Email", value: "gumiajoshua@gmail.com", desc: "Direct contact with the researcher for academic inquiries and thesis-related questions." },
              { icon: "🏛️", label: "Project Email",  value: "haven-rvs@gmail.com",  desc: "Official HAVEN-RVS email for system feedback, bug reports, and feature suggestions." },
            ].map(c => (
              <div key={c.label} className="card p-6 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--risk-low-bg)] flex items-center justify-center text-2xl flex-shrink-0">
                  {c.icon}
                </div>
                <div>
                  <div className="label-sm mb-1">{c.label}</div>
                  <a href={`mailto:${c.value}`} className="text-teal font-medium text-sm hover:underline">{c.value}</a>
                  <p className="text-xs text-[var(--ink-lt)] mt-1.5 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}

            <div className="card p-6">
              <div className="text-2xl mb-3">🏛️</div>
              <h4 className="font-sora font-semibold text-ink mb-2">About this Research</h4>
              <p className="text-sm text-[var(--ink-lt)] leading-relaxed">
                HAVEN-RVS is the research output of Engr. Joshua M. Gumia, in fulfillment of his Master&apos;s Thesis
                at Universiti Teknologi PETRONAS, Perak, Malaysia under the supervision of AP IR Dr. Bashar S. Mohammed.
              </p>
            </div>
          </div>

          {/* Message form */}
          <div className="card p-8">
            <h3 className="font-sora font-bold text-lg text-ink mb-5">Send a Message</h3>
            {sent ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <h4 className="font-sora font-bold text-lg text-ink mb-2">Message sent!</h4>
                <p className="text-sm text-[var(--ink-lt)] mb-6">Thank you for reaching out. We&apos;ll respond as soon as possible.</p>
                <button onClick={() => setSent(false)} className="btn-secondary">Send another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-sm block mb-2">Your Name</label>
                  <input
                    required className="input-field"
                    placeholder="Juan dela Cruz"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label-sm block mb-2">Email</label>
                  <input
                    type="email" required className="input-field"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label-sm block mb-2">Message</label>
                  <textarea
                    required
                    className="input-field resize-none"
                    rows={5}
                    placeholder="Your feedback or question…"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn-primary">Send Message →</button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
