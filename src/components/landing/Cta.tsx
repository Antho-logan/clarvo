"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { betaAccessHref, directEmailHref, walkthroughHref } from "@/lib/landing-copy";

export function Cta() {
  const { copy } = useLanguage();
  const cta = copy.cta;

  return (
    <section
      id="beta"
      className="scroll-mt-24 border-b border-[#D8D2C8] bg-[#FBFAF7] py-24 md:py-28 lg:py-32"
    >
      <motion.div
        className="container mx-auto max-w-5xl px-6"
        initial={{ opacity: 1, scale: 1 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="mb-16 rounded-2xl border border-[#D8D2C8] bg-white p-6 shadow-sm md:p-10">
          <span className="mb-4 block text-sm font-semibold uppercase tracking-[0.08em] text-[#D94A1E]">
            {cta.betaEyebrow}
          </span>
          <h2 className="mb-6 font-serif text-4xl font-medium leading-tight text-ink md:text-5xl">
            {cta.betaTitle}
          </h2>
          <p className="mb-6 text-lg leading-8 text-[#63534B]">
            {cta.betaDescription}
          </p>
          <p className="mb-8 text-lg leading-8 text-[#63534B]">
            {cta.betaPartnerLine}
          </p>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-ink">
            {cta.betaListTitle}
          </h3>
          <ul className="mb-8 grid gap-4 md:grid-cols-3">
            {cta.betaList.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-[#D8D2C8] bg-[#F8F6F1] p-4 text-sm leading-7 text-[#63534B]"
              >
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={betaAccessHref}
            className="inline-flex h-12 items-center justify-center rounded-md bg-[#D94A1E] px-6 text-sm font-semibold text-white transition hover:bg-[#B83A14]"
          >
            {cta.betaCta}
          </Link>
        </div>

        <div className="text-center">
          <h2 className="mb-8 font-serif text-4xl font-medium leading-tight text-ink md:text-6xl">
            {cta.titleLead} <br /> {cta.titleAccent}
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-8 text-[#63534B] md:text-xl">
            {cta.description}
          </p>

          <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={betaAccessHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[#D94A1E] px-7 text-sm font-semibold text-white transition hover:bg-[#B83A14] sm:w-auto"
            >
              {cta.primaryCta}
            </Link>
            <Link
              href={walkthroughHref}
              className="group inline-flex h-12 w-full items-center justify-center rounded-md border border-[#D8D2C8] bg-white px-7 text-sm font-semibold text-ink transition hover:border-[#63534B] sm:w-auto"
            >
              {cta.secondaryCta}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <Link
            href={directEmailHref}
            className="text-sm text-[#63534B] transition-colors hover:text-ink"
          >
            {cta.tertiaryLine}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
