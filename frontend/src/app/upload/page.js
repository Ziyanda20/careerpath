"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import { api } from "../../lib/api";
import { setApsResult } from "../../lib/apsCache";

const STEPS = ["Account", "Upload", "Review marks", "Your courses"];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center mb-10">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  done
                    ? "bg-[var(--green-700)] text-white"
                    : active
                    ? "bg-[var(--green-700)] text-white"
                    : "bg-[var(--paper)] text-[var(--ink-40)] border border-[var(--line)]"
                }`}
              >
                {done ? "✓" : step}
              </div>
              <span className={`text-sm whitespace-nowrap ${active ? "font-semibold text-[var(--ink)]" : done ? "text-[var(--ink-60)]" : "text-[var(--ink-40)]"}`}>
                {label}
              </span>
            </div>
            {step < STEPS.length && <div className={`h-px flex-1 mx-4 ${done ? "bg-[var(--green-700)]" : "bg-[var(--line)]"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // termData: { "1": { Mathematics: 65, ... }, "2": { Mathematics: 71, ... } }
  const [termData, setTermData] = useState({});
  const [newSubject, setNewSubject] = useState("");
  const [newMark, setNewMark] = useState("");
  const [newTerm, setNewTerm] = useState("1");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading]);

  function handleFile(e) { const f = e.target.files[0]; if (f) { setFile(f); setResult(null); setError(""); } }

  async function handleUpload() {
    if (!file) return; setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const data = await api.uploadReport(fd);
      setResult(data);
      const terms = data.terms && Object.keys(data.terms).length > 0
        ? data.terms
        : { "1": data.detected_subjects || {} };
      setTermData(terms);
    }
    catch (err) { setError(err.message); } finally { setUploading(false); }
  }

  function updateMark(term, subject, v) {
    setTermData(t => ({ ...t, [term]: { ...t[term], [subject]: parseFloat(v) || 0 } }));
  }

  function addSubject() {
    if (newSubject && newMark) {
      setTermData(t => ({ ...t, [newTerm]: { ...(t[newTerm] || {}), [newSubject]: parseFloat(newMark) } }));
      setNewSubject(""); setNewMark("");
    }
  }

  const termKeys = Object.keys(termData).sort((a, b) => a - b);
  const latestTerm = termKeys[termKeys.length - 1];

  async function handleCalculate() {
    setSaving(true); setError("");
    try {
      const year = new Date().getFullYear();
      // Gap year learners upload a final matric certificate, not a progress report,
      // and don't use the term-by-term tracker — so only save terms for current learners.
      if (user.grade !== "gap_year") {
        for (const term of termKeys) {
          await api.saveTermResult({ term: parseInt(term), year, subjects: termData[term] });
        }
      }
      // Show qualifying courses based on the most recent term
      const latestSubjects = termData[latestTerm] || {};
      const aps = await api.calculateAPS(latestSubjects);
      setApsResult(user.id, { ...aps, subjects: latestSubjects });
      router.push("/results");
    }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  if (loading || !user) return null;

  const currentStep = result ? 3 : 2;

  // Flatten confidence per subject across terms for row-level lookup + overall stats
  const confidenceFor = (term, subject) => result?.subject_confidence?.[term]?.[subject];
  const allConfidences = termKeys.flatMap(t => Object.entries(termData[t] || {}).map(([s]) => confidenceFor(t, s)).filter(c => c !== undefined));
  const flaggedCount = allConfidences.filter(c => c < 0.9).length;
  const overallConfidencePct = allConfidences.length ? Math.round((allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length) * 100) : null;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <StepIndicator current={currentStep} />

        {!result && (
          <>
            <h1 className="font-display text-2xl font-bold text-[var(--ink)] mb-1">Upload your report card</h1>
            <p className="text-[var(--ink-60)] text-sm mb-8">
              PDF, JPG or PNG. We&apos;ll read your marks automatically — if your report card shows more than one term, we&apos;ll split them into the correct terms.
            </p>
            <div
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-[var(--line)] hover:border-[var(--green-700)]/40 rounded-2xl p-12 text-center cursor-pointer transition-colors bg-white"
            >
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="hidden" />
              <p className="font-medium text-[var(--ink)]">{file ? file.name : "Click to choose a file"}</p>
              {!file && <p className="text-[var(--ink-40)] text-sm mt-1">or drag and drop here</p>}
            </div>
            {file && <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full mt-4 disabled:opacity-60">{uploading ? "Reading your report card..." : "Upload and extract marks"}</button>}
          </>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mt-4">{error}</div>}

        {result && (
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--ink)] mb-1">Review your extracted marks</h1>
            <p className="text-[var(--ink-60)] text-sm mb-6">Our OCR engine read the following from your report card. Please check and correct any flagged row before continuing.</p>

            <div className={`rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2 ${result.needs_review ? "bg-[var(--amber-50)] border border-amber-200 text-amber-800" : "bg-[var(--green-50)] border border-green-200 text-[var(--green-800)]"}`}>
              <span>{result.needs_review ? "⚠️" : "✓"}</span>
              <span>
                {overallConfidencePct !== null && <>Overall extraction confidence: <strong>{overallConfidencePct}%</strong>{flaggedCount > 0 && <> — {flaggedCount} subject{flaggedCount !== 1 ? "s" : ""} below the 90% threshold flagged for your review.</>}</>}
                {overallConfidencePct === null && (result.needs_review ? "Some marks may not have been read correctly. Please check and fix them below." : "Report card read successfully — review your marks below.")}
              </span>
            </div>

            {termKeys.length > 1 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 mb-6 text-sm">
                We found marks for {termKeys.length} terms on this report card — each will be saved to the right term in your progress tracker.
              </div>
            )}

            {termKeys.map(term => (
              <div key={term} className="card mb-4 overflow-hidden !p-0">
                <div className="px-6 py-4 border-b border-[var(--line)]">
                  <h2 className="font-semibold text-[var(--ink)]">Term {term} subjects and marks</h2>
                </div>
                {Object.keys(termData[term] || {}).length === 0 ? (
                  <p className="text-sm text-[var(--ink-40)] px-6 py-6">No subjects detected for this term.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--ink-40)] text-xs uppercase tracking-wide border-b border-[var(--line)]">
                        <th className="font-medium px-6 py-2.5">Subject</th>
                        <th className="font-medium px-4 py-2.5 w-28">Mark</th>
                        <th className="font-medium px-4 py-2.5 w-28">Confidence</th>
                        <th className="font-medium px-4 py-2.5 w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(termData[term] || {}).map(([s, m]) => {
                        const conf = confidenceFor(term, s);
                        const flagged = conf !== undefined && conf < 0.9;
                        return (
                          <tr key={s} className={`border-b border-[var(--line)] last:border-0 ${flagged ? "bg-[var(--amber-50)]" : ""}`}>
                            <td className="px-6 py-3 text-[var(--ink)]">{s}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number" min="0" max="100" value={m}
                                  onChange={(e) => updateMark(term, s, e.target.value)}
                                  className="w-16 border border-[var(--line)] rounded-lg px-2 py-1 text-sm text-center outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
                                />
                                <span className="text-[var(--ink-40)] text-xs">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[var(--ink-60)]">{conf !== undefined ? `${Math.round(conf * 100)}%` : "—"}</td>
                            <td className="px-4 py-3">
                              {conf === undefined ? (
                                <span className="text-xs text-[var(--ink-40)]">Manual</span>
                              ) : flagged ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">Please verify</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--green-800)] bg-[var(--green-100)] rounded-full px-2.5 py-1">OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            <div className="card mb-6">
              <p className="text-xs text-[var(--ink-40)] mb-3">Missing a subject? Add it manually:</p>
              <div className="flex gap-2 flex-wrap">
                <input className="input-field flex-1 min-w-[160px]" placeholder="Subject name" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                <input className="input-field w-20" type="number" min="0" max="100" placeholder="%" value={newMark} onChange={(e) => setNewMark(e.target.value)} />
                {termKeys.length > 1 && (
                  <select value={newTerm} onChange={(e) => setNewTerm(e.target.value)} className="input-field w-28">
                    {termKeys.map(t => <option key={t} value={t}>Term {t}</option>)}
                  </select>
                )}
                <button onClick={addSubject} className="btn-secondary">Add</button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => { setResult(null); setFile(null); }} className="btn-secondary">Re-upload photo</button>
              <button onClick={handleCalculate} disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? "Saving..." : "Confirm marks & calculate APS"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}