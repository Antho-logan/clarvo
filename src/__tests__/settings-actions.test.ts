import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateSettings } from "@/lib/api/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

vi.mock("@/lib/api/client", () => ({
  updateSettings: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const mockedUpdateSettings = vi.mocked(updateSettings);
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedRedirect = vi.mocked(redirect);

describe("settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the selected dashboard language and returns saved settings", async () => {
    mockedUpdateSettings.mockResolvedValue({
      settings: {
        user_id: "test-user",
        display_name: "Test User",
        firm_name: "Test Firm",
        theme_preference: "system",
        language_preference: "en",
        bwb_enabled: true,
        rechtspraak_enabled: true,
        openai_key_configured: true,
        cohere_key_configured: false,
        primary_domain: "tenancy_law",
        onboarding_completed: true,
        created_at: "2026-05-01T10:00:00Z",
        updated_at: "2026-05-01T10:00:00Z",
      },
    });
    const { updateSettingsAction } = await import(
      "@/app/dashboard/settings/actions"
    );
    const formData = new FormData();
    formData.set("display_name", "Test User");
    formData.set("firm_name", "Test Firm");
    formData.set("theme_preference", "system");
    formData.set("language_preference", "en");
    formData.set("primary_domain", "tenancy_law");

    await expect(
      updateSettingsAction({ status: "idle" }, formData),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/settings?saved=profile");

    expect(mockedUpdateSettings).toHaveBeenCalledWith({
      display_name: "Test User",
      firm_name: "Test Firm",
      theme_preference: "system",
      language_preference: "en",
      primary_domain: "tenancy_law",
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/settings");
    expect(mockedRedirect).toHaveBeenCalledWith(
      "/dashboard/settings?saved=profile",
    );
  });
});
