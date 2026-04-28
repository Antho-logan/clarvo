"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { betaAccessHref, directEmailHref, walkthroughHref } from "@/lib/landing-copy";

export function Cta() {
  const { copy } = useLanguage();
  const cta = copy.cta;

  return (
    <section className="bg-stucco-light py-24 border-b border-border/40 relative overflow-hidden md:py-28 lg:py-32">
      <div className="absolute top-0 right-0 w-64 h-64 bg-stucco-mid/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-ivory/80 rounded-full blur-[100px]" />

      <motion.div
        className="container mx-auto px-6 relative z-10 max-w-5xl"
        initial={{ opacity: 1, scale: 1 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="mb-16 rounded-2xl border border-border/50 bg-white/70 p-6 shadow-[0_20px_40px_-25px_rgba(31,29,26,0.25)] backdrop-blur-sm md:p-10">
          <span className="text-coral font-semibold tracking-wider uppercase text-sm mb-4 block">
            {cta.betaEyebrow}
          </span>
          <h2 className="mb-6 text-3xl font-serif leading-tight text-ink md:text-5xl">
            {cta.betaTitle}
          </h2>
          <p className="text-lg text-stucco-dark leading-relaxed mb-6">
            {cta.betaDescription}
          </p>
          <p className="text-lg text-stucco-dark leading-relaxed mb-8">
            {cta.betaPartnerLine}
          </p>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink mb-4">
            {cta.betaListTitle}
          </h3>
          <ul className="grid md:grid-cols-3 gap-4 mb-8">
            {cta.betaList.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-border/50 bg-white/60 p-4 text-sm text-stucco-dark leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
          <Button
            asChild
            size="lg"
            className="h-12 bg-coral px-6 text-base font-medium text-white shadow-md shadow-coral/20 hover:bg-coral/90"
          >
            <Link href={betaAccessHref}>{cta.betaCta}</Link>
          </Button>
        </div>

        <div className="text-center">
          <h2 className="mb-8 text-3xl font-serif leading-tight text-ink sm:text-4xl md:text-6xl">
            {cta.titleLead} <br /> {cta.titleAccent}
          </h2>
          <p className="text-xl text-stucco-dark leading-relaxed mb-12 max-w-2xl mx-auto">
            {cta.description}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button
              asChild
              size="lg"
              className="h-14 w-full whitespace-nowrap bg-coral px-8 text-base font-medium text-white shadow-xl shadow-coral/20 hover:bg-coral/90 sm:w-auto"
            >
              <Link href={betaAccessHref}>{cta.primaryCta}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 w-full whitespace-nowrap border-stucco-mid/50 bg-white/80 px-8 text-base text-ink hover:bg-white sm:w-auto group"
            >
              <Link href={walkthroughHref}>
                {cta.secondaryCta}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <Link
            href={directEmailHref}
            className="text-sm text-stucco-dark hover:text-ink transition-colors"
          >
            {cta.tertiaryLine}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
