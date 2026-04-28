"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { directEmailHref } from "@/lib/landing-copy";

export function Footer() {
  const { copy } = useLanguage();
  const footer = copy.footer;

  return (
    <footer
      id="company"
      className="bg-stucco-light/60 text-ink py-20 border-t border-border/50 scroll-mt-24"
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-4">
            <Link
              href="/"
              className="font-serif text-2xl font-bold text-ink block"
            >
              VERIDICTA
            </Link>
            <p className="text-sm text-stucco-dark max-w-lg leading-relaxed">
              {footer.description}
            </p>
          </div>

          <p className="text-sm text-stucco-dark leading-relaxed md:text-right">
            {footer.betaDisclaimer}
          </p>
        </div>

        <div className="pt-8 border-t border-border/60 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-sm text-stucco-dark">
            Copyright {new Date().getFullYear()} Veridicta. {footer.rightsReserved}
          </div>
          <div className="flex space-x-6">
            {footer.legalLinks.map((link, idx) =>
              idx === 2 ? (
                <Link
                  key={link}
                  href={directEmailHref}
                  className="text-sm text-stucco-dark hover:text-ink transition-colors"
                >
                  {link}
                </Link>
              ) : (
                <span key={link} className="text-sm text-stucco-dark">
                  {link}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
