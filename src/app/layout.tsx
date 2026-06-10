import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kulhudhuffushi City Council - Budget 2026",
  description:
    "View and explore the approved budget for Kulhudhuffushi City Council 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">KC</span>
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-900">
                    Kulhudhuffushi City Council
                  </h1>
                  <p className="text-xs text-gray-500">Approved Budget 2026</p>
                </div>
              </a>
              <div className="flex items-center gap-4">
                <a
                  href="/"
                  className="text-sm text-gray-600 hover:text-gray-900 transition"
                >
                  Budget
                </a>
                <a
                  href="/admin"
                  className="text-sm text-gray-600 hover:text-gray-900 transition"
                >
                  Admin
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
