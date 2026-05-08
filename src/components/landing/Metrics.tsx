"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function Metrics() {
  const { copy } = useLanguage();
  const metrics = copy.metrics;

  return (
    <section className="border-b border-[#D8D2C8] bg-[#FBFAF7] py-24 md:py-28 lg:py-32">
      <div className="container mx-auto px-6">
        <h2 className="max-w-3xl font-serif text-4xl font-medium leading-tight text-ink md:text-5xl">
          {metrics.title}
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {metrics.columns.map((column) => (
            <article
              key={column.title}
              className="rounded-xl border border-[#D8D2C8] bg-white p-6 shadow-sm"
            >
              <h3 className="font-serif text-2xl text-ink">{column.title}</h3>
              <ul className="mt-6 space-y-4">
                {column.items.map((item) => (
                  <li
                    key={item}
                    className="border-t border-[#EEEDE4] pt-4 text-sm leading-7 text-[#63534B] first:border-t-0 first:pt-0"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
