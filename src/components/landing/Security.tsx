"use client";

import { ShieldCheck, Lock, Server, FileSignature, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/LanguageProvider";

const TRUST_ICONS = [FileSignature, ShieldCheck, Lock, Scale, Server] as const;

export function Security() {
  const { copy } = useLanguage();
  const principles = copy.security.principles.map((item, idx) => ({
    ...item,
    icon: TRUST_ICONS[idx],
  }));

  return (
    <section
      id="security"
      className="bg-ivory text-ink py-32 relative overflow-hidden scroll-mt-24 border-b border-border/40"
    >
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-radial from-stucco-mid/20 to-transparent opacity-60 pointer-events-none" />

      <div className="container mx-auto px-6 grid lg:grid-cols-12 gap-16 items-center relative z-10">
        <motion.div
          className="lg:col-span-5 space-y-6"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center space-x-2 text-coral border border-coral/30 bg-coral/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>{copy.security.badge}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-ink tracking-tight leading-tight">
            {copy.security.titleLead}
            <br /> {copy.security.titleAccent}
          </h2>
          <p className="text-lg text-stucco-dark leading-relaxed">
            {copy.security.description}
          </p>
        </motion.div>

        <div className="lg:col-span-6 lg:col-start-7 grid sm:grid-cols-2 gap-4">
          {principles.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: 0.3 + idx * 0.1,
                ease: "easeOut",
              }}
              className="bg-white border border-border/50 p-6 rounded-xl hover:border-coral/30 hover:shadow-xl transition-all duration-300"
            >
              <item.icon className="w-8 h-8 text-coral mb-4 opacity-80" />
              <h4 className="text-lg font-semibold text-ink mb-2">
                {item.title}
              </h4>
              <p className="text-sm text-stucco-dark leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
