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
      className="scroll-mt-24 border-t border-[#D8D2C8] bg-[#F4F1EA] py-20 text-ink"
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-4">
            <Link
              href="/"
              className="block font-serif text-2xl font-semibold tracking-[0.04em] text-ink"
            >
              Clarvo
            </Link>
            <p className="max-w-lg text-sm leading-7 text-[#63534B]">
              {footer.description}
            </p>
          </div>

          <p className="text-sm leading-7 text-[#63534B] md:text-right">
            {footer.betaDisclaimer}
          </p>
        </div>

        <div className="flex flex-col items-center justify-between space-y-4 border-t border-[#D8D2C8] pt-8 md:flex-row md:space-y-0">
          <div className="text-sm text-[#63534B]">
            Copyright {new Date().getFullYear()} Clarvo. {footer.rightsReserved}
          </div>
          <div className="flex space-x-6">
            {footer.legalLinks.map((link, idx) =>
              idx === 2 ? (
                <Link
                  key={link}
                  href={directEmailHref}
                  className="text-sm text-[#63534B] transition-colors hover:text-ink"
                >
                  {link}
                </Link>
              ) : (
                <span key={link} className="text-sm text-[#63534B]">
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
