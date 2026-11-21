"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import { api } from "../../lib/api";
import { setApsResult } from "../../lib/apsCache";

const SUBJECT_GROUPS = [
  {
    group: "Languages (choose yours)",
    subjects: [
      "English Home Language",
      "English First Additional Language",
      "Afrikaans Home Language",
      "Afrikaans First Additional Language",
      "IsiZulu Home Language",
      "IsiZulu First Additional Language",
      "IsiXhosa Home Language",
      "IsiXhosa First Additional Language",
      "Sesotho Home Language",
      "Sesotho First Additional Language",
      "Setswana Home Language",
      "Setswana First Additional Language",
      "Sepedi Home Language",
      "Sepedi First Additional Language",
      "Xitsonga Home Language",
      "Xitsonga First Additional Language",
      "Tshivenda Home Language",
      "Tshivenda First Additional Language",
      "SiSwati Home Language",
      "SiSwati First Additional Language",
      "IsiNdebele Home Language",
      "IsiNdebele First Additional Language",
    ]
  },
  {
    group: "Mathematics",
    subjects: [
      "Mathematics",
      "Mathematical Literacy",
      "Technical Mathematics",
    ]
  },
  {
    group: "Sciences",
    subjects: [
      "Physical Sciences (Physics and Chemistry)",
      "Life Sciences (Biology)",
      "Agricultural Sciences",
    ]
  },
  {
    group: "Technology",
    subjects: [
      "Information Technology (IT)",
      "Computer Applications Technology (CAT)",
      "Engineering Graphics and Design (EGD)",
      "Technical Sciences",
    ]
  },
  {
    group: "Commerce",
    subjects: [
      "Accounting",
      "Business Studies",
      "Economics",
    ]
  },
  {
    group: "Humanities & Social Sciences",
    subjects: [
      "History",
      "Geography",
      "Religion Studies",
      "Life Orientation",
    ]
  },
  {
    group: "Consumer & Service",
    subjects: [
      "Consumer Studies",
      "Hospitality Studies",
      "Tourism",
    ]
  },
  {
    group: "Arts",
    subjects: [
      "Visual Arts",
      "Dramatic Arts",
      "Music",
      "Design",
    ]
  },
];

const ALL_SUBJECTS = SUBJECT_GROUPS.flatMap(g => g.subjects);

