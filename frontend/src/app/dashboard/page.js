"use client";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  if (loading || !user) return null;

  const cards = [
    { href: "/upload",  icon: "📄", title: "Upload report card",    desc: "Upload your latest report card and we'll extract your marks automatically.", color: "bg-blue-50 border-blue-100" },
    { href: "/results", icon: "🎯", title: "View qualifying courses", desc: "See all university and TVET courses you currently qualify for.", color: "bg-green-50 border-green-100" },
    { href: "/chatbot", icon: "🤖", title: "Chat with CareerBot",     desc: "Discuss your interests and get personalised career advice.", color: "bg-purple-50 border-purple-100" },
    { href: "/grade11", icon: "📈", title: "Track your progress",     desc: user.grade === "11" ? "Upload each term's results and watch your APS improve." : "See your academic journey and what-if scenarios.", color: "bg-yellow-50 border-yellow-100" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10 pb-24 md:pb-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Grade {user.grade === "gap_year" ? "Gap Year" : user.grade} learner — what would you like to do today?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`rounded-2xl border p-6 transition-all hover:shadow-md hover:-translate-y-0.5 ${c.color}`}
            >
              <div className="text-4xl mb-3">{c.icon}</div>
              <h2 className="font-semibold text-gray-900 text-lg">{c.title}</h2>
              <p className="text-gray-600 text-sm mt-1 leading-relaxed">{c.desc}</p>
              <span className="inline-block mt-4 text-sm font-medium text-green-700">
                Get started →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 card bg-green-700 text-white">
          <p className="text-sm font-medium opacity-80">💡 Tip for you</p>
          <p className="mt-1 font-medium">
            {user.grade === "11"
              ? "Upload your latest term report to start tracking which subjects to improve for your dream career."
              : "Upload your latest results to instantly see every course you qualify for at all SA universities and TVET colleges."}
          </p>
        </div>
      </main>
    </div>
  );
}
