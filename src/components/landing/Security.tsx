"use client";

import { FileSignature, Lock, Scale, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const TRUST_ICONS = [FileSignature, ShieldCheck, Lock, Scale] as const;

export function Security() {
  const { copy } = useLanguage();
  const principles = copy.security.principles.map((item, idx) => ({
    ...item,
    icon: TRUST_ICONS[idx] ?? ShieldCheck,
  }));

  return (
    <section
      id="security"
      className="scroll-mt-24 border-b border-[#D8D2C8] bg-[#F4F1EA] py-24 md:py-28 lg:py-32"
    >
      <div className="container mx-auto grid gap-12 px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D94A1E]/25 bg-[#FFF6F1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#9E3515]">
            <Lock className="h-3.5 w-3.5" />
            <span>{copy.security.badge}</span>
          </div>
          <h2 className="font-serif text-4xl font-medium leading-tight text-ink md:text-5xl">
            {copy.security.titleLead}{" "}
            <span className="text-[#63534B]">{copy.security.titleAccent}</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#63534B]">
            {copy.security.description}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {principles.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-[#D8D2C8] bg-white p-6 shadow-sm"
            >
              <item.icon className="mb-5 h-6 w-6 text-[#D94A1E]" />
              <h3 className="text-base font-semibold text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#63534B]">
                {item.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
