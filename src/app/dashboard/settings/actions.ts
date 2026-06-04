"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateSettings } from "@/lib/api/client";
import type { UserSettings } from "@/lib/types";

export type UpdateSettingsState =
  | {
      status: "idle";
      message?: undefined;
      settings?: undefined;
    }
  | {
      status: "success";
      message: string;
      settings: UserSettings;
    }
  | {
      status: "error";
      message: string;
      settings?: undefined;
    };

function stringValue(formData: FormData, key: string) {
  const value = String(formData.get(key) || "").trim();
  return value || undefined;
}

export async function updateSettingsAction(
  _previousState: UpdateSettingsState,
  formData: FormData,
): Promise<UpdateSettingsState> {
  try {
    await updateSettings({
      display_name: stringValue(formData, "display_name"),
      firm_name: stringValue(formData, "firm_name"),
      theme_preference: stringValue(formData, "theme_preference") || "system",
      language_preference: stringValue(formData, "language_preference") || "nl",
      primary_domain: stringValue(formData, "primary_domain"),
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Profile settings could not be saved.",
    };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=profile");
}
