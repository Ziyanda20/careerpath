"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

const COMMON_SUBJECTS = [
  "Mathematics", "English Home Language", "Afrikaans First Additional Language",
  "Physical Sciences", "Life Sciences", "Accounting",
  "Business Studies", "Economics", "Geography", "History", "Life Orientation",
];

export default function Grade11Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [terms, setTerms]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState("add");   // "add" | "progress" | "whatif"
  const [form, setForm]         = useState({ term: "1", year: new Date().getFullYear().toString(), subjects: {} });
  const [whatIf, setWhatIf]     = useState({ improvements: {} });
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [msg, setMsg]           = useState("");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading]);
  useEffect(() => { if (user) loadProgress(); }, [user]);

  async function loadProgress() {
    try { const d = await api.getProgress(); setTerms(d.terms || []); } catch {}
  }

  function setMark(subject, val) {
    setForm(f => ({ ...f, subjects: { ...f.subjects, [subject]: parseFloat(val) || 0 } }));
  }

  async function saveTerm() {
    setSaving(true); setMsg("");
    try {
      await api.saveTermResult({ term: parseInt(form.term), year: parseInt(form.year), subjects: form.subjects });
      setMsg("✅ Term result saved!");
      loadProgress();
    } catch (e) { setMsg("❌ " + e.message); }
    finally { setSaving(false); }
  }

  async function runWhatIf() {
    const latest = terms[terms.length - 1];
    if (!latest) return;
    try {
      const r = await api.whatIf({ subjects: latest.subjects, improvements: whatIf.improvements });
      setWhatIfResult(r);
    } catch (e) { setMsg("❌ " + e.message); }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Progress tracker 📈</h1>
        <p className="text-gray-500 text-sm mb-6">
          {user.grade === "11" ? "Track your marks each term and see how your APS improves." : "Review your academic journey and explore what-if scenarios."}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white border border-gray-100 rounded-xl p-1 w-fit">
          {[["add","Add term"], ["progress","My progress"], ["whatif","What-if"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-green-700 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Add term tab */}
        {tab === "add" && (
          <div className="card space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                <select className="input-field" value={form.term} onChange={e => setForm({...form, term: e.target.value})}>
                  {[1,2,3,4].map(t => <option key={t} value={t}>Term {t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input className="input-field" type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Enter your marks</label>
              <div className="space-y-2">
                {COMMON_SUBJECTS.map(s => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 flex-1">{s}</span>
                    <input type="number" min="0" max="100" placeholder="—"
                      value={form.subjects[s] || ""}
                      onChange={e => setMark(s, e.target.value)}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                ))}
              </div>
            </div>

            {msg && <p className="text-sm">{msg}</p>}
            <button onClick={saveTerm} disabled={saving} className="btn-primary w-full">
              {saving ? "Saving…" : "Save term result →"}
            </button>
          </div>
        )}

        {/* Progress tab */}
        {tab === "progress" && (
          <div className="space-y-4">
            {terms.length === 0 ? (
              <div className="card text-center py-8 text-gray-400">
                No term results saved yet. Add your first term above.
              </div>
            ) : (
              terms.map((t, i) => (
                <div key={i} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Term {t.term} — {t.year}</h3>
                    <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
                      APS {t.aps_score}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                    {Object.entries(t.subjects).map(([s, m]) => (
                      <div key={s} className="flex justify-between pr-4">
                        <span>{s}</span>
                        <span className={`font-medium ${m >= 60 ? "text-green-600" : m >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                          {m}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* What-if tab */}
        {tab === "whatif" && (
          <div className="card space-y-4">
            <p className="text-sm text-gray-600">
              See how improving specific subjects would change your APS and unlock new courses.
            </p>
            {terms.length === 0 ? (
              <p className="text-gray-400 text-sm">Add a term result first to use the what-if simulator.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {Object.entries(terms[terms.length - 1]?.subjects || {}).map(([s, m]) => (
                    <div key={s} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 flex-1">{s} <span className="text-gray-400">({m}%)</span></span>
                      <span className="text-xs text-gray-400">+</span>
                      <input type="number" min="0" max="50" placeholder="0"
                        value={whatIf.improvements[s] || ""}
                        onChange={e => setWhatIf(w => ({ improvements: { ...w.improvements, [s]: parseFloat(e.target.value) || 0 } }))}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-xs text-gray-400">pts</span>
                    </div>
                  ))}
                </div>
                <button onClick={runWhatIf} className="btn-primary w-full">Run simulation →</button>

                {whatIfResult && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-medium text-green-900">
                      APS: <span className="line-through text-gray-400">{whatIfResult.old_aps}</span>
                      {" → "}<span className="text-green-700 font-bold text-lg">{whatIfResult.new_aps}</span>
                      {" "}(+{whatIfResult.aps_gained} points)
                    </p>
                    <p className="text-sm text-green-700 font-medium">
                      🎉 {whatIfResult.total_unlocked} new courses unlocked!
                    </p>
                    {whatIfResult.newly_unlocked?.slice(0, 5).map((c, i) => (
                      <p key={i} className="text-sm text-gray-700">• {c.name} — {c.institution}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
