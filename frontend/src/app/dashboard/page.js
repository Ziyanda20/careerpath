"use client";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading]);
  if (loading || !user) return null;
  const cards = [
    { href: "/upload", title: "Upload report card", desc: "Upload your latest report card and we will extract your marks automatically.", bg: "#eff6ff", border: "#bfdbfe" },
    { href: "/results", title: "View qualifying courses", desc: "See all university and TVET courses you currently qualify for.", bg: "#f0fdf4", border: "#bbf7d0" },
    { href: "/chatbot", title: "Chat with CareerBot", desc: "Discuss your interests and get personalised career advice in any SA language.", bg: "#faf5ff", border: "#e9d5ff" },
    { href: "/grade12", title: "Track your progress", desc: "Upload each term results and see which marks to improve for your dream course.", bg: "#fefce8", border: "#fef08a" },
  ].filter((c) => user.grade !== "gap_year" || c.href !== "/grade12");
  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <Navbar />
      <main style={{maxWidth:1024,margin:"0 auto",padding:"40px 16px"}}>
        <h1 style={{fontSize:28,fontWeight:"bold",color:"#111827",marginBottom:4}}>Welcome, {user.name.split(" ")[0]}!</h1>
        <p style={{color:"#6b7280",marginBottom:32}}>{user.grade==="gap_year"?"Gap year student":"Grade 12 learner"} — what would you like to do today?</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20}}>
          {cards.map((c) => (
            <Link key={c.href} href={c.href} style={{display:"block",background:c.bg,border:"1px solid "+c.border,borderRadius:16,padding:24,textDecoration:"none",transition:"box-shadow 0.2s"}}>
              <h2 style={{fontWeight:600,color:"#111827",fontSize:18,marginBottom:8}}>{c.title}</h2>
              <p style={{color:"#4b5563",fontSize:14,lineHeight:1.6,marginBottom:16}}>{c.desc}</p>
              <span style={{color:"#15803d",fontWeight:500,fontSize:14}}>Get started</span>
            </Link>
          ))}
        </div>
        <div style={{marginTop:32,background:"#15803d",borderRadius:16,padding:24,color:"white"}}>
          <p style={{fontSize:14,opacity:0.8,marginBottom:4}}>Tip</p>
          <p style={{fontWeight:500}}>{user.grade==="gap_year"?"Upload your final matric results to instantly see every course you qualify for.":"Upload your latest term report to track your APS and see which subjects to improve."}</p>
        </div>
      </main>
    </div>
  );
}