"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/results", label: "Results" },
  { href: "/chatbot", label: "CareerBot" },
  { href: "/grade12", label: "Progress" },
];
export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isGapYear = user?.grade === "gap_year";
  const visibleLinks = isGapYear ? links.filter((l) => l.href !== "/grade12") : links;
  const gradeLabel = isGapYear ? "Gap year" : `Grade ${user?.grade || "12"}`;
  return (
    <nav className="bg-white border-b border-[var(--line)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 no-underline shrink-0">
          <span className="font-display font-bold text-[var(--green-700)] text-lg tracking-tight">CareerPath SA</span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {visibleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors ${
                pathname === l.href
                  ? "bg-[var(--green-50)] text-[var(--green-700)]"
                  : "text-[var(--ink-60)] hover:text-[var(--ink)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-60)] bg-[var(--paper)] border border-[var(--line)] rounded-full px-3 py-1.5">
            {user?.name?.split(" ")[0]} — {gradeLabel}
          </span>
          <button onClick={logout} className="btn-secondary !py-2 !px-4 text-sm">Log out</button>
        </div>
      </div>
    </nav>
  );
}