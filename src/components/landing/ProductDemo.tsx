"use client";

import Link from "next/link";
import {
  BookOpen,
  FileText,
  FolderOpen,
  Mic,
  Search,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { betaAccessHref } from "@/lib/landing-copy";

const CAPABILITY_ICONS = [
  Search,
  ShieldCheck,
  BookOpen,
  FolderOpen,
  FileText,
  Mic,
] as const;

export function ProductDemo() {
  const { copy } = useLanguage();
  const productDemo = copy.productDemo;

  return (
    <section
      id="product"
      className="scroll-mt-24 border-b border-[#D8D2C8] bg-[#FBFAF7] py-24 md:py-28 lg:py-32"
    >
      <div className="container mx-auto px-6">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <span className="mb-4 block text-sm font-semibold uppercase tracking-[0.08em] text-[#D94A1E]">
              {productDemo.eyebrow}
            </span>
            <h2 className="max-w-2xl font-serif text-4xl font-medium leading-tight text-ink md:text-5xl">
              {productDemo.titleLead}{" "}
              <span className="text-[#63534B]">{productDemo.titleAccent}</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#63534B]">
              {productDemo.description}
            </p>

            <div className="mt-10 rounded-2xl border border-[#D8D2C8] bg-[#F4F1EA] p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap gap-2">
                {productDemo.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[#D8D2C8] bg-white px-3 py-1 text-xs font-semibold text-[#63534B]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <p className="font-serif text-xl leading-8 text-ink">
                {productDemo.prompt.beforeLaw}
                <span className="text-[#D94A1E]">
                  {productDemo.prompt.highlightedLaw}
                </span>
                {productDemo.prompt.between}
                <span className="underline decoration-[#BDA989] underline-offset-4">
                  {productDemo.prompt.highlightedDeliverable}
                </span>
                {productDemo.prompt.after}
              </p>
              <Link
                href={betaAccessHref}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#D94A1E] px-5 text-sm font-semibold text-white transition hover:bg-[#B83A14]"
              >
                {productDemo.primaryCta}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {productDemo.capabilities.map((card, idx) => {
              const Icon = CAPABILITY_ICONS[idx] ?? Search;

              return (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 1, y: 0 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border border-[#D8D2C8] bg-white p-6 shadow-sm ${
                    idx === 0 ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F1EA] text-[#D94A1E]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-2xl text-ink">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#63534B]">
                    {card.description}
                  </p>
                </motion.article>
              );
            })}
          </div>
        </div>

        <div className="mt-20">
          <span className="mb-4 block text-sm font-semibold uppercase tracking-[0.08em] text-[#D94A1E]">
            {productDemo.stepsSubtitle}
          </span>
          <h3 className="font-serif text-3xl text-ink md:text-4xl">
            {productDemo.stepsTitle}
          </h3>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {productDemo.steps.map((step, idx) => (
              <article
                key={step.title}
                className="rounded-xl border border-[#D8D2C8] bg-white p-6 shadow-sm"
              >
                <div className="mb-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#D94A1E]">
                  0{idx + 1}
                </div>
                <h4 className="text-base font-semibold text-ink">
                  {step.title}
                </h4>
                <p className="mt-3 text-sm leading-7 text-[#63534B]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
