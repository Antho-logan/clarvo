"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { betaAccessHref, supportedLocales } from "@/lib/landing-copy";

const NAV_ITEMS = [
  { href: "#product", key: "workflows" },
  { href: "#practice-areas", key: "practiceAreas" },
  { href: "#security", key: "security" },
  { href: "#beta", key: "company" },
] as const;

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { locale, setLocale, copy } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-ivory/95 backdrop-blur-md shadow-sm border-b border-stucco-mid/30"
          : "bg-ivory/70 backdrop-blur-sm border-b border-stucco-mid/15"
      }`}
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-2xl font-semibold tracking-[0.04em] text-ink"
        >
          Veridicta
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-sm font-medium text-ink hover:text-ink/80 transition-colors"
            >
              {copy.header.nav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <div
            aria-label={copy.header.languageLabel}
            className="inline-flex rounded-md border border-stucco-mid/35 bg-white/45 p-1"
          >
            {supportedLocales.map((language) => (
              <button
                key={language.code}
                type="button"
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  locale === language.code
                    ? "bg-ink text-white"
                    : "text-stucco-dark hover:text-ink"
                }`}
                onClick={() => setLocale(language.code)}
              >
                {language.code.toUpperCase()}
              </button>
            ))}
          </div>

          <Link
            href="/login"
            className="text-sm font-medium text-ink hover:text-ink/80 transition-colors"
          >
            {copy.header.login}
          </Link>
          <Button
            asChild
            className="h-10 rounded-md border-0 bg-[#D94A1E] px-5 text-sm font-medium text-white shadow-sm hover:bg-[#B83A14]"
          >
            <Link href={betaAccessHref}>{copy.header.requestDemo}</Link>
          </Button>
        </div>

        <button
          className="md:hidden text-ink"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-ivory border-b border-border p-6 flex flex-col space-y-4 shadow-lg">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-lg font-medium text-foreground py-2 border-b border-border/50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {copy.header.nav[item.key]}
            </Link>
          ))}

          <div className="pt-4 space-y-3">
            <p className="text-xs font-semibold tracking-wider uppercase text-ink">
              {copy.header.languageLabel}
            </p>
            <div className="flex gap-2">
              {supportedLocales.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    locale === language.code
                      ? "border-[#D94A1E] bg-[#D94A1E] text-white"
                      : "border-border text-ink hover:bg-accent/50"
                  }`}
                  onClick={() => setLocale(language.code)}
                >
                  {language.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col space-y-4 border-t border-border/50">
            <Link
              href="/login"
              className="text-lg font-medium text-ink"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {copy.header.login}
            </Link>
            <Button
              asChild
              className="h-11 w-full whitespace-nowrap bg-[#D94A1E] px-5 font-medium text-white shadow-sm hover:bg-[#B83A14] justify-center"
            >
              <Link
                href={betaAccessHref}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {copy.header.requestDemo}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
