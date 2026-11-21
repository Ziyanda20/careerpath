"use client";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(form.email, form.password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex bg-white">
      {/* Hero panel */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden bg-[var(--green-900)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <Link href="/" className="relative font-display text-white text-lg font-bold tracking-tight">
          CareerPath SA
        </Link>

        <div className="relative">
          <h1 className="font-display text-white text-[2.75rem] leading-[1.08] font-bold max-w-md">
            Find every course your results qualify you for.
          </h1>
          <p className="text-[var(--green-100)] text-base mt-5 max-w-sm leading-relaxed">
            Upload a photo of your report card. We read it automatically, calculate your APS,
            and show you every university and TVET course you qualify for.
          </p>
          <div className="flex flex-wrap gap-2 mt-8">
            {["AI-Powered OCR", "500+ Courses", "9 Languages"].map((t) => (
              <span key={t} className="text-xs font-medium text-white/90 bg-white/10 border border-white/15 rounded-full px-3 py-1.5">
                {t}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-[var(--green-100)]/70 text-xs">
          Built for South African learners — universities and TVET colleges nationwide.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-10 font-display text-[var(--green-800)] text-lg font-bold">CareerPath SA</div>

          <h2 className="font-display text-2xl font-bold text-[var(--ink)]">Welcome back</h2>
          <p className="text-[var(--ink-60)] text-sm mt-1.5 mb-8">Log in to see your course matches.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">Email address</label>
              <input className="input-field" type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">Password</label>
              <input className="input-field" type="password" placeholder="Your password" value={form.password} onChange={set("password")} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-60">
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--ink-60)] mt-7">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[var(--green-700)] font-semibold">Register free</Link>
          </p>
        </div>
      </div>
    </main>
  );
}