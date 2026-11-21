"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import { api } from "../../lib/api";
import { getApsResult, setApsResult } from "../../lib/apsCache";

const FACULTIES = ["All","Engineering","Health Sciences","Science","Commerce","Law","Education","Humanities"];
const TYPES = [{ v: "All", label: "All" }, { v: "university", label: "University" }, { v: "tvet", label: "TVET College" }];
const PROVINCES = ["All","Gauteng","Western Cape","KwaZulu-Natal","Eastern Cape","Free State","North West","Limpopo","Mpumalanga","Northern Cape"];

function StatCard({ label, value, hero }) {
  return (
    <div className={`rounded-2xl p-5 flex-1 min-w-[150px] ${hero ? "bg-[var(--green-700)] text-white" : "bg-white border border-[var(--line)]"}`}>
      <p className={`text-xs mb-1.5 ${hero ? "text-[var(--green-100)]" : "text-[var(--ink-40)]"}`}>{label}</p>
      <p className={`font-display font-bold leading-none ${hero ? "text-white text-4xl" : "text-[var(--ink)] text-3xl"}`}>{value}</p>
    </div>
  );
}

function FilterGroup({ title, options, value, onChange }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide mb-2.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const v = typeof opt === "string" ? opt : opt.v;
          const label = typeof opt === "string" ? opt : opt.label;
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                active
                  ? "bg-[var(--green-700)] border-[var(--green-700)] text-white"
                  : "bg-white border-[var(--line)] text-[var(--ink-60)] hover:border-[var(--green-700)]/40"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [apsData, setApsData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [faculty, setFaculty] = useState("All");
  const [type, setType] = useState("All");
  const [province, setProvince] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading]);
  useEffect(() => {
    if (!user) return;
    const saved = getApsResult(user.id);
    if (saved) {
      // Trust this — it was written moments ago by whichever action (upload or
      // progress-tracker save) sent the learner here, so it's already the freshest data.
      setApsData(saved); setCourses(saved.qualifying_courses||[]); setFiltered(saved.qualifying_courses||[]);
      return;
    }
    // No cached result at all (e.g. fresh login on a new device) — gap year learners
    // upload a final certificate and don't use the term tracker, so there's nothing
    // to fall back to for them. Everyone else: pull their latest saved term.
    if (user.grade === "gap_year") return;
    api.getProgress().then(async (p) => {
      const latest = (p.terms || [])[p.terms.length - 1];
      if (!latest) return;
      const data = await api.calculateAPS(latest.subjects);
      const merged = { ...data, subjects: latest.subjects };
      setApsResult(user.id, merged);
      setApsData(merged); setCourses(merged.qualifying_courses||[]); setFiltered(merged.qualifying_courses||[]);
    }).catch(() => {});
  }, [user]);
  useEffect(() => {
    let c = [...courses];
    if (faculty!=="All") c = c.filter(x=>x.faculty?.toLowerCase().includes(faculty.toLowerCase()));
    if (type!=="All") c = c.filter(x=>x.institution_type===type);
    if (province!=="All") c = c.filter(x=>x.province?.toLowerCase().includes(province.toLowerCase()));
    if (search) c = c.filter(x=>x.name?.toLowerCase().includes(search.toLowerCase())||x.institution?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(c);
  }, [faculty,type,province,search,courses]);

  if (loading||!user) return null;

  const institutionsMatched = new Set(filtered.map(c => c.institution)).size;
  const provincesCovered = new Set(filtered.map(c => c.province)).size;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <Navbar/>
      <main className="max-w-6xl mx-auto px-4 py-10">
        {apsData ? (<>
          <div className="flex gap-4 flex-wrap mb-6">
            <StatCard label="Your APS score" value={apsData.aps_score} hero />
            <StatCard label="Qualifying courses" value={filtered.length} />
            <StatCard label="Institutions matched" value={institutionsMatched} />
            <StatCard label="Provinces covered" value={provincesCovered} />
          </div>

          <div className="flex gap-6 items-start">
            <aside className="hidden md:block w-56 shrink-0 sticky top-20">
              <p className="text-sm font-semibold text-[var(--ink)] mb-4">Filter results</p>
              <FilterGroup title="Faculty" options={FACULTIES} value={faculty} onChange={setFaculty} />
              <FilterGroup title="Institution type" options={TYPES} value={type} onChange={setType} />
              <FilterGroup title="Province" options={PROVINCES} value={province} onChange={setProvince} />
            </aside>

            <div className="flex-1 min-w-0">
              <input
                className="input-field mb-4"
                placeholder="Search courses or institutions..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
              />

              {/* Mobile filters */}
              <div className="md:hidden mb-4 space-y-3">
                <FilterGroup title="Faculty" options={FACULTIES} value={faculty} onChange={setFaculty} />
                <FilterGroup title="Institution type" options={TYPES} value={type} onChange={setType} />
                <FilterGroup title="Province" options={PROVINCES} value={province} onChange={setProvince} />
              </div>

              {filtered.map((c,i)=><CourseCard key={i} course={c} apsScore={apsData.aps_score} />)}
              {filtered.length===0&&<div className="card text-center text-[var(--ink-40)] py-12">No courses match your filters.</div>}
            </div>
          </div>
        </>) : (
          <div className="card text-center py-16">
            <p className="text-sm text-[var(--ink-60)] mb-5">Upload your report card first to see your qualifying courses.</p>
            <button onClick={()=>router.push("/upload")} className="btn-primary">Upload report card</button>
          </div>
        )}
      </main>
    </div>
  );
}

