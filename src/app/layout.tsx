import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Adaptation Companion",
  description: "Turn your family member's condition into a practical, sourced plan for the home and daily routine.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 antialiased">{children}</body>
    </html>
  );
}
