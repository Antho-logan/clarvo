import { Database, KeyRound, Settings, UserCircle } from "lucide-react";

import { updateSettingsAction } from "@/app/dashboard/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, getSettings } from "@/lib/api/client";
import { DOMAIN_OPTIONS } from "@/lib/types";

const PRIMARY_DOMAIN_OPTIONS = DOMAIN_OPTIONS.filter((option) =>
  ["employment_law", "tenancy_law", "administrative_law"].includes(option.value),
);

export default async function SettingsPage() {
  const settingsResult = await getSettings().catch((error) => ({
    error: error instanceof ApiError ? error.message : "Settings could not be loaded.",
  }));
  const settings = "settings" in settingsResult ? settingsResult.settings : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 font-serif text-3xl tracking-tight text-[#1F1D1A]">Settings</h1>
          <p className="text-[#63534B]">
            Manage profile details, first-run domain preference, and local integration status.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]">
          User scoped
        </Badge>
      </div>

      {"error" in settingsResult ? (
        <Card className="border-[#DD3300]/20 bg-white">
          <CardContent className="p-6 text-sm text-[#8A2408]">{settingsResult.error}</CardContent>
        </Card>
      ) : null}

      <form action={updateSettingsAction} className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
                <UserCircle className="mr-2 h-5 w-5 text-[#DD3300]" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1F1D1A]" htmlFor="display_name">
                  Display name
                </label>
                <Input id="display_name" name="display_name" defaultValue={settings?.display_name || ""} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1F1D1A]" htmlFor="firm_name">
                  Firm
                </label>
                <Input id="firm_name" name="firm_name" defaultValue={settings?.firm_name || ""} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1F1D1A]" htmlFor="theme_preference">
                  Theme
                </label>
                <select
                  id="theme_preference"
                  name="theme_preference"
                  defaultValue={settings?.theme_preference || "system"}
                  className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1F1D1A]" htmlFor="primary_domain">
                  Primary practice area
                </label>
                <select
                  id="primary_domain"
                  name="primary_domain"
                  defaultValue={settings?.primary_domain || ""}
                  className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
                >
                  <option value="">Choose after onboarding</option>
                  {PRIMARY_DOMAIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
                <KeyRound className="mr-2 h-5 w-5 text-[#BDA989]" />
                API Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-[#63534B]">
                Secrets are not echoed back to the browser. These fields persist only configured/not-configured state; live keys still belong in local environment files or a secrets manager.
              </p>
              <Input
                name="openai_key_label"
                placeholder={settings?.openai_key_configured ? "OpenAI key configured" : "Paste label after configuring OPENAI_API_KEY"}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-8">
          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
                <Database className="mr-2 h-5 w-5 text-[#DD3300]" />
                Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[#63534B]">
              <p className="leading-6">
                These switches are saved preferences for the MVP. Corpus ingestion is still operator-run through the backend queue.
              </p>
              <label className="flex items-center justify-between rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] p-4">
                <span>BWB legislation</span>
                <input name="bwb_enabled" type="checkbox" defaultChecked={settings?.bwb_enabled ?? true} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] p-4">
                <span>Rechtspraak judgments</span>
                <input name="rechtspraak_enabled" type="checkbox" defaultChecked={settings?.rechtspraak_enabled ?? true} />
              </label>
              <Button className="w-full bg-[#DD3300] text-white hover:bg-[#DD3300]/90">
                <Settings className="mr-2 h-4 w-4" />
                Save settings
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
