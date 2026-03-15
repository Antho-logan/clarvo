import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { BrowserExtensionErrorGuard } from "@/components/providers/BrowserExtensionErrorGuard";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Veridicta | Professional-Grade Legal AI",
  description: "AI Agents for Europe’s Legal Teams. Built for legal work that demands precision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased text-foreground bg-background`}>
        <BrowserExtensionErrorGuard />
        {children}
      </body>
    </html>
  );
}
