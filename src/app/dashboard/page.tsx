import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Briefcase,
  Clock,
  Database,
  FileText,
  Scale,
  Sparkles,
} from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApiError,
  getDocuments,
  getIngestionJobs,
  getMatters,
  getSettings,
  getWorkflows,
  healthCheck,
} from "@/lib/api/client";
import {
  formatDate,
  getDocumentHeading,
  getDomainLabel,
  getSourceTypeLabel,
} from "@/lib/legal-display";

type PracticeArea = {
  label: string;
  domain: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRACTICE_AREAS: PracticeArea[] = [
  { label: "Arbeidsrecht", domain: "employment_law", icon: Briefcase },
  { label: "Huurrecht", domain: "tenancy_law", icon: FileText },
  { label: "Bestuursrecht", domain: "administrative_law", icon: Scale },
];

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function firstName(name: string) {
  const token = name.split(/[\s@]/)[0];
  if (!token) return name;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function relativeTime(value?: string | null) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(value);
}

function statusPalette(status: string) {
  if (status === "completed") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "completed_with_errors") return "text-amber-700 bg-amber-50 border-amber-200";
  if (status === "running") return "text-[#DD3300] bg-[#DD3300]/10 border-[#DD3300]/20";
  if (status === "failed") return "text-red-700 bg-red-50 border-red-200";
  return "text-[#63534B] bg-[#F5F5F4] border-[#D8D2C8]";
}

