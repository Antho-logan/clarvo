"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { betaAccessHref, walkthroughHref } from "@/lib/landing-copy";

export function Hero() {
  const { copy } = useLanguage();
  const hero = copy.hero;

  return (
    <section className="relative flex min-h-[640px] items-center justify-center overflow-hidden bg-ivory pt-28 pb-24 md:min-h-[760px] md:pt-32 md:pb-28 lg:min-h-[820px]">
      <div
        className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1589391886645-d51941baf7fb?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-[position:62%_center] opacity-[0.18] md:bg-center md:opacity-25"
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-0 bg-gradient-to-b from-ivory via-ivory/85 to-stucco-light/40" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-ivory via-ivory/90 to-ivory/55" />
      <div className="pointer-events-none absolute -top-32 -right-24 z-0 h-[420px] w-[420px] rounded-full bg-stucco-mid/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 z-0 h-[360px] w-[360px] rounded-full bg-coral/10 blur-[120px]" />

      <div className="container relative z-10 mx-auto grid w-full min-w-0 gap-12 px-6 lg:grid-cols-12 lg:items-center">
        <div className="min-w-0 space-y-7 lg:col-span-7 lg:space-y-8">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center rounded-full border border-stucco-mid/40 bg-white/85 px-3 py-1 text-sm text-ink shadow-sm backdrop-blur-md mb-6">
              <span className="flex h-2 w-2 rounded-full bg-coral mr-2" />
              {hero.banner}
            </div>
            <h1
              aria-label={`${hero.titleLead} ${hero.titleAccent}`}
              className="mb-6 font-serif text-4xl leading-[1.08] text-ink sm:text-5xl md:text-6xl lg:text-7xl"
            >
              <span className="block">{hero.titleLead}</span>
              <span className="block italic text-stucco-dark">{hero.titleAccent}</span>
            </h1>
            <p className="max-w-2xl text-lg font-normal leading-relaxed text-stucco-dark md:text-xl">
              {hero.description}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              asChild
              size="lg"
              className="h-14 w-full whitespace-nowrap bg-coral px-8 text-base font-medium text-white shadow-lg shadow-coral/20 hover:bg-coral/90 sm:w-auto"
            >
              <Link href={betaAccessHref}>{hero.primaryCta}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 w-full whitespace-nowrap border-stucco-mid/50 bg-white/80 px-8 text-base text-ink backdrop-blur-sm hover:bg-white sm:w-auto"
            >
              <Link href={walkthroughHref}>
                <PlayCircle className="mr-2 w-5 h-5" />
                {hero.secondaryCta}
              </Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="lg:col-span-5 hidden lg:block"
        >
          <div className="relative min-h-[260px] overflow-hidden rounded-2xl border border-stucco-mid/30 bg-white/90 p-6 shadow-[0_30px_60px_-25px_rgba(31,29,26,0.25)] backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-coral/60 to-transparent" />

            <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-stucco-mid/50" />
                <div className="w-3 h-3 rounded-full bg-stucco-mid/50" />
                <div className="w-3 h-3 rounded-full bg-stucco-mid/50" />
              </div>
              <span className="text-xs text-ink font-medium uppercase tracking-wider">
                {hero.panelLabel}
              </span>
            </div>

            <div className="space-y-4">
              <div className="h-4 bg-stucco-light rounded-sm w-3/4 animate-pulse" />
              <div className="h-4 bg-stucco-light rounded-sm w-full animate-pulse" />
              <div className="h-4 bg-stucco-light rounded-sm w-5/6 animate-pulse" />

              <div className="pt-4 mt-2 border-t border-border/50 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-[10px] bg-coral/20 text-coral rounded">
                    {hero.riskBadge}
                  </span>
                  <span className="px-2 py-1 text-[10px] bg-stucco-light text-ink rounded">
                    {hero.lawBadge}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-coral hover:bg-coral/10 hover:text-coral h-8"
                >
                  {hero.panelAction}
                  <ArrowRight className="ml-1 w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-stucco-mid/30 bg-ivory/85 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stucco-dark sm:text-xs">
            {hero.trustStrip[0]}
          </span>
          <span className="text-coral" aria-hidden="true">•</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stucco-dark sm:text-xs">
            {hero.trustStrip[1]}
          </span>
          <span className="text-coral" aria-hidden="true">•</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stucco-dark sm:text-xs">
            {hero.trustStrip[2]}
          </span>
        </div>
      </div>
    </section>
  );
}
