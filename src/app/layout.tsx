import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { BrowserExtensionErrorGuard } from "@/components/providers/BrowserExtensionErrorGuard";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "optional",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "optional",
});

export const metadata: Metadata = {
  title: "Veridicta — Dutch legal research, grounded in sources",
  description:
    "A research assistant for Dutch legal professionals. Ask source-backed questions across Dutch legislation and case law, and inspect every citation. Currently in private beta, focused on employment and tenancy law.",
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
