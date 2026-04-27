import Link from "next/link";
import { ArrowRight, DatabaseZap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, getDomainLabel, getJobStatusTone } from "@/lib/legal-display";
import type { IngestionJob } from "@/lib/types";

type RecentIngestionJobsProps = {
  jobs: IngestionJob[];
};

export function RecentIngestionJobs({ jobs }: RecentIngestionJobsProps) {
  return (
    <Card className="bg-white border-[#D8D2C8] shadow-sm">
      <CardHeader className="pb-4 border-b border-[#D8D2C8]/40">
        <CardTitle className="text-lg font-serif text-[#1F1D1A] flex items-center">
          <DatabaseZap className="w-5 h-5 mr-2 text-[#DD3300]" />
          Recent Ingestion Jobs
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8D2C8] bg-[#F5F5F4] p-5 text-sm text-[#63534B]">
            No ingestion jobs are recorded yet. Run the curated ingestion scripts and the latest jobs will appear here.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const itemsDone = job.items_done ?? job.success_count + job.failure_count;
              const itemsTotal = job.items_total ?? job.total_items;

              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-[#D8D2C8]/60 bg-[#F5F5F4] p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1F1D1A]">
                        {job.job_type}
                      </p>
                      <p className="text-xs text-[#7C746B] mt-1">
                        {getDomainLabel(job.domain)} · {job.source_system}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={getJobStatusTone(job.status)}
                    >
                      {job.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-[#63534B]">
                    <span>Success: {job.success_count}</span>
                    <span>Failures: {job.failure_count}</span>
                    <span>Progress: {itemsDone}/{itemsTotal}</span>
                    <span>Started: {formatDate(job.started_at) || "Not recorded"}</span>
                  </div>

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
