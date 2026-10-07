"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  DollarSign,
  Upload,
  FolderOpen,
  ScrollText,
  LogOut,
  ArrowLeftRight,
  FileText,
  Receipt,
  FileCheck,
  ChevronRight,
  BookOpen,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Finance",
    items: [
      { href: "/admin/expense", label: "Expense Reports", icon: DollarSign },
      { href: "/admin/expense/po-report", label: "PO Reports", icon: FileText },
      { href: "/admin/expense/voucher-report", label: "Voucher Reports", icon: Receipt },
      { href: "/admin/expense/acr-report", label: "ACR Reports", icon: FileCheck },
      { href: "/admin/budget-control", label: "Budget Control", icon: ArrowLeftRight },
    ],
  },
  {
    heading: "Data",
    items: [
      { href: "/admin/gl-codes", label: "Budget GL Codes", icon: BookOpen },
      { href: "/admin/upload", label: "Upload Budget", icon: Upload },
      { href: "/admin/uploads", label: "Upload History", icon: FolderOpen },
    ],
  },
  {
    heading: "System",
    items: [
      { href: "/admin/logs", label: "Logs", icon: ScrollText },
    ],
  },
];

const flatItems = navGroups.flatMap((g) => g.items);

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

interface Props {
  onLogout: () => void;
}

export default function AdminSidebar({ onLogout }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (heading: string) =>
    setCollapsed((prev) => ({ ...prev, [heading]: !prev[heading] }));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:top-16 bg-[#fafafa] border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-2 pb-4 overflow-y-auto">
          <nav className="flex-1 px-3">
            {navGroups.map((group) => {
              const isCollapsed = collapsed[group.heading];
              const hasActive = group.items.some((item) =>
                isActive(item.href, pathname)
              );

              return (
                <div key={group.heading} className="mb-1">
                  {/* Section heading */}
                  <button
                    onClick={() => toggle(group.heading)}
                    className={`flex items-center justify-between w-full px-2 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
                      hasActive && !isCollapsed
                        ? "text-gray-900"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {group.heading}
                    <ChevronRight
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isCollapsed ? "" : "rotate-90"
                      }`}
                    />
                  </button>

                  {/* Items */}
                  {!isCollapsed && (
                    <div className="ml-1 border-l border-gray-200 pl-2 mb-2">
                      {group.items.map((item) => {
                        const active = isActive(item.href, pathname);
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center gap-2.5 px-2.5 py-[7px] text-[13px] rounded-md transition-all duration-150 ${
                              active
                                ? "bg-white text-blue-600 font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-gray-200/60"
                                : "text-gray-600 hover:bg-white/80 hover:text-gray-900"
                            }`}
                          >
                            <item.icon
                              className={`w-4 h-4 flex-shrink-0 ${
                                active
                                  ? "text-blue-600"
                                  : "text-gray-400 group-hover:text-gray-500"
                              }`}
                            />
                            {item.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 mt-auto border-t border-gray-200 pt-3">
            <button
              onClick={onLogout}
              className="flex items-center gap-2.5 w-full px-2.5 py-[7px] text-[13px] text-gray-500 hover:bg-white hover:text-gray-900 rounded-md transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-pb">
        <div className="flex items-center justify-around py-1.5">
          {flatItems.slice(0, 5).map((item) => {
            const active = isActive(item.href, pathname);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] rounded-lg transition ${
                  active ? "text-blue-600 font-medium" : "text-gray-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label.split(" ")[0]}
              </a>
            );
          })}
          <button
            onClick={onLogout}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-gray-400 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}
