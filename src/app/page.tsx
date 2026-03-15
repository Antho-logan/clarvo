import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { ValueProp } from "@/components/landing/ValueProp";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { Features } from "@/components/landing/Features";
import { Metrics } from "@/components/landing/Metrics";
import { CaseStudies } from "@/components/landing/CaseStudies";
import { Security } from "@/components/landing/Security";
import { Cta } from "@/components/landing/Cta";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

export default function LandingPage() {
  return (
    <LanguageProvider>
      <main className="min-h-screen bg-background">
        <Header />
        <Hero />
        <ValueProp />
        <ProductDemo />
        <Features />
        <Metrics />
        <CaseStudies />
        <Security />
        <Cta />
        <Footer />
      </main>
    </LanguageProvider>
  );
}
