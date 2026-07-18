"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef();

  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [subjects, setSubjects]   = useState({});

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  function handleFile(e) {
    const f = e.target.files[0];
    if (f) { setFile(f); setResult(null); setError(""); }
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); setError(""); }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await api.uploadReport(fd);
      setResult(data);
      setSubjects(data.detected_subjects || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function updateMark(subject, val) {
    setSubjects({ ...subjects, [subject]: parseFloat(val) || 0 });
  }

  async function handleCalculate() {
    try {
      const aps = await api.calculateAPS(subjects);
      localStorage.setItem("aps_result", JSON.stringify({ ...aps, subjects }));
      router.push("/results");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Upload your report card</h1>
        <p className="text-gray-500 text-sm mb-6">We'll read your marks automatically. Supported: PDF, JPG, PNG.</p>

        {/* Drop zone */}
        {!result && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all"
          >
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFile} className="hidden" />
            <div className="text-4xl mb-3">📄</div>
            {file
              ? <p className="font-medium text-gray-800">{file.name}</p>
              : <><p className="font-medium text-gray-700">Click to choose a file</p>
                 <p className="text-gray-400 text-sm mt-1">or drag and drop here</p></>
            }
          </div>
        )}

        {file && !result && (
          <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full mt-4">
            {uploading ? "Reading your report card…" : "Upload & extract marks →"}
          </button>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Results from OCR */}
        {result && (
          <div className="mt-6 space-y-4">
            {result.needs_review && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl px-4 py-3">
                ⚠️ Some marks may not have been read correctly. Please check and correct them below.
              </div>
            )}
            {!result.needs_review && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
                ✅ Report card read successfully! Review your marks below, then click Calculate APS.
              </div>
            )}

            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Your subjects & marks</h2>
              <div className="space-y-3">
                {Object.entries(subjects).map(([subject, mark]) => (
                  <div key={subject} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700 flex-1">{subject}</span>
                    <input
                      type="number" min="0" max="100"
                      value={mark}
                      onChange={(e) => updateMark(subject, e.target.value)}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                ))}
              </div>

              {/* Add subject manually */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Missing a subject? Add it manually:</p>
                <AddSubjectForm onAdd={(s, m) => setSubjects({ ...subjects, [s]: m })} />
              </div>
            </div>

            <button onClick={handleCalculate} className="btn-primary w-full">
              Calculate my APS & see qualifying courses →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function AddSubjectForm({ onAdd }) {
  const [s, setS] = useState("");
  const [m, setM] = useState("");
  function add() {
    if (s && m) { onAdd(s, parseFloat(m)); setS(""); setM(""); }
  }
  return (
    <div className="flex gap-2">
      <input className="input-field flex-1" placeholder="Subject name" value={s} onChange={(e) => setS(e.target.value)} />
      <input className="input-field w-20 text-center" type="number" min="0" max="100" placeholder="%" value={m} onChange={(e) => setM(e.target.value)} />
      <button onClick={add} className="btn-secondary px-4">Add</button>
    </div>
  );
}
