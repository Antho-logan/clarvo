"use server";

import { redirect } from "next/navigation";

import { updateSettings } from "@/lib/api/client";
import { isValidDomain } from "@/lib/legal-display";

const STARTER_QUERY_BY_DOMAIN: Record<string, string> = {
  employment_law: "Wat zijn aandachtspunten bij ontslag op staande voet?",
  tenancy_law: "Wat geldt bij opzegging van huur van woonruimte?",
  administrative_law: "Welke eisen gelden voor bezwaar tegen een besluit?",
};

export async function completeOnboardingAction(formData: FormData) {
  const domain = String(formData.get("primary_domain") || "").trim();
  const primaryDomain = isValidDomain(domain) ? domain : "employment_law";
  await updateSettings({
    primary_domain: primaryDomain,
    onboarding_completed: true,
  });

  const params = new URLSearchParams({
    q: STARTER_QUERY_BY_DOMAIN[primaryDomain] || STARTER_QUERY_BY_DOMAIN.employment_law,
    domain: primaryDomain,
  });
  redirect(`/dashboard/agents?${params.toString()}`);
}
