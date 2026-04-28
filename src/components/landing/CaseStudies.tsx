"use client";

import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function CaseStudies() {
  const { copy } = useLanguage();
  const caseStudies = copy.caseStudies;

  return (
    <section className="bg-ivory py-24 border-b border-border/40 md:py-28 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="mb-4 break-words text-3xl font-serif text-ink [overflow-wrap:anywhere] md:text-5xl">
            {caseStudies.titleLead}{" "}
            <span className="italic text-stucco-dark">
              {caseStudies.titleAccent}
            </span>
            .
          </h2>
          <p className="text-lg text-stucco-dark">{caseStudies.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {caseStudies.principles.map((principle, idx) => (
            <motion.div
              key={principle.title}
              initial={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
              className="bg-white border border-border/50 p-8 rounded-2xl hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between h-full"
            >
              <div>
                <CheckCircle2 className="w-8 h-8 text-coral mb-6 opacity-80" />
                <h3 className="text-lg font-semibold text-ink mb-4">
                  {principle.title}
                </h3>
                <p className="text-ink font-serif text-xl leading-relaxed mb-8">
                  {principle.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
