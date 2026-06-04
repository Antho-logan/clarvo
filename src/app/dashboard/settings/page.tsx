import {
  BadgeCheck,
  Database,
  Info,
  Scale,
  ShieldAlert,
} from "lucide-react";
import type { ComponentType } from "react";

import { SettingsProfileForm } from "@/app/dashboard/settings/SettingsProfileForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getSettings } from "@/lib/api/client";
import {
  dashboardCopy,
  normalizeDashboardLocale,
} from "@/lib/dashboard-i18n";
import { getLocalizedDomainOptions } from "@/lib/legal-display";

const PRIMARY_DOMAIN_VALUES = [
  "employment_law",
  "tenancy_law",
  "administrative_law",
] as const;

function modelStatus() {
  return {
    chatModel: process.env.OPENAI_CHAT_MODEL || "Not configured in env",
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  };
}

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = searchParams ? await searchParams : {};
  const showSavedMessage = readSingleValue(params.saved) === "profile";
  const settingsResult = await getSettings().catch((error) => ({
    error:
      error instanceof ApiError
        ? error.message
        : "Settings could not be loaded.",
  }));
  const settings = "settings" in settingsResult ? settingsResult.settings : null;
  const locale = normalizeDashboardLocale(settings?.language_preference);
  const copy = dashboardCopy[locale].settings;
  const primaryDomainOptions = getLocalizedDomainOptions(locale).filter((option) =>
    PRIMARY_DOMAIN_VALUES.includes(
      option.value as (typeof PRIMARY_DOMAIN_VALUES)[number],
    ),
  );
  const models = modelStatus();

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BDA989]">
            {copy.kicker}
          </p>
          <h1 className="mb-2 font-serif text-3xl tracking-tight text-[#1F1D1A]">
            {copy.title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[#63534B]">
            {copy.description}
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]"
        >
          {copy.betaBadge}
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
        <div className="space-y-8">
          <SettingsProfileForm
            initialSettings={settings}
            primaryDomainOptions={primaryDomainOptions}
            locale={locale}
            showSavedMessage={showSavedMessage}
          />

          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardContent className="flex gap-4 p-6">
              <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-[#DD3300]" />
              <div>
                <h2 className="font-serif text-xl text-[#1F1D1A]">
                  {copy.legalDisclaimerTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#63534B]">
                  {copy.legalDisclaimer}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <StatusCard
            icon={BadgeCheck}
            title={copy.betaStatus}
            rows={[
              [copy.access, copy.privateBeta],
              [copy.primaryWorkflow, copy.workflowValue],
              [copy.automation, copy.automationValue],
            ]}
          />
          <StatusCard
            icon={Database}
            title={copy.corpusStatus}
            rows={[
              [copy.documents, copy.documentsValue],
              [copy.embeddings, copy.embeddingsValue],
              [copy.coverage, copy.coverageValue],
            ]}
          />
          <StatusCard
            icon={Scale}
            title={copy.modelStatus}
            rows={[
              [copy.chatModel, models.chatModel],
              [copy.embeddingModel, models.embeddingModel],
              [copy.secrets, copy.secretsValue],
            ]}
          />
          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardContent className="flex gap-3 p-5 text-sm leading-6 text-[#63534B]">
              <Info className="mt-1 h-4 w-4 shrink-0 text-[#BDA989]" />
              {copy.operatorManaged}
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
