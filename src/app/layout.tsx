import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoBrain — Job Search Intelligence",
  description:
    "Realtime job search, application tracking, and funnel analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}