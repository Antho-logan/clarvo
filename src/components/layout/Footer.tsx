"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Footer() {
  const { copy } = useLanguage();
  const footer = copy.footer;

  return (
    <footer
      id="company"
      className="bg-ink text-ink py-20 border-t border-white/10 scroll-mt-24"
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-12 mb-16">
          <div className="md:col-span-2 space-y-4">
            <Link
              href="/"
              className="font-serif text-2xl font-bold tracking-tight text-ink block"
            >
              VERIDICTA
            </Link>
            <p className="text-sm text-ink/70 max-w-xs leading-relaxed">
              {footer.description}
            </p>
          </div>

          {footer.columns.map((column) => (
            <div key={column.title} className="space-y-4">
              <h4 className="text-sm font-semibold tracking-wider text-ink uppercase">
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-ink/70 hover:text-ink transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-sm text-ink/70">
            © {new Date().getFullYear()} Veridicta. {footer.rightsReserved}
          </div>
          <div className="flex space-x-6">
            {footer.legalLinks.map((link) => (
              <Link
                key={link}
                href="#"
                className="text-sm text-ink/70 hover:text-ink transition-colors"
              >
                {link}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
