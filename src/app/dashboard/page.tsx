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
    <div className="space-y-10 max-w-6xl mx-auto pb-12">
      {/* Greeting + quick actions */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#7C746B]">
            {formatTime(now)} · {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-serif text-[#1F1D1A] tracking-tight">
            {greeting(now)}, {displayName}.
          </h1>
          <p className="mt-1 text-[#63534B]">
            Here&rsquo;s what&rsquo;s live in your Veridicta workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="border-[#D8D2C8] bg-white text-[#1F1D1A] hover:bg-[#F5F5F4]">
            <Link href="/dashboard/agents">
              <Sparkles className="w-4 h-4 mr-2 text-[#DD3300]" />
              Ask Veridicta
            </Link>
          </Button>
          <Button asChild className="bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90">
            <Link href="/dashboard/knowledge">Search sources</Link>
          </Button>
        </div>
      </section>

      {/* Pulse strip */}
      <section className="rounded-xl border border-[#D8D2C8] bg-white px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendLive ? "bg-emerald-500" : "bg-red-500"
            }`}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-[#1F1D1A]">
            {isBackendLive ? "Backend live" : "Backend offline"}
          </span>
        </div>
        <PulseStat label="Loaded sample" value={totalSourceCount.toLocaleString()} />
        <PulseStat label="Last ingest" value={lastIngestRelative || "—"} />
        <PulseStat
          label="Running jobs"
          value={runningJobs > 0 ? String(runningJobs) : "Idle"}
        />
        <PulseStat label="Workflow previews" value={workflows.length.toLocaleString()} />
        <PulseStat label="Matters" value={matterCount.toLocaleString()} />
      </section>

      {/* Jump back in */}
      <section className="grid gap-4 md:grid-cols-3">
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
      </section>

      {/* Practice areas */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1F1D1A] tracking-tight">
            Practice areas
          </h2>
          <Link
            href="/dashboard/knowledge"
            className="text-xs text-[#7C746B] hover:text-[#1F1D1A]"
          >
            All sources →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {domainCounts.map((area) => (
            <Link
              key={area.domain}
              href={`/dashboard/knowledge?domain=${area.domain}`}
              className="group rounded-xl border border-[#D8D2C8] bg-white p-4 hover:border-[#1F1D1A]/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#EEEDE4] flex items-center justify-center">
                  <area.icon className="w-4 h-4 text-[#63534B]" />
                </div>
                <span className="text-xs font-medium text-[#7C746B] group-hover:text-[#1F1D1A]">
                  {area.count === null
                    ? "Check"
                    : area.count > 0
                      ? "Available"
                      : "No sample"}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-[#1F1D1A] leading-tight">
                {area.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {dataError ? (
        <Card className="bg-white border-[#DD3300]/20 shadow-none">
          <CardContent className="p-5 flex gap-3">
            <AlertCircle className="w-5 h-5 text-[#DD3300] mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-[#1F1D1A] mb-1">
                Dashboard data unavailable
              </p>
              <p className="text-sm text-[#63534B] leading-6">{dataError}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Latest + activity */}
      <section className="grid lg:grid-cols-5 gap-6">
        {/* Latest stored sources */}
        <div className="lg:col-span-3 rounded-xl border border-[#D8D2C8] bg-white">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#D8D2C8]/60">
            <h2 className="text-sm font-semibold text-[#1F1D1A]">
              Latest stored sources
            </h2>
            <Link
              href="/dashboard/documents"
              className="text-xs text-[#7C746B] hover:text-[#1F1D1A]"
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
                    className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-[#F5F5F4] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1F1D1A] truncate">
                        {getDocumentHeading(document)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#7C746B]">
                        {getSourceTypeLabel(document.source_type)} ·{" "}
                        {getDomainLabel(document.domain)}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#BDA989] mt-1 shrink-0" />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Ingestion timeline */}
        <div className="lg:col-span-2 rounded-xl border border-[#D8D2C8] bg-white">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#D8D2C8]/60">
            <h2 className="text-sm font-semibold text-[#1F1D1A] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#BDA989]" />
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
              <ol className="relative border-l border-[#D8D2C8]/70 ml-2 space-y-5">
                {jobs.slice(0, 5).map((job) => (
                  <li key={job.id} className="pl-5 relative">
                    <span
                      className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#BDA989]"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-[#1F1D1A] leading-snug">
                      {job.job_type.replace(/_/g, " ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-[#7C746B] flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {relativeTime(job.started_at) || "—"}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusPalette(
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

function PulseStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[#7C746B]">
        {label}
      </span>
      <span className="text-sm font-medium text-[#1F1D1A]">{value}</span>
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