export default async function DashboardHome() {
  const now = new Date();

  const devBypass = process.env.AUTH_DEV_BYPASS === "true";
  let displayName = "there";
  if (devBypass) {
    displayName = "Demo";
  } else {
    const session = await auth();
    const rawName = session?.user?.name || session?.user?.email || "";
    if (rawName) displayName = firstName(rawName);
    const settings = await getSettings().catch(() => null);
    if (settings && !settings.settings.onboarding_completed) {
      redirect("/dashboard/onboarding");
    }
  }

  const [
    healthResult,
    documentsResult,
    jobsResult,
    workflowsResult,
    mattersResult,
    ...domainCountResults
  ] = await Promise.allSettled([
    healthCheck(),
    getDocuments({ limit: 6 }),
    getIngestionJobs(10),
    getWorkflows(),
    getMatters({ limit: 1 }),
    ...PRACTICE_AREAS.map((area) =>
      getDocuments({ limit: 1, domain: area.domain }),
    ),
  ]);

  const isBackendLive =
    healthResult.status === "fulfilled" && healthResult.value.status === "ok";
  const documents =
    documentsResult.status === "fulfilled" ? documentsResult.value.documents : [];
  const totalSourceCount =
    documentsResult.status === "fulfilled" ? documentsResult.value.count : 0;
  const jobs = jobsResult.status === "fulfilled" ? jobsResult.value.jobs : [];
  const workflows =
    workflowsResult.status === "fulfilled" ? workflowsResult.value.workflows : [];
  const matterCount =
    mattersResult.status === "fulfilled" ? mattersResult.value.count : 0;

  const domainCounts = PRACTICE_AREAS.map((area, index) => {
    const result = domainCountResults[index];
    const count =
      result && result.status === "fulfilled" ? result.value.count : null;
    return { ...area, count };
  });

  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const lastIngestJob = jobs.find((job) => job.finished_at) || jobs[0];
  const lastIngestRelative = lastIngestJob
    ? relativeTime(lastIngestJob.finished_at || lastIngestJob.started_at)
    : null;

  const dataError =
    documentsResult.status === "rejected"
      ? documentsResult.reason instanceof ApiError
        ? documentsResult.reason.message
        : "Dashboard data could not be loaded."
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header: greeting + status + primary actions */}
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#7C746B]">
            {formatTime(now)} · {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#1F1D1A] md:text-4xl">
            {greeting(now)}, {displayName}.
          </h1>
          <p className="mt-1 text-[#63534B]">
            Here&rsquo;s what&rsquo;s live in your Clarvo workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D8D2C8] bg-white px-3 py-1.5 text-xs font-medium text-[#1F1D1A]">
            <span
              className={`h-2 w-2 rounded-full ${isBackendLive ? "bg-emerald-500" : "bg-red-500"}`}
              aria-hidden="true"
            />
            {isBackendLive ? "Backend live" : "Backend offline"}
          </span>
          <Button asChild variant="outline" className="border-[#D8D2C8] bg-white text-[#1F1D1A] hover:bg-[#F5F5F4]">
            <Link href="/dashboard/agents">
              <Sparkles className="mr-2 h-4 w-4 text-[#DD3300]" />
              Ask Clarvo
            </Link>
          </Button>
          <Button asChild className="bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90">
            <Link href="/dashboard/knowledge">Search sources</Link>
          </Button>
        </div>
      </section>

      {dataError ? (
        <Card className="border-[#DD3300]/20 bg-white shadow-none">
          <CardContent className="flex gap-3 p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#DD3300]" />
            <div>
              <p className="mb-1 font-medium text-[#1F1D1A]">
                Dashboard data unavailable
              </p>
              <p className="text-sm leading-6 text-[#63534B]">{dataError}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* At-a-glance metrics */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Database}
          label="Stored sources"
          value={totalSourceCount.toLocaleString()}
          hint="In your sample corpus"
        />
        <StatCard
          icon={Clock}
          label="Last ingest"
          value={lastIngestRelative || "—"}
          hint={
            runningJobs > 0
              ? `${runningJobs} job${runningJobs === 1 ? "" : "s"} running`
              : "Queue idle"
          }
        />
        <StatCard
          icon={Briefcase}
          label="Matters"
          value={matterCount.toLocaleString()}
          hint="Lightweight notes"
        />
        <StatCard
          icon={Sparkles}
          label="Workflow previews"
          value={workflows.length.toLocaleString()}
          hint="Preview flows"
        />
      </section>

      {/* Quick actions */}
      <section>
        <SectionHeading title="Jump back in" />
        <div className="grid gap-4 md:grid-cols-3">
          <JumpCard
            href="/dashboard/agents"
            icon={Bot}
            title="Ask the assistant"
            description="Pose a research question and get source-backed citations."
            ctaLabel="Open assistant"
          />
          <JumpCard
            href="/dashboard/knowledge"
            icon={Scale}
            title="Search the corpus"
            description="Hybrid retrieval across stored BWB legislation and Rechtspraak rows."
            ctaLabel="Search sources"
          />
          <JumpCard
            href="/dashboard/matters"
            icon={Briefcase}
            title="Matter notes"
            description={
              matterCount > 0
                ? `${matterCount} lightweight matter note${matterCount === 1 ? "" : "s"}.`
                : "Lightweight matter notes are available; full matter workspaces come later."
            }
            ctaLabel="Open preview"
          />
        </div>
      </section>

      {/* Practice areas */}
      <section>
        <SectionHeading
          title="Practice areas"
          action={{ href: "/dashboard/knowledge", label: "All sources" }}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {domainCounts.map((area) => (
            <Link
              key={area.domain}
              href={`/dashboard/knowledge?domain=${area.domain}`}
              className="group flex items-center gap-3 rounded-xl border border-[#D8D2C8] bg-white p-4 transition-all hover:border-[#1F1D1A]/30 hover:shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEEDE4]">
                <area.icon className="h-4 w-4 text-[#63534B]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight text-[#1F1D1A]">
                  {area.label}
                </p>
                <p className="mt-0.5 text-xs text-[#7C746B] group-hover:text-[#1F1D1A]">
                  {area.count === null
                    ? "Check availability"
                    : area.count > 0
                      ? "Sources available"
                      : "No sample yet"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Live data: latest sources + ingestion activity */}
      <section className="grid gap-6 lg:grid-cols-5">
        {/* Latest stored sources */}
        <div className="rounded-xl border border-[#D8D2C8] bg-white lg:col-span-3">
          <div className="flex items-center justify-between border-b border-[#D8D2C8]/60 px-5 py-3">
            <h2 className="text-sm font-semibold text-[#1F1D1A]">
              Latest stored sources
            </h2>
            <Link
              href="/dashboard/documents"
              className="text-xs font-medium text-[#7C746B] transition-colors hover:text-[#1F1D1A]"
            >
              Open vault →
            </Link>
          </div>
          <ul className="divide-y divide-[#D8D2C8]/60">
            {documents.length === 0 ? (
              <li className="p-8 text-center text-sm text-[#63534B]">
                No sources yet. Trigger an ingestion to populate the vault.
              </li>
            ) : (
              documents.map((document) => (
                <li key={document.id}>
                  <Link
                    href={`/dashboard/documents/${encodeURIComponent(
                      document.source_id || document.id,
                    )}${
                      document.domain
                        ? `?domain=${encodeURIComponent(document.domain)}`
                        : ""
                    }`}
                    className="flex items-start justify-between gap-4 px-5 py-3 transition-colors hover:bg-[#F5F5F4]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1F1D1A]">
                        {getDocumentHeading(document)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#7C746B]">
                        {getSourceTypeLabel(document.source_type)} ·{" "}
                        {getDomainLabel(document.domain)}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#BDA989]" />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Ingestion timeline */}
        <div className="rounded-xl border border-[#D8D2C8] bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#D8D2C8]/60 px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1F1D1A]">
              <Database className="h-4 w-4 text-[#BDA989]" />
              Ingestion activity
            </h2>
            <span className="text-xs text-[#7C746B]">Queue history</span>
          </div>
          <div className="p-5">
            {jobs.length === 0 ? (
              <p className="text-sm text-[#63534B]">
                No ingestion jobs recorded yet.
              </p>
            ) : (
              <ol className="relative ml-2 space-y-5 border-l border-[#D8D2C8]/70">
                {jobs.slice(0, 5).map((job) => (
                  <li key={job.id} className="relative pl-5">
                    <span
                      className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#BDA989] bg-white"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium leading-snug text-[#1F1D1A]">
                      {job.job_type.replace(/_/g, " ")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="flex items-center text-xs text-[#7C746B]">
                        <Clock className="mr-1 h-3 w-3" />
                        {relativeTime(job.started_at) || "—"}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${statusPalette(
                          job.status,
                        )}`}
                      >
                        {job.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
        {title}
      </h2>
      {action ? (
        <Link
          href={action.href}
          className="text-xs font-medium text-[#7C746B] transition-colors hover:text-[#1F1D1A]"
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[#D8D2C8] bg-white p-4">
      <div className="flex items-center gap-2 text-[#7C746B]">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-3 font-serif text-2xl tracking-tight text-[#1F1D1A]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[#7C746B]">{hint}</p>
    </div>
  );
}

function JumpCard({
  href,
  icon: Icon,
  title,
  description,
  ctaLabel,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[#D8D2C8] bg-white p-5 hover:border-[#1F1D1A]/30 hover:shadow-sm transition-all flex flex-col"
    >
      <div className="w-9 h-9 rounded-lg bg-[#EEEDE4] flex items-center justify-center mb-4">
        <Icon className="w-[18px] h-[18px] text-[#63534B]" />
      </div>
      <h3 className="text-base font-serif text-[#1F1D1A] tracking-tight">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[#63534B] leading-6 flex-1">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center text-xs font-medium text-[#1F1D1A] group-hover:text-[#DD3300] transition-colors">
        {ctaLabel}
        <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </span>
    </Link>
  );
}
