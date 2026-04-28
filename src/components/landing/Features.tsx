"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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
      className="bg-ivory py-32 border-b border-border/40 scroll-mt-24"
    >
      <div className="container mx-auto px-6 space-y-32">
        {features.map((feature) => (
          <div
            key={feature.title}
            className={`flex flex-col lg:flex-row gap-16 items-center ${
              feature.reverse ? "lg:flex-row-reverse" : ""
            }`}
          >
            <motion.div
              className="flex-1 space-y-6"
              initial={{ opacity: 0, x: feature.reverse ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h3 className="text-3xl md:text-4xl font-serif text-ink tracking-tight mb-4">
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

              <Button
                variant="link"
                className="p-0 text-coral hover:text-coral/80 text-base group"
              >
                {copy.features.exploreWorkflow}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            <motion.div
              className="flex-1 w-full"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-stucco-light border border-border/50">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="object-cover w-full h-full opacity-90 hover:opacity-100 transition-opacity duration-500 MixBlend Multiply"
                />
                <motion.div
                  className="absolute inset-x-8 bottom-8 h-24 bg-white/80 backdrop-blur-md rounded-xl border border-white/40 shadow-xl flex items-center px-6 gap-4"
                  initial={{ opacity: 0, y: 20 }}
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
      </div>
    </section>
  );
}
