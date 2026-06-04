import { AssistantStreamingPage } from "@/components/dashboard/assistant-streaming-page";
import { getSettings } from "@/lib/api/client";
import { normalizeDashboardLocale } from "@/lib/dashboard-i18n";
import { isValidDomain } from "@/lib/legal-display";

type AssistantPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssistantPage({
  searchParams,
}: AssistantPageProps) {
  const params = await searchParams;
  const query = (readSingleValue(params.q) || "").trim();
  const rawDomain = readSingleValue(params.domain) || "";
  const domain = isValidDomain(rawDomain) ? rawDomain : undefined;
  const settingsResult = await getSettings().catch(() => null);
  const locale = normalizeDashboardLocale(
    settingsResult?.settings.language_preference,
  );

  return <AssistantStreamingPage query={query} domain={domain} locale={locale} />;
}
