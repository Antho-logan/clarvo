import { Briefcase, FileText, Scale } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { completeOnboardingAction } from "@/app/dashboard/onboarding/actions";
import { getSettings } from "@/lib/api/client";

const DOMAINS = [
  {
    value: "employment_law",
    label: "Employment law",
    description: "Dismissal, wages, leave, illness, and employment disputes.",
    icon: Briefcase,
  },
  {
    value: "tenancy_law",
    label: "Tenancy law",
    description: "Residential leases, termination, rent disputes, and repairs.",
    icon: FileText,
  },
  {
    value: "administrative_law",
    label: "Administrative law",
    description: "Objections, decisions, permits, enforcement, and public bodies.",
    icon: Scale,
  },
];

export default async function OnboardingPage() {
  const settings = await getSettings().catch(() => null);
  if (settings?.settings.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center py-10">
      <section className="w-full">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7C746B]">
            First setup
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-[#1F1D1A]">
            Choose your primary practice area.
          </h1>
          <p className="mt-3 leading-7 text-[#63534B]">
            Clarvo will open with a real grounded assistant query in that corpus slice.
          </p>
        </div>

        <form action={completeOnboardingAction} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {DOMAINS.map((domain, index) => (
              <label
                key={domain.value}
                className="group cursor-pointer rounded-xl border border-[#D8D2C8] bg-white p-5 shadow-sm transition-colors hover:border-[#DD3300]/30"
              >
                <input
                  className="peer sr-only"
                  type="radio"
                  name="primary_domain"
                  value={domain.value}
                  defaultChecked={index === 0}
                />
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-[#D8D2C8] bg-[#F5F5F4] text-[#63534B] peer-checked:border-[#DD3300]/30 peer-checked:bg-[#DD3300]/10 peer-checked:text-[#DD3300]">
                  <domain.icon className="h-5 w-5" />
                </div>
                <p className="font-serif text-xl text-[#1F1D1A]">{domain.label}</p>
                <p className="mt-3 text-sm leading-6 text-[#63534B]">
                  {domain.description}
                </p>
                <div className="mt-5 h-1 rounded-full bg-[#EEEDE4] peer-checked:bg-[#DD3300]" />
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <Button className="bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90">
              Start with grounded query
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
