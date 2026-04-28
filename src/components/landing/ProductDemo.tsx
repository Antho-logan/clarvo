"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Paperclip,
  Wand2,
  GitCompare,
  Languages,
  ArrowRight,
  FileText,
  BookOpen,
  Landmark,
  Briefcase,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { betaAccessHref } from "@/lib/landing-copy";

const CHIP_ICONS = [FileText, Landmark, BookOpen, Briefcase, Clock] as const;

export function ProductDemo() {
  const [isHovered, setIsHovered] = useState(false);
  const { copy } = useLanguage();
  const productDemo = copy.productDemo;

  return (
    <section
      id="workflows"
      className="bg-stucco-light/30 py-24 border-b border-border/40 relative overflow-hidden scroll-mt-24 md:py-28 lg:py-32"
    >
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-white/40 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-1/3 h-1/3 bg-stucco-mid/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div className="text-center mb-16">
          <span className="text-coral font-semibold tracking-wider uppercase text-sm mb-4 block">
            {productDemo.eyebrow}
          </span>
          <h2 className="mb-6 text-3xl font-serif leading-tight text-ink sm:text-4xl md:text-5xl">
            {productDemo.titleLead}{" "}
            <span className="italic text-stucco-dark">
              {productDemo.titleAccent}
            </span>
          </h2>
          <p className="text-lg text-stucco-dark max-w-2xl mx-auto">
            {productDemo.description}
          </p>
        </div>

        <motion.div
          className="bg-ivory border border-border/60 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white px-5 py-4 flex flex-col gap-3 border-b border-border/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge
                variant="outline"
                className="bg-stucco-light/50 text-ink font-medium border-border/50"
              >
                {productDemo.matterBadge}
              </Badge>
              <Badge
                variant="outline"
                className="bg-stucco-light/50 text-ink font-medium border-border/50"
              >
                {productDemo.languageBadge}
              </Badge>
            </div>
            <div className="hidden space-x-2 sm:flex">
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
            </div>
          </div>

          <div className="p-5 pb-4 sm:p-8 sm:pb-4">
            <p className="mb-8 font-serif text-xl leading-relaxed text-ink sm:text-2xl">
              {productDemo.prompt.beforeLaw}
              <span className="text-coral bg-coral/5 px-1 rounded">
                {productDemo.prompt.highlightedLaw}
              </span>
              {productDemo.prompt.between}
              <span className="font-medium underline decoration-stucco-mid underline-offset-4">
                {productDemo.prompt.highlightedDeliverable}
              </span>
              {productDemo.prompt.after}
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {productDemo.chips.map((chip, idx) => {
                const Icon = CHIP_ICONS[idx];
                const isHighlighted = idx === 0 || idx === 1;

                return (
                  <div
                    key={chip}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm transition-colors cursor-pointer ${
                      isHighlighted
                        ? "border-coral bg-coral/5 text-coral"
                        : "border-border text-muted-foreground hover:bg-white hover:text-ink"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{chip}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-4 border-t border-border/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                aria-label={productDemo.chips[0]}
                disabled
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-stucco-light hover:text-ink rounded-lg h-9 w-9"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                aria-label={productDemo.chips[1]}
                disabled
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-stucco-light hover:text-ink rounded-lg h-9 w-9"
              >
                <Wand2 className="w-4 h-4" />
              </Button>
              <Button
                aria-label={productDemo.chips[2]}
                disabled
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-stucco-light hover:text-ink rounded-lg h-9 w-9"
              >
                <GitCompare className="w-4 h-4" />
              </Button>
              <Button
                aria-label={productDemo.chips[3]}
                disabled
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-stucco-light hover:text-ink rounded-lg h-9 w-9"
              >
                <Languages className="w-4 h-4" />
              </Button>
            </div>

            <Button
              asChild
              className={`h-11 w-full whitespace-nowrap rounded-lg bg-coral px-5 font-medium text-white transition-all duration-300 hover:bg-coral/90 sm:w-auto ${
                isHovered ? "shadow-md shadow-coral/20" : ""
              }`}
            >
              <Link href={betaAccessHref}>
                {productDemo.primaryCta}
                <ArrowRight
                  className={`ml-2 w-4 h-4 transition-transform ${
                    isHovered ? "translate-x-1" : ""
                  }`}
                />
              </Link>
            </Button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {productDemo.capabilities.map((card, idx) => (
            <motion.div
              key={card.title}
              className="bg-white border md:border-t-4 md:border-t-coral border-border/40 p-5 rounded-xl shadow-sm"
              initial={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + idx * 0.1 }}
            >
              <h3 className="text-sm font-semibold text-ink mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-stucco-dark leading-relaxed">
                {card.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16">
          <span className="text-coral font-semibold tracking-wider uppercase text-sm mb-4 block">
            {productDemo.stepsSubtitle}
          </span>
          <h3 className="text-3xl md:text-4xl font-serif text-ink mb-8">
            {productDemo.stepsTitle}
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {productDemo.steps.map((step, idx) => (
              <motion.div
                key={step.title}
                className="bg-white border border-border/40 p-5 rounded-xl shadow-sm"
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-coral">
                  Step {idx + 1}
                </div>
                <h4 className="text-base font-semibold text-ink mb-2">
                  {step.title}
                </h4>
                <p className="text-sm text-stucco-dark leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
