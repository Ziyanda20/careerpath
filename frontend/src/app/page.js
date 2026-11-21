"use client";
import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <nav className="flex justify-between items-center px-8 py-5 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-green-700 text-xl">CareerPath SA</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-secondary text-sm">Log in</Link>
          <Link href="/register" className="btn-primary text-sm">Get started free</Link>
        </div>
      </nav>
      <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <h1 className="text-5xl font-bold text-gray-900 mt-6 leading-tight">Find the career <span className="text-green-700">you qualify for</span></h1>
        <p className="text-gray-500 text-lg mt-5 max-w-2xl mx-auto">Upload your report card. We calculate your APS automatically and show you every university and TVET course you qualify for across South Africa.</p>
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">Start for free</Link>
          <Link href="/login" className="btn-secondary px-8 py-3 text-base">I have an account</Link>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center"><h3 className="font-semibold text-gray-900 mb-2">Upload your report card</h3><p className="text-gray-500 text-sm">PDF, JPG or PNG. Our AI reads your marks automatically.</p></div>
        <div className="card text-center"><h3 className="font-semibold text-gray-900 mb-2">Automatic APS calculation</h3><p className="text-gray-500 text-sm">Instant APS score for all SA universities and TVET colleges.</p></div>
        <div className="card text-center"><h3 className="font-semibold text-gray-900 mb-2">AI career chatbot</h3><p className="text-gray-500 text-sm">Chat about your interests and get personalised course suggestions.</p></div>
      </section>
    </main>
  );
}
