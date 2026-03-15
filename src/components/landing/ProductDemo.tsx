"use client";

import { useState } from "react";
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

const CHIP_ICONS = [FileText, Landmark, BookOpen, Briefcase, Clock] as const;

export function ProductDemo() {
  const [isHovered, setIsHovered] = useState(false);
  const { copy } = useLanguage();
  const productDemo = copy.productDemo;

  return (
    <section
      id="workflows"
      className="bg-stucco-light/30 py-32 border-b border-border/40 relative overflow-hidden scroll-mt-24"
    >
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-white/40 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-1/3 h-1/3 bg-stucco-mid/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div className="text-center mb-16">
          <span className="text-coral font-semibold tracking-wider uppercase text-sm mb-4 block">
            {productDemo.eyebrow}
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-ink tracking-tight mb-6">
            {productDemo.titleLead} <br /> {productDemo.titleAccent}
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
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center space-x-3">
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
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
            </div>
          </div>

          <div className="p-8 pb-4">
            <p className="font-serif text-2xl text-ink leading-relaxed mb-8">
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

          <div className="bg-white p-4 border-t border-border/40 flex items-center justify-between">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-stucco-light hover:text-ink rounded-lg h-9 w-9"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-stucco-light hover:text-ink rounded-lg h-9 w-9"
              >
                <Wand2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-stucco-light hover:text-ink rounded-lg h-9 w-9"
              >
                <GitCompare className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-stucco-light hover:text-ink rounded-lg h-9 w-9"
              >
                <Languages className="w-4 h-4" />
              </Button>
            </div>

            <Button
              className={`bg-coral hover:bg-coral/90 text-ink rounded-lg pl-5 pr-4 h-11 transition-all duration-300 ${
                isHovered ? "shadow-md shadow-coral/20" : ""
              }`}
            >
              {productDemo.primaryCta}
              <ArrowRight
                className={`ml-2 w-4 h-4 transition-transform ${
                  isHovered ? "translate-x-1" : ""
                }`}
              />
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {productDemo.resultCards.map((card, idx) => (
            <motion.div
              key={card}
              className="bg-white border md:border-t-4 md:border-t-coral border-border/40 p-4 rounded-xl shadow-sm flex items-center justify-between"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + idx * 0.1 }}
            >
              <span className="text-sm font-medium text-ink">{card}</span>
              <div className="w-2 h-2 rounded-full bg-coral/80" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
