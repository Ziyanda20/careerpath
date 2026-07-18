"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="font-bold text-green-700 text-xl">CareerPath SA</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login"    className="btn-secondary text-sm">Log in</Link>
          <Link href="/register" className="btn-primary  text-sm">Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <span className="bg-green-100 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full">
          Free for all South African learners
        </span>
        <h1 className="text-5xl font-bold text-gray-900 mt-6 leading-tight">
          Find the career <span className="text-green-700">you qualify for</span> — instantly
        </h1>
        <p className="text-gray-500 text-lg mt-5 max-w-2xl mx-auto">
          Upload your report card. We calculate your APS automatically and show you
          every university and TVET course you qualify for across South Africa.
          No more searching through prospectuses.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Start for free →
          </Link>
          <Link href="/login" className="btn-secondary px-8 py-3 text-base">
            I have an account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: "📄", title: "Upload your report card", desc: "PDF, JPG or PNG. Our AI reads your marks automatically — works with any school's format." },
          { icon: "🧮", title: "Automatic APS calculation", desc: "Instant APS score for all SA universities and TVET colleges. No manual calculation needed." },
          { icon: "🤖", title: "AI career chatbot", desc: "Chat about your interests and get personalised course suggestions in multiple SA languages." },
        ].map((f) => (
          <div key={f.title} className="card text-center">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
