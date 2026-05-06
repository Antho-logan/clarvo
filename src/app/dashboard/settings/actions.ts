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
  });
  revalidatePath("/dashboard/settings");
}
