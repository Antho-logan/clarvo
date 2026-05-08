import { cookies } from "next/headers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { ValueProp } from "@/components/landing/ValueProp";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { Features } from "@/components/landing/Features";
import { Metrics } from "@/components/landing/Metrics";
import { Security } from "@/components/landing/Security";
import { Cta } from "@/components/landing/Cta";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { defaultLocale, isLocale } from "@/lib/landing-copy";

const LANDING_LOCALE_COOKIE = "veridicta-landing-locale";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LANDING_LOCALE_COOKIE)?.value;
  const initialLocale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return (
    <LanguageProvider initialLocale={initialLocale}>
      <main className="min-h-screen bg-background">
        <Header />
        <Hero />
        <ValueProp />
        <ProductDemo />
        <Features />
        <Metrics />
        <Security />
        <Cta />
        <Footer />
      </main>
    </LanguageProvider>
  );
}
