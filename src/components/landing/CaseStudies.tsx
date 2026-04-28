"use client";

import { Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function CaseStudies() {
  const { copy } = useLanguage();
  const caseStudies = copy.caseStudies;

  return (
    <section className="bg-ivory py-32 border-b border-border/40">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-serif text-ink tracking-tight mb-4">
            {caseStudies.titleLead}{" "}
            <span className="italic text-stucco-dark">
              {caseStudies.titleAccent}
            </span>
            .
          </h2>
          <p className="text-lg text-stucco-dark">{caseStudies.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {caseStudies.testimonials.map((testimonial, idx) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
              className="bg-white border border-border/50 p-8 rounded-2xl hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between h-full"
            >
              <div>
                <Quote className="w-8 h-8 text-stucco-mid mb-6 opacity-50" />
                <p className="text-ink font-serif text-xl leading-relaxed mb-8">
                  {testimonial.quote}
                </p>
              </div>

              <div className="border-t border-border/40 pt-6">
                <p className="font-semibold text-ink text-sm uppercase tracking-wider mb-1">
                  {testimonial.author}
                </p>
                <p className="text-stucco-dark text-sm">{testimonial.title}</p>
                <p className="text-coral text-sm mt-1">{testimonial.firm}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
