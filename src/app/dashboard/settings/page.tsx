import {
  BadgeCheck,
  Database,
  Info,
  Scale,
  Settings,
  ShieldAlert,
  UserCircle,
} from "lucide-react";
import type { ComponentType } from "react";

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

function modelStatus() {
  return {
    chatModel: process.env.OPENAI_CHAT_MODEL || "Not configured in env",
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  };
}

export default async function SettingsPage() {
  const settingsResult = await getSettings().catch((error) => ({
    error:
      error instanceof ApiError
        ? error.message
        : "Settings could not be loaded.",
  }));
  const settings = "settings" in settingsResult ? settingsResult.settings : null;
  const models = modelStatus();

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BDA989]">
            Private beta settings
          </p>
          <h1 className="mb-2 font-serif text-3xl tracking-tight text-[#1F1D1A]">
            Settings
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[#63534B]">
            Profile preferences and read-only system status for this local beta
            workspace. Secrets and corpus operations stay outside the browser.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]"
        >
          Private beta
        </Badge>
      </div>

      {"error" in settingsResult ? (
        <Card className="border-[#DD3300]/20 bg-white">
          <CardContent className="p-6 text-sm text-[#8A2408]">
            {settingsResult.error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form action={updateSettingsAction} className="space-y-8">
          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
                <UserCircle className="mr-2 h-5 w-5 text-[#DD3300]" />
                Profile and workspace
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-[#1F1D1A]"
                  htmlFor="display_name"
                >
                  Display name
                </label>
                <Input
                  id="display_name"
                  name="display_name"
                  defaultValue={settings?.display_name || ""}
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-[#1F1D1A]"
                  htmlFor="firm_name"
                >
                  Workspace or firm
                </label>
                <Input
                  id="firm_name"
                  name="firm_name"
                  defaultValue={settings?.firm_name || ""}
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-[#1F1D1A]"
                  htmlFor="theme_preference"
                >
                  Theme preference
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
                <label
                  className="mb-2 block text-sm font-medium text-[#1F1D1A]"
                  htmlFor="primary_domain"
                >
                  Primary practice area
                </label>
                <select
                  id="primary_domain"
                  name="primary_domain"
                  defaultValue={settings?.primary_domain || ""}
                  className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
                >
                  <option value="">No default practice area</option>
                  {PRIMARY_DOMAIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Button className="bg-[#DD3300] text-white hover:bg-[#DD3300]/90">
                  <Settings className="mr-2 h-4 w-4" />
                  Save profile settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardContent className="flex gap-4 p-6">
              <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-[#DD3300]" />
              <div>
                <h2 className="font-serif text-xl text-[#1F1D1A]">
                  Legal disclaimer
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#63534B]">
                  Clarvo supports Dutch legal research. It does not provide
                  legal advice, does not replace a lawyer, and outputs should be
                  reviewed by a qualified professional before use.
                </p>
              </div>
            </CardContent>
          </Card>
        </form>

        <aside className="space-y-6">
          <StatusCard
            icon={BadgeCheck}
            title="Beta status"
            rows={[
              ["Access", "Private beta"],
              ["Primary workflow", "Assistant + saved matter research"],
              ["Automation", "Workflow runner not generally available"],
            ]}
          />
          <StatusCard
            icon={Database}
            title="Corpus status"
            rows={[
              ["Documents", "14,346 indexed"],
              ["Embeddings", "Complete"],
              ["Coverage", "BWB legislation and Rechtspraak rows"],
            ]}
          />
          <StatusCard
            icon={Scale}
            title="Model status"
            rows={[
              ["Chat model", models.chatModel],
              ["Embedding model", models.embeddingModel],
              ["Secrets", "Configured outside the browser"],
            ]}
          />
          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardContent className="flex gap-3 p-5 text-sm leading-6 text-[#63534B]">
              <Info className="mt-1 h-4 w-4 shrink-0 text-[#BDA989]" />
              API keys and corpus ingestion are operator-managed for this beta.
              This page does not expose or accept secrets.
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  title,
  rows,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <Card className="border-[#D8D2C8] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
          <Icon className="mr-2 h-5 w-5 text-[#DD3300]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-[#EEEDE4]">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-6 py-3 first:pt-0 last:pb-0"
          >
            <span className="text-sm text-[#7C746B]">{label}</span>
            <span className="text-right text-sm font-medium text-[#1F1D1A]">
              {value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
