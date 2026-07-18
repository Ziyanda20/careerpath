"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/dashboard", label: "Dashboard",  icon: "🏠" },
  { href: "/upload",    label: "Upload",      icon: "📄" },
  { href: "/results",   label: "My Results",  icon: "🎯" },
  { href: "/chatbot",   label: "CareerBot",   icon: "🤖" },
  { href: "/grade11",   label: "Progress",    icon: "📈" },
];

export default function Navbar() {
  const pathname      = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <span className="font-bold text-green-700">CareerPath SA</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden md:block">
            Hi, {user?.name?.split(" ")[0]} 👋
          </span>
          <button onClick={logout} className="btn-secondary text-sm py-2 px-4">
            Log out
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 z-50">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs ${
              pathname === l.href ? "text-green-700" : "text-gray-500"
            }`}
          >
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