function CourseCard({ course: c, apsScore }) {
  const [open, setOpen] = useState(false);
  const margin = apsScore != null && c.min_aps != null ? apsScore - c.min_aps : null;
  return (
    <div onClick={()=>setOpen(!open)} className="card mb-3 cursor-pointer hover:border-[var(--green-700)]/30 transition-colors">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-[var(--ink)] text-base m-0">{c.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.institution_type==="tvet" ? "bg-blue-100 text-blue-700" : "bg-[var(--green-100)] text-[var(--green-800)]"}`}>
              {c.institution_type}
            </span>
          </div>
          <p className="text-sm text-[var(--ink-60)] m-0">{c.institution} — {c.province}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-[var(--ink-40)] m-0">Min APS</p>
          <p className="text-2xl font-bold text-[var(--green-700)] m-0 font-display">{c.min_aps}</p>
          {margin !== null && (
            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${margin >= 5 ? "bg-[var(--green-100)] text-[var(--green-800)]" : "bg-[var(--amber-50)] text-amber-700"}`}>
              +{margin} margin
            </span>
          )}
        </div>
      </div>
      {open&&(
        <div className="mt-4 pt-4 border-t border-[var(--line)] text-sm text-[var(--ink-60)] space-y-2">
          <p className="m-0"><strong className="text-[var(--ink)]">Faculty:</strong> {c.faculty}</p>
          <p className="m-0"><strong className="text-[var(--ink)]">Duration:</strong> {c.duration_years} year{c.duration_years!==1?"s":""}</p>
          {c.compulsory_subjects?.length>0&&(
            <p className="m-0"><strong className="text-[var(--ink)]">Compulsory subjects:</strong> {c.compulsory_subjects.map(s=>{const names=Array.isArray(s.subject)?s.subject:[s.subject];const label=names.map(n=>n.replace(/\b\w/g,ch=>ch.toUpperCase())).join(" or ");return `${label}-${s.min_mark}%`;}).join(", ")}</p>
          )}
          {c.description&&<p className="m-0"><strong className="text-[var(--ink)]">About:</strong> {c.description}</p>}
          {c.website&&<a href={c.website} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-[var(--green-700)] font-medium inline-block">Visit institution website</a>}
        </div>
      )}
    </div>
  );
}