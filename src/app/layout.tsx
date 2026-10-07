import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";

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
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
