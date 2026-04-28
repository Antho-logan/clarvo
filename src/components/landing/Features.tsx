"use client";

import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

const FEATURE_IMAGES = [
  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2940&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543286386-2e659306cd6c?q=80&w=2940&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2940&auto=format&fit=crop",
];

export function Features() {
  const { copy } = useLanguage();
  const features = copy.features.items.map((item, idx) => ({
    ...item,
    image: FEATURE_IMAGES[idx],
    reverse: idx === 1,
  }));

  return (
    <section
      id="practice-areas"
      className="bg-ivory py-24 border-b border-border/40 scroll-mt-24 md:py-28 lg:py-32"
    >
      <div className="container mx-auto px-6 space-y-24 md:space-y-28">
        <div className="max-w-3xl">
          <span className="text-coral font-semibold tracking-wider uppercase text-sm mb-4 block">
            {copy.features.eyebrow}
          </span>
          <h2 className="mb-6 text-3xl font-serif leading-tight text-ink sm:text-4xl md:text-5xl">
            {copy.features.titleLead}{" "}
            <span className="italic text-stucco-dark">
              {copy.features.titleAccent}
            </span>
          </h2>
          <p className="text-lg text-stucco-dark leading-relaxed">
            {copy.features.description}
          </p>
        </div>

        {features.map((feature) => (
          <div
            key={feature.title}
            className={`flex flex-col lg:flex-row gap-10 lg:gap-16 items-center ${
              feature.reverse ? "lg:flex-row-reverse" : ""
            }`}
          >
            <motion.div
              className="flex-1 space-y-6"
              initial={{ opacity: 1, x: 0 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex w-fit rounded-full border border-coral/30 bg-coral/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-coral">
                {feature.badge}
              </div>
              <h3 className="mb-4 text-3xl font-serif text-ink md:text-4xl">
                {feature.title}
              </h3>
              <p className="text-lg text-stucco-dark leading-relaxed">
                {feature.description}
              </p>

              <ul className="space-y-4 pt-4 mb-8">
                {feature.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-center text-stucco-dark font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5 text-coral mr-3 opacity-90" />
                    {bullet}
                  </li>
                ))}
              </ul>

              <p className="text-sm font-semibold uppercase tracking-wider text-coral">
                {copy.features.exploreWorkflow}
              </p>
            </motion.div>

            <motion.div
              className="flex-1 w-full"
              initial={{ opacity: 1, scale: 1 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-stucco-light border border-border/50">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="h-full w-full object-cover opacity-90 transition-opacity duration-500 hover:opacity-100"
                />
                <motion.div
                  className="absolute inset-x-4 bottom-4 min-h-24 bg-white/85 backdrop-blur-md rounded-xl border border-white/40 shadow-xl flex items-center px-5 py-4 gap-4 sm:inset-x-8 sm:bottom-8 sm:px-6"
                  initial={{ opacity: 1, y: 0 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                >
                  <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center shrink-0">
                    <div className="w-4 h-4 bg-coral rounded-full animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {copy.features.analysisComplete}
                    </div>
                    <div className="text-xs text-stucco-dark">
                      {copy.features.analysisSummary}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        ))}

        <p className="max-w-3xl text-base text-stucco-dark leading-relaxed">
          {copy.features.footerLine}
        </p>
      </div>
    </section>
  );
}
