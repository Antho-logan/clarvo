import { AlertCircle, Briefcase, CheckCircle2, FileText, GitMerge, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ApiError, getWorkflows } from "@/lib/api/client";
import { getDomainLabel } from "@/lib/legal-display";

const WORKFLOW_ICONS = [Briefcase, FileText, AlertCircle, GitMerge] as const;

export default async function WorkflowsPage() {
  const workflowsResult = await getWorkflows().catch((error) => ({
    error: error instanceof ApiError ? error.message : "Workflows could not be loaded.",
  }));
  const workflows = "workflows" in workflowsResult ? workflowsResult.workflows : [];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2">Workflows</h1>
          <p className="text-[#63534B]">
            Preview the deterministic backend playbooks registered for this MVP. Dashboard execution is deferred.
          </p>
        </div>
        <Badge
          variant="outline"
          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] border-[#D8D2C8] bg-white text-[#63534B]"
        >
          Limited preview · {workflows.length} registered
        </Badge>
      </div>

      {"error" in workflowsResult ? (
        <Card className="bg-white border-[#DD3300]/20 shadow-sm mb-6">
          <CardContent className="p-6 flex gap-4">
            <AlertCircle className="w-5 h-5 text-[#DD3300] mt-1 shrink-0" />
            <div>
              <p className="font-medium text-[#1F1D1A] mb-1">Workflow registry unavailable</p>
              <p className="text-sm text-[#63534B] leading-6">{workflowsResult.error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((workflow, index) => {
          const Icon = WORKFLOW_ICONS[index % WORKFLOW_ICONS.length];

          return (
            <Card
              key={workflow.id}
              className="bg-white border-[#D8D2C8] shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#DD3300]/10">
                    <Icon className="w-6 h-6 text-[#DD3300]" />
                  </div>
                  <Badge variant="outline" className="text-[#63534B] border-[#D8D2C8] bg-[#EEEDE4]">
                    {getDomainLabel(workflow.domain)}
                  </Badge>
                </div>
                <h3 className="text-lg font-serif text-[#1F1D1A] mb-2 leading-snug">
                  {workflow.name.replace(/_/g, " ")}
                </h3>
                <p className="text-sm text-[#63534B] leading-relaxed">
                  Registered playbook with {workflow.step_count} deterministic steps:{" "}
                  {workflow.steps.slice(0, 3).map((step) => step.replace(/_/g, " ")).join(", ")}
                  {workflow.steps.length > 3 ? "..." : ""}
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="flex items-center space-x-4 mb-6 text-xs text-[#7C746B]">
                  <span className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1 text-[#BDA989]" /> {workflow.step_count} steps
                  </span>
                  <span>•</span>
                  <span>Registry only</span>
                </div>
                <Button disabled className="w-full bg-[#F5F5F4] text-[#63534B] border border-[#D8D2C8] disabled:opacity-100">
                  <Play className="w-4 h-4 mr-2" /> Runner deferred
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!("error" in workflowsResult) && workflows.length === 0 ? (
        <Card className="mt-6 bg-white border-dashed border-[#D8D2C8] shadow-sm">
          <CardContent className="p-8 text-center text-sm leading-6 text-[#63534B]">
            No backend workflows are registered for this environment.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
