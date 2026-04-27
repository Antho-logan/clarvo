"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function Hero() {
  const { copy } = useLanguage();
  const hero = copy.hero;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-ink overflow-hidden pt-20">
      <div
        className="absolute inset-0 z-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1589391886645-d51941baf7fb?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center"
        aria-hidden="true"
      />

      <div className="absolute inset-0 z-0 bg-gradient-to-t from-ink via-ink/80 to-transparent" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-ink/90 via-ink/50 to-transparent" />

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm text-ink backdrop-blur-md mb-6">
              <span className="flex h-2 w-2 rounded-full bg-coral mr-2" />
              {hero.banner}
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-ink tracking-tight leading-[1.1] mb-6">
              {hero.titleLead} <br />
              <span className="text-ink italic">{hero.titleAccent}</span>
            </h1>
            <p className="text-lg md:text-xl text-ink/80 max-w-2xl leading-relaxed font-light">
              {hero.description}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              className="bg-coral hover:bg-coral/90 text-ink border-0 h-14 px-8 text-base"
            >
              {hero.primaryCta}
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base border-white/20 text-ink hover:bg-white/10 glassmorphism bg-transparent"
            >
              <Link href="/dashboard">
                <PlayCircle className="mr-2 w-5 h-5" />
                {hero.secondaryCta}
              </Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="lg:col-span-5 hidden lg:block"
        >
          <div className="glassmorphism rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-coral/50 to-transparent opacity-50" />

            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <span className="text-xs text-ink font-medium uppercase tracking-wider">
                {hero.panelLabel}
              </span>
            </div>

            <div className="space-y-4">
              <div className="h-4 bg-white/10 rounded-sm w-3/4 animate-pulse" />
              <div className="h-4 bg-white/10 rounded-sm w-full animate-pulse" />
              <div className="h-4 bg-white/10 rounded-sm w-5/6 animate-pulse" />

              <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-[10px] bg-coral/20 text-coral rounded">
                    {hero.riskBadge}
                  </span>
                  <span className="px-2 py-1 text-[10px] bg-white/10 text-ink rounded">
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

      <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-ink/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-center opacity-80 text-center">
          <p className="text-sm text-ink font-medium uppercase tracking-widest letter-spacing-2">
            {hero.trustStrip[0]}
            <span className="mx-3 text-coral">•</span>
            {hero.trustStrip[1]}
            <span className="mx-3 text-coral">•</span>
            {hero.trustStrip[2]}
          </p>
        </div>
      </div>
    </section>
  );
}
