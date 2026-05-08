"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { betaAccessHref, walkthroughHref } from "@/lib/landing-copy";

export function Hero() {
  const { copy } = useLanguage();
  const hero = copy.hero;

  return (
    <section className="relative overflow-hidden bg-[#F4F1EA] pt-32 pb-20 md:pt-36 lg:pt-40">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.08em] text-[#7C746B]">
            {hero.banner}
          </p>
          <h1
            aria-label={`${hero.titleLead} ${hero.titleAccent}`}
            className="mx-auto max-w-5xl font-serif text-5xl font-medium leading-[1.08] text-ink sm:text-6xl lg:text-7xl"
          >
            {hero.titleLead}{" "}
            <span className="text-[#63534B]">{hero.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-[#63534B] md:text-xl">
            {hero.description}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={betaAccessHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[#D94A1E] px-7 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#B83A14] hover:shadow-[0_10px_24px_rgba(217,74,30,0.18)] sm:w-auto"
            >
              {hero.primaryCta}
            </Link>
            <Link
              href={walkthroughHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-md border border-[#D8D2C8] bg-white/55 px-7 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-[#63534B] hover:bg-white sm:w-auto"
            >
              {hero.secondaryCta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-sm leading-6 text-[#63534B]">
            {hero.scopeLine}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="mx-auto mt-14 max-w-5xl"
        >
          <div className="rounded-2xl border border-[#D8D2C8] bg-white/82 p-4 shadow-[0_28px_70px_rgba(31,29,26,0.10)] backdrop-blur md:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-[#EEEDE4] pb-4">
              <div className="flex gap-2" aria-hidden="true">
                <span className="h-3 w-3 rounded-full bg-[#D8D2C8]" />
                <span className="h-3 w-3 rounded-full bg-[#D8D2C8]" />
                <span className="h-3 w-3 rounded-full bg-[#D8D2C8]" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7C746B]">
                {hero.panelLabel}
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-[#D8D2C8] bg-[#F8F6F1] px-4 py-3 text-sm text-[#63534B]">
                  <Search className="h-4 w-4 text-[#7C746B]" />
                  <span>{hero.mockQuestion}</span>
                </div>

                <div className="rounded-xl border border-[#EEEDE4] bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7C746B]">
                      {hero.answerLabel}
                    </span>
                    <span className="rounded-full border border-[#D94A1E]/25 bg-[#FFF6F1] px-3 py-1 text-xs font-semibold text-[#9E3515]">
                      {hero.reviewBadge}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-[#453D38]">
                    {hero.mockAnswerBefore}{" "}
                    <span className="rounded bg-[#F4F1EA] px-1.5 py-0.5 font-semibold text-[#9E3515]">
                      {hero.mockCitationOne}
                    </span>
                    {hero.mockAnswerBetween}
                    <span className="rounded bg-[#F4F1EA] px-1.5 py-0.5 font-semibold text-[#9E3515]">
                      {hero.mockCitationTwo}
                    </span>
                    {hero.mockAnswerAfter}
                  </p>
                </div>

                <div className="rounded-lg border border-[#D8D2C8] bg-[#F8F6F1] px-4 py-3 text-sm text-[#63534B]">
                  {hero.insufficientState}
                </div>
              </div>

              <div className="rounded-xl border border-[#D8D2C8] bg-[#F8F6F1] p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.08em] text-[#7C746B]">
                  {hero.sourcesLabel}
                </h2>
                <div className="space-y-3">
                  {hero.sourceCards.map((source) => (
                    <div
                      key={source.title}
                      className="rounded-lg border border-[#D8D2C8] bg-white p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded bg-[#F4F1EA] px-2 py-1 text-[11px] font-semibold uppercase text-[#63534B]">
                          {source.tag}
                        </span>
                        <span className="text-xs font-semibold text-[#D94A1E]">
                          {hero.panelAction}
                        </span>
                      </div>
                      <p className="font-serif text-lg text-ink">
                        {source.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#7C746B]">
                        {source.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-5 text-center text-sm text-[#63534B]">
            {hero.mockPromise}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
