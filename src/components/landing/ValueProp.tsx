"use client";

import { FileText, Scale, GitMerge, Globe2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/LanguageProvider";

const PILLAR_ICONS = [GitMerge, FileText, Scale, Globe2] as const;

export function ValueProp() {
  const { copy } = useLanguage();
  const valueProp = copy.valueProp;

  return (
    <section className="bg-ivory py-32 border-b border-border/40">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 mb-20 items-end">
          <div>
            <span className="text-coral font-semibold tracking-wider uppercase text-sm mb-4 block">
              {valueProp.eyebrow}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif text-ink tracking-tight leading-tight">
              {valueProp.titleLead}
              <br className="hidden md:block" /> {valueProp.titleAccent}
            </h2>
          </div>
          <div className="pb-2">
            <p className="text-lg text-stucco-dark leading-relaxed">
              {valueProp.description}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {valueProp.pillars.map((pillar, idx) => {
            const Icon = PILLAR_ICONS[idx];

            return (
              <div
                key={pillar.title}
                className="group bg-white p-8 rounded-2xl border border-border/50 hover:border-coral/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-stucco-light/50 flex items-center justify-center mb-6 group-hover:bg-coral/10 transition-colors">
                  <Icon className="w-6 h-6 text-stucco-dark group-hover:text-coral transition-colors" />
                </div>
                <h3 className="text-xl font-serif text-ink font-semibold mb-3">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm mb-6 min-h-[80px]">
                  {pillar.description}
                </p>

                <Button
                  variant="ghost"
                  className="p-0 text-coral hover:bg-transparent hover:text-coral/80 h-auto group/btn"
                >
                  {valueProp.discoverCapability}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