export default function Grade12Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [terms, setTerms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("add");
  const [form, setForm] = useState({ term: "1", year: new Date().getFullYear().toString(), subjects: {} });
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [careerFit, setCareerFit] = useState(null);
  const [careerFitAfter, setCareerFitAfter] = useState(null);
  const [careerFitLoading, setCareerFitLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({"Languages (choose yours)": true, "Mathematics": true, "Sciences": true});

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading]);
  useEffect(() => { if (!loading && user?.grade === "gap_year") router.push("/dashboard"); }, [user, loading]);
  useEffect(() => { if (user) api.getProgress().then(d => setTerms(d.terms || [])).catch(() => {}); }, [user]);
  useEffect(() => {
    if (tab === "whatif" && terms.length > 0) {
      setCareerFitLoading(true);
      api.careerFit().then(setCareerFit).catch(() => {}).finally(() => setCareerFitLoading(false));
    }
  }, [tab, terms]);
  // Automatically run the simulation as soon as we know the career goal's
  // subject gaps — no manual numbers or button from the learner.
  useEffect(() => {
    if (!careerFit?.career || !terms.length) return;
    const latest = terms[terms.length - 1];
    const improvements = {};
    for (const s of careerFit.subject_status || []) {
      if (s.status === "below" && s.subject_key) improvements[s.subject_key] = s.gap;
    }
    setSimLoading(true);
    Promise.all([
      api.whatIf({ subjects: latest.subjects, improvements }),
      (async () => {
        if (!Object.keys(improvements).length) return careerFit; // already meets every subject requirement
        const improved = { ...latest.subjects };
        for (const s in improvements) improved[s] = Math.min(100, (improved[s] || 0) + improvements[s]);
        return api.careerFit({ subjects: improved });
      })(),
    ]).then(([whatIf, fitAfter]) => { setWhatIfResult(whatIf); setCareerFitAfter(fitAfter); })
      .catch(() => {})
      .finally(() => setSimLoading(false));
  }, [careerFit, terms]);

  function toggleGroup(group) {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  }

  function setMark(subject, val) {
    setForm(f => ({ ...f, subjects: { ...f.subjects, [subject]: parseFloat(val) || 0 } }));
  }

  function removeMark(subject) {
    setForm(f => {
      const s = { ...f.subjects };
      delete s[subject];
      return { ...f, subjects: s };
    });
  }

  async function saveTerm() {
    setSaving(true); setMsg("");
    try {
      await api.saveTermResult({ term: parseInt(form.term), year: parseInt(form.year), subjects: form.subjects });
      setMsg("success");
      api.getProgress().then(d => setTerms(d.terms || []));
      // Keep the Results page in sync with the learner's latest tracked term
      const aps = await api.calculateAPS(form.subjects);
      setApsResult(user.id, { ...aps, subjects: form.subjects });
    } catch (e) { setMsg("error:" + e.message); }
    finally { setSaving(false); }
  }

  if (loading || !user || user.grade === "gap_year") return null;

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", background: tab === id ? "#15803d" : "transparent", color: tab === id ? "white" : "#6b7280" }}>{label}</button>
  );

  const addedSubjects = Object.keys(form.subjects);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <main style={{ maxWidth: 768, margin: "0 auto", padding: "40px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", color: "#111827", marginBottom: 4 }}>Progress tracker</h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Upload each term results to track your APS and see which marks to improve.</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "white", border: "1px solid #f1f5f9", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {tabBtn("add", "Add term")}{tabBtn("progress", "My progress")}{tabBtn("whatif", "What-if")}
        </div>

        {tab === "add" && (
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 4 }}>Term</label>
                <select style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none" }} value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}>
                  {[1, 2, 3, 4].map(t => <option key={t} value={t}>Term {t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 4 }}>Year</label>
                <input style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }} type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>

            {addedSubjects.length > 0 && (
              <div style={{ marginBottom: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#15803d", marginBottom: 10 }}>Your subjects ({addedSubjects.length} added)</p>
                {addedSubjects.map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, color: "#374151" }}>{s}</span>
                    <input type="number" min="0" max="100" value={form.subjects[s] || ""} onChange={e => setMark(s, e.target.value)}
                      style={{ width: 60, border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 8px", fontSize: 13, textAlign: "center", outline: "none" }} />
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>%</span>
                    <button onClick={() => removeMark(s)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: 0 }}>x</button>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 12 }}>Click a subject to add it:</p>

            {SUBJECT_GROUPS.map(({ group, subjects }) => (
              <div key={group} style={{ marginBottom: 8, border: "1px solid #f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                <button onClick={() => toggleGroup(group)} style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "#f8fafc", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  {group}
                  <span style={{ color: "#9ca3af" }}>{expandedGroups[group] ? "▲" : "▼"}</span>
                </button>
                {expandedGroups[group] && (
                  <div style={{ padding: "8px 14px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {subjects.map(s => {
                      const added = s in form.subjects;
                      return (
                        <button key={s} onClick={() => added ? removeMark(s) : setMark(s, "")}
                          style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, border: "1px solid", cursor: "pointer", background: added ? "#15803d" : "white", color: added ? "white" : "#374151", borderColor: added ? "#15803d" : "#e2e8f0", fontWeight: added ? 500 : 400 }}>
                          {added ? "✓ " : ""}{s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {msg === "success" && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 12, padding: "12px 16px", marginTop: 16, fontSize: 14 }}>Term result saved successfully!</div>}
            {msg.startsWith("error:") && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 12, padding: "12px 16px", marginTop: 16, fontSize: 14 }}>{msg.replace("error:", "")}</div>}

            <button onClick={saveTerm} disabled={saving || addedSubjects.length === 0} style={{ width: "100%", background: addedSubjects.length === 0 ? "#9ca3af" : "#15803d", color: "white", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 600, fontSize: 14, cursor: addedSubjects.length === 0 ? "not-allowed" : "pointer", marginTop: 16 }}>
              {saving ? "Saving..." : "Save term result"}
            </button>
          </div>
        )}

        {tab === "progress" && (
          <div>
            {terms.length === 0
              ? <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", padding: 32, textAlign: "center", color: "#9ca3af" }}>No term results saved yet. Add your first term above.</div>
              : terms.map((t, i) => (
                <div key={i} style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontWeight: 600, color: "#111827", margin: 0 }}>Term {t.term} — {t.year}</h3>
                    <span style={{ background: "#dcfce7", color: "#15803d", fontWeight: "bold", padding: "4px 12px", borderRadius: 20, fontSize: 14 }}>APS {t.aps_score}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 13, color: "#4b5563" }}>
                    {Object.entries(t.subjects).map(([s, m]) => (
                      <div key={s} style={{ display: "flex", justifyContent: "space-between", paddingRight: 16 }}>
                        <span>{s}</span>
                        <span style={{ fontWeight: 500, color: m >= 60 ? "#15803d" : m >= 40 ? "#ca8a04" : "#dc2626" }}>{m}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab === "whatif" && (
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
            <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 16 }}>Based on what you&apos;ve told CareerBot you want to become, here&apos;s what needs to improve.</p>

            {terms.length === 0 && <p style={{ color: "#9ca3af", fontSize: 14 }}>Add a term result first.</p>}

            {terms.length > 0 && careerFitLoading && <p style={{ fontSize: 13, color: "#9ca3af" }}>Checking your CareerBot chats for a career goal...</p>}

            {terms.length > 0 && !careerFitLoading && careerFit && !careerFit.career && (
              <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 12, padding: 16, fontSize: 13, color: "#854d0e" }}>
                Tell CareerBot what you want to become (e.g. &quot;I want to be a doctor&quot;) and this tab will automatically show which subjects to improve and simulate the impact — no need to enter anything yourself.
              </div>
            )}

            {careerFit?.career && careerFit.target_course && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <p style={{ fontWeight: 600, color: "#1e40af", marginBottom: 4 }}> Your career goal: {careerFit.career}</p>
                <p style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>Closest match: {careerFit.target_course.name} — {careerFit.target_course.institution}</p>
                <p style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
                  APS: <strong>{careerFit.current_aps}</strong> / {careerFit.required_aps} needed
                  {careerFit.aps_gap > 0 && <span style={{ color: "#dc2626" }}> ({careerFit.aps_gap} points short)</span>}
                </p>
                {careerFit.subject_status?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Subjects {careerFit.career} needs:</p>
                    {careerFit.subject_status.map(s => (
                      <div key={s.subject} style={{ fontSize: 13, margin: "6px 0", padding: "8px 10px", borderRadius: 8,
                        background: s.status === "meets" ? "#f0fdf4" : s.status === "below" ? "#fef2f2" : "#fff7ed",
                        color: s.status === "meets" ? "#15803d" : s.status === "below" ? "#b91c1c" : "#c2410c" }}>
                        <strong>{s.status === "meets" ? "✅ " : s.status === "below" ? "⚠️ " : "❌ "}{s.subject}</strong>
                        <div style={{ marginTop: 2 }}>{s.advice}</div>
                      </div>
                    ))}
                  </div>
                )}
                {careerFit.missing_subjects?.length > 0 && (
                  <p style={{ fontSize: 13, color: "#c2410c", marginTop: 10 }}>
                    Missing required subject{careerFit.missing_subjects.length !== 1 ? "s" : ""}: <strong>{careerFit.missing_subjects.join(", ")}</strong>.
                    Marks in other subjects cannot make up for this. Talk to your school about whether you can still take it, or ask CareerBot about related courses and TVET routes.
                  </p>
                )}
                {careerFit.options?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Programmes checked:</p>
                    {careerFit.options.map((o, i) => (
                      <p key={i} style={{ fontSize: 13, margin: "2px 0", color: o.qualifies ? "#15803d" : "#6b7280" }}>
                        {o.qualifies ? "✅" : "•"} {o.name} - {o.institution} (APS {o.min_aps})
                      </p>
                    ))}
                  </div>
                )}
                {careerFit.qualifies && <p style={{ fontSize: 13, color: "#15803d", fontWeight: 600, marginTop: 10 }}>You currently qualify for this!</p>}
              </div>
            )}

            {simLoading && <p style={{ fontSize: 13, color: "#9ca3af" }}>Simulating what happens if you reach those marks...</p>}

            {!simLoading && whatIfResult && careerFit?.career && !careerFit.qualifies && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 8 }}>
                  {careerFit.weak_subjects?.length > 0
                    ? `If you lift ${careerFit.weak_subjects.join(" and ")} to the required marks:`
                    : "If you reach those marks:"}
                </p>
                <p style={{ fontWeight: 500, color: "#14532d", marginBottom: 8 }}>APS: <span style={{ textDecoration: "line-through", color: "#9ca3af" }}>{whatIfResult.old_aps}</span> to <span style={{ color: "#15803d", fontSize: 20, fontWeight: "bold" }}>{whatIfResult.new_aps}</span> (+{whatIfResult.aps_gained} points)</p>
                <p style={{ color: "#15803d", fontWeight: 500, marginBottom: 8 }}>{whatIfResult.total_unlocked} new courses unlocked!</p>
                {whatIfResult.newly_unlocked?.slice(0, 5).map((c, i) => (<p key={i} style={{ fontSize: 13, color: "#374151", margin: "4px 0" }}>- {c.name} at {c.institution}</p>))}
                {careerFitAfter?.career && (
                  <p style={{ fontSize: 13, fontWeight: 600, color: careerFitAfter.qualifies ? "#15803d" : "#854d0e", marginTop: 10 }}>
                    {careerFitAfter.qualifies ? `Reaching those marks would qualify you for ${careerFitAfter.career}!` : careerFitAfter.missing_subjects?.length ? `Even at those marks you would still be missing ${careerFitAfter.missing_subjects.join(", ")}, which ${careerFitAfter.career} requires.` : `Still short of ${careerFitAfter.career} even at those marks — keep tracking each term.`}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}