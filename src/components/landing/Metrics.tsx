"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Metrics() {
  const { copy } = useLanguage();
  const metrics = copy.metrics;

  return (
    <section className="bg-stucco-light/40 text-ink py-32 border-b border-border/40">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-serif text-ink tracking-tight mb-12">
          {metrics.title}
        </h2>
        <div className="grid md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {metrics.columns.map((column, idx) => (
            <motion.div
              key={column.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.15, ease: "easeOut" }}
              className={`pt-8 md:pt-0 ${
                idx !== 0 ? "md:pl-8 lg:pl-12" : ""
              }`}
            >
              <h3 className="text-xl font-serif text-ink mb-6">
                {column.title}
              </h3>
              <ul className="space-y-4">
                {column.items.map((item) => (
                  <li
                    key={item}
                    className="text-stucco-dark text-sm uppercase tracking-widest leading-relaxed font-medium"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
