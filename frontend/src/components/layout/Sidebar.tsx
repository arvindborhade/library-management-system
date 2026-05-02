"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/books", label: "Books", icon: "📚" },
  { href: "/members", label: "Members", icon: "👥" },
  { href: "/borrowings", label: "Borrowings", icon: "📋" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">📖 LibraryMS</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === href
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
