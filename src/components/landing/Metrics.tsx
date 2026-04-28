"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Metrics() {
  const { copy } = useLanguage();

  return (
    <section className="bg-ink text-ink py-32 border-b border-white/10">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {copy.metrics.stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.15, ease: "easeOut" }}
              className={`flex flex-col pt-8 md:pt-0 ${
                idx !== 0 ? "md:pl-8 lg:pl-12" : ""
              }`}
            >
              <div className="flex items-baseline mb-4">
                <span className="text-6xl md:text-7xl lg:text-8xl font-serif text-ink tracking-tighter">
                  {stat.value}
                </span>
              </div>
              <p className="text-ink/70 text-sm uppercase tracking-widest leading-relaxed whitespace-pre-line font-medium">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
