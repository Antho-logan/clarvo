"use server";

import { revalidatePath } from "next/cache";

import { updateSettings } from "@/lib/api/client";

function stringValue(formData: FormData, key: string) {
  const value = String(formData.get(key) || "").trim();
  return value || undefined;
}

export async function updateSettingsAction(formData: FormData) {
  await updateSettings({
    display_name: stringValue(formData, "display_name"),
    firm_name: stringValue(formData, "firm_name"),
    theme_preference: stringValue(formData, "theme_preference") || "system",
    primary_domain: stringValue(formData, "primary_domain"),
    bwb_enabled: formData.get("bwb_enabled") === "on",
    rechtspraak_enabled: formData.get("rechtspraak_enabled") === "on",
    openai_key_configured: Boolean(stringValue(formData, "openai_key_label")),
  });
  revalidatePath("/dashboard/settings");
}
