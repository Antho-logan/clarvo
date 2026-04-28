import Link from "next/link";
import { ArrowRight, DatabaseZap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  getDomainLabel,
  getJobStatusTone,
} from "@/lib/legal-display";
import type { IngestionJob } from "@/lib/types";

type RecentIngestionJobsProps = {
  jobs: IngestionJob[];
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

export function hasMeaningfulIngestionJobData(job: IngestionJob) {
  return (
    hasText(job.job_type) ||
    hasText(job.source_system) ||
    hasText(job.domain) ||
    hasText(job.status) ||
    hasText(job.started_at) ||
    hasNumber(job.success_count) ||
    hasNumber(job.failure_count) ||
    hasNumber(job.items_done) ||
    hasNumber(job.items_total) ||
    hasNumber(job.total_items)
  );
}

export function RecentIngestionJobs({ jobs }: RecentIngestionJobsProps) {
  const visibleJobs = jobs.filter(hasMeaningfulIngestionJobData);

  return (
    <Card className="bg-white border-[#D8D2C8] shadow-sm">
      <CardHeader className="pb-4 border-b border-[#D8D2C8]/40">
        <CardTitle className="text-lg font-serif text-[#1F1D1A] flex items-center">
          <DatabaseZap className="w-5 h-5 mr-2 text-[#DD3300]" />
          Recent Ingestion Jobs
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        {visibleJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8D2C8] bg-[#F5F5F4] p-5 text-sm text-[#63534B]">
            No recent ingestion job available.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleJobs.map((job) => {
              const itemsDone =
                job.items_done ??
                (hasNumber(job.success_count) && hasNumber(job.failure_count)
                  ? job.success_count + job.failure_count
                  : undefined);
              const itemsTotal = job.items_total ?? job.total_items;
              const startedAt = formatDate(job.started_at);
              const statRows = [
                hasNumber(job.success_count)
                  ? `Success: ${job.success_count}`
                  : null,
                hasNumber(job.failure_count)
                  ? `Failures: ${job.failure_count}`
                  : null,
                hasNumber(itemsDone) && hasNumber(itemsTotal) && itemsTotal > 0
                  ? `Progress: ${itemsDone}/${itemsTotal}`
                  : null,
                startedAt ? `Started: ${startedAt}` : null,
              ].filter((item): item is string => Boolean(item));
              const meta = [
                hasText(job.domain) ? getDomainLabel(job.domain) : null,
                hasText(job.source_system) ? job.source_system : null,
              ].filter((item): item is string => Boolean(item));

              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-[#D8D2C8]/60 bg-[#F5F5F4] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1F1D1A]">
                        {hasText(job.job_type) ? job.job_type : "Ingestion job"}
                      </p>
                      {meta.length > 0 ? (
                        <p className="text-xs text-[#7C746B] mt-1">
                          {meta.join(" / ")}
                        </p>
                      ) : null}
                    </div>

                    <Badge
                      variant="outline"
                      className={getJobStatusTone(job.status)}
                    >
                      {hasText(job.status)
                        ? job.status.replace(/_/g, " ")
                        : "unknown"}
                    </Badge>
                  </div>

                  {statRows.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 text-xs text-[#63534B]">
                      {statRows.map((row) => (
                        <span key={row}>{row}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#63534B]">
                      No recent ingestion job available.
                    </p>
                  )}

                  {job.finished_at ? (
                    <p className="text-xs text-[#7C746B] mt-3">
                      Finished {formatDate(job.finished_at)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <Link
          href="/dashboard/documents"
          className="inline-flex items-center text-sm font-medium text-[#DD3300] hover:text-[#B82A00] transition-colors mt-6"
        >
          Inspect the live vault
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </CardContent>
    </Card>
  );
}
