"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { isLocale, supportedLocales } from "@/lib/landing-copy";

const NAV_ITEMS = [
  { href: "#workflows", key: "workflows" },
  { href: "#practice-areas", key: "practiceAreas" },
  { href: "#security", key: "security" },
  { href: "#company", key: "company" },
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
          ? "bg-ivory/90 dark:bg-ink/90 backdrop-blur-md shadow-sm border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-2xl font-bold tracking-tight text-ink"
        >
          VERIDICTA
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="space-x-1 text-ink hover:text-ink/80"
                aria-label={copy.header.languageLabel}
              >
                <Globe className="w-4 h-4" />
                <span>{locale.toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={locale}
                onValueChange={(value) => {
                  if (isLocale(value)) {
                    setLocale(value);
                  }
                }}
              >
                {supportedLocales.map((language) => (
                  <DropdownMenuRadioItem
                    key={language.code}
                    value={language.code}
                  >
                    {language.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/dashboard"
            className="text-sm font-medium text-ink hover:text-ink/80 transition-colors"
          >
            {copy.header.login}
          </Link>
          <Button className="bg-coral text-ink hover:bg-coral/90 rounded border-0">
            {copy.header.requestDemo}
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
        <div className="md:hidden absolute top-20 left-0 right-0 bg-background border-b border-border p-6 flex flex-col space-y-4 shadow-lg">
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
                      ? "border-coral bg-coral text-ink"
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
              href="/dashboard"
              className="text-lg font-medium text-ink"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {copy.header.login}
            </Link>
            <Button className="bg-coral text-ink hover:bg-coral/90 w-full justify-center">
              {copy.header.requestDemo}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
