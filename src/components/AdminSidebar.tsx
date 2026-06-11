"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/expense", label: "Expense", icon: "💰" },
  { href: "/admin/upload", label: "Upload Excel", icon: "📤" },
  { href: "/admin/uploads", label: "Uploads", icon: "📁" },
  { href: "/admin/logs", label: "Logs", icon: "📋" },
];

interface Props {
  onLogout: () => void;
}

export default function AdminSidebar({ onLogout }: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 md:top-16 bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-4 pb-4 overflow-y-auto">
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition ${
                    active
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </a>
              );
            })}
          </nav>
          <div className="px-3 mt-auto">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition"
            >
              <span className="text-base">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : item.href === "/"
                  ? false
                  : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs rounded-lg transition ${
                  active
                    ? "text-blue-700 font-medium"
                    : "text-gray-500"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
          <button
            onClick={onLogout}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-gray-500 rounded-lg transition"
          >
            <span className="text-lg">🚪</span>
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}
