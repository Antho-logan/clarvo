"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Cta() {
  const { copy } = useLanguage();
  const cta = copy.cta;

  return (
    <section className="bg-stucco-light py-32 border-b border-border/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-stucco-mid/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-ivory/80 rounded-full blur-[100px]" />

      <motion.div
        className="container mx-auto px-6 relative z-10 text-center max-w-3xl"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h2 className="text-4xl md:text-6xl font-serif text-ink tracking-tight mb-8">
          {cta.titleLead} <br /> {cta.titleAccent}
        </h2>
        <p className="text-xl text-stucco-dark leading-relaxed mb-12 max-w-2xl mx-auto">
          {cta.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-coral hover:bg-coral/90 text-ink border-0 h-14 px-8 text-base shadow-xl shadow-coral/20 w-full sm:w-auto"
          >
            <Link href="/dashboard">{cta.primaryCta}</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 px-8 text-base border-border text-ink hover:bg-white w-full sm:w-auto group"
          >
            {cta.secondaryCta}
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
