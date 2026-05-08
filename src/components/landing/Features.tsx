"use client";

import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Features() {
  const { copy } = useLanguage();
  const features = copy.features;

  return (
    <section
      id="practice-areas"
      className="scroll-mt-24 border-b border-[#D8D2C8] bg-[#F4F1EA] py-24 md:py-28 lg:py-32"
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl">
          <span className="mb-4 block text-sm font-semibold uppercase tracking-[0.08em] text-[#D94A1E]">
            {features.eyebrow}
          </span>
          <h2 className="font-serif text-4xl font-medium leading-tight text-ink md:text-5xl">
            {features.titleLead}{" "}
            <span className="text-[#63534B]">{features.titleAccent}</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#63534B]">
            {features.description}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.items.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-[#D8D2C8] bg-white p-6 shadow-sm"
            >
              <div className="mb-5 inline-flex rounded-full border border-[#D94A1E]/25 bg-[#FFF6F1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#9E3515]">
                {feature.badge}
              </div>
              <h3 className="font-serif text-2xl text-ink">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-[#63534B]">
                {feature.description}
              </p>
              <ul className="mt-6 space-y-3">
                {feature.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-center gap-3 text-sm font-medium text-[#63534B]"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#D94A1E]" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mt-10 max-w-3xl text-base leading-7 text-[#63534B]">
          {features.footerLine}
        </p>
      </div>
    </section>
  );
}
