"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

const FACULTIES  = ["All", "Engineering", "Health Sciences", "Science", "Commerce", "Law", "Education", "Humanities"];
const TYPES      = ["All", "university", "tvet"];
const PROVINCES  = ["All", "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State", "North West", "Limpopo", "Mpumalanga", "Northern Cape"];

export default function ResultsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [apsData, setApsData]     = useState(null);
  const [courses, setCourses]     = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [faculty, setFaculty]     = useState("All");
  const [type, setType]           = useState("All");
  const [province, setProvince]   = useState("All");
  const [search, setSearch]       = useState("");
  const [fetching, setFetching]   = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    const saved = localStorage.getItem("aps_result");
    if (saved) {
      const data = JSON.parse(saved);
      setApsData(data);
      setCourses(data.qualifying_courses || []);
      setFiltered(data.qualifying_courses || []);
    }
  }, []);

  useEffect(() => {
    let c = [...courses];
    if (faculty  !== "All") c = c.filter(x => x.faculty?.toLowerCase().includes(faculty.toLowerCase()));
    if (type     !== "All") c = c.filter(x => x.institution_type === type);
    if (province !== "All") c = c.filter(x => x.province?.toLowerCase().includes(province.toLowerCase()));
    if (search)             c = c.filter(x => x.name?.toLowerCase().includes(search.toLowerCase()) || x.institution?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(c);
  }, [faculty, type, province, search, courses]);

  async function loadManually(aps) {
    setFetching(true);
    try {
      const data = await api.filterCourses({ aps_score: aps });
      setCourses(data.courses || []);
    } finally {
      setFetching(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10 pb-24 md:pb-10">

        {/* APS summary banner */}
        {apsData && (
          <div className="bg-green-700 text-white rounded-2xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-green-200 text-sm">Your APS score</p>
              <p className="text-5xl font-bold">{apsData.aps_score}</p>
            </div>
            <div className="text-right">
              <p className="text-green-200 text-sm">Qualifying courses found</p>
              <p className="text-4xl font-bold">{filtered.length}</p>
            </div>
          </div>
        )}

        {!apsData && (
          <div className="card text-center py-12">
            <p className="text-5xl mb-4">📄</p>
            <p className="text-gray-700 font-medium">No results yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload your report card first to see your qualifying courses.</p>
            <button onClick={() => router.push("/upload")} className="btn-primary mt-4">Upload report card →</button>
          </div>
        )}

        {apsData && (
          <>
            {/* Filters */}
            <div className="card mb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input className="input-field col-span-2 md:col-span-1" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input-field" value={faculty}  onChange={e => setFaculty(e.target.value)}>
                  {FACULTIES.map(f => <option key={f}>{f}</option>)}
                </select>
                <select className="input-field" value={type}     onChange={e => setType(e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <select className="input-field" value={province} onChange={e => setProvince(e.target.value)}>
                  {PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Course cards */}
            <div className="space-y-3">
              {filtered.map((c, i) => (
                <CourseCard key={i} course={c} />
              ))}
              {filtered.length === 0 && (
                <div className="card text-center py-8 text-gray-400">
                  No courses match your filters. Try removing some filters.
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function CourseCard({ course: c }) {
  const [open, setOpen] = useState(false);
  const typeColor = c.institution_type === "tvet"
    ? "bg-blue-100 text-blue-700"
    : "bg-green-100 text-green-700";

  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{c.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
              {c.institution_type}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{c.institution} · {c.province}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">Min APS</p>
          <p className="font-bold text-green-700 text-xl">{c.min_aps}</p>
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
          <p><span className="font-medium">Faculty:</span> {c.faculty}</p>
          <p><span className="font-medium">Duration:</span> {c.duration_years} year{c.duration_years !== 1 ? "s" : ""}</p>
          {c.description && <p><span className="font-medium">About:</span> {c.description}</p>}
          {c.compulsory_subjects?.length > 0 && (
            <p><span className="font-medium">Requirements:</span>{" "}
              {c.compulsory_subjects.map(s => `${s.subject} ≥ ${s.min_mark}%`).join(", ")}
            </p>
          )}
          {c.website && (
            <a href={c.website} target="_blank" rel="noopener noreferrer"
               className="inline-block mt-2 text-green-700 font-medium hover:underline"
               onClick={e => e.stopPropagation()}>
              Visit institution website →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
