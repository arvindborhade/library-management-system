import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Library Management System",
  description: "Manage books, members, and borrowings",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
