"use client";

import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Budget" },
  { href: "/budget-codes", label: "Budget Codes" },
];

export default function TopNav() {
  const pathname = usePathname();

  // Hide on admin pages — admin has its own sidebar
  if (pathname.startsWith("/admin")) {
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KC</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">Kulhudhuffushi City Council</h1>
                <p className="text-xs text-gray-500">Approved Budget 2026</p>
              </div>
            </a>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <a href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">KC</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Kulhudhuffushi City Council</h1>
              <p className="text-xs text-gray-500">Approved Budget 2026</p>
            </div>
          </a>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-0 -mb-px">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <a
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
