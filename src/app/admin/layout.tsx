"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        setAuthenticated(d.authenticated);
        setChecking(false);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode }),
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setLoginError("Invalid access code");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
    router.push("/admin");
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">🔒</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Admin Access</h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter access code to continue
            </p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access code"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
            {loginError && (
              <p className="text-red-500 text-sm mb-3">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminSidebar onLogout={handleLogout} />
      <div className="md:pl-56 pb-20 md:pb-0">{children}</div>
    </div>
  );
}
