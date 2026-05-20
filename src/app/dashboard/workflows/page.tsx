import { BookOpenCheck, FileSearch, GitMerge, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROADMAP_WORKFLOWS = [
  {
    title: "Research memo workflow",
    status: "Next",
    availability: "Not yet generally available",
    icon: BookOpenCheck,
    body:
      "Planned path from saved Assistant research to a structured memo outline with citations preserved for lawyer review.",
  },
  {
    title: "Document review workflow",
    status: "Design partner preview",
    availability: "Available in Assistant",
    icon: FileSearch,
    body:
      "Document and legal review are available in Assistant today: upload a contract, ask one Dutch legal question, and inspect the contract passages plus legal citations. A separate autonomous workflow runner is not active in this beta.",
  },
  {
    title: "Citation audit workflow",
    status: "Planned",
    availability: "Not yet generally available",
    icon: ShieldCheck,
    body:
      "Planned quality gate for checking whether generated answers remain tied to relevant BWB and Rechtspraak sources.",
  },
] as const;

export default async function WorkflowsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BDA989]">
            Private beta roadmap
          </p>
          <h1 className="mb-2 font-serif text-3xl tracking-tight text-[#1F1D1A]">
            Workflows
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[#63534B]">
            Veridicta currently focuses on source-backed research, saved matter
            notes, Knowledge search, Vault browsing, and document review inside
            Assistant. Workflow automation is being designed carefully and is
            not generally available in this MVP.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]"
        >
          Roadmap only
        </Badge>
      </div>

      <Card className="border-[#D8D2C8] bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F8F6F1]">
            <GitMerge className="h-5 w-5 text-[#DD3300]" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-[#1F1D1A]">
              No workflow runner is active in this beta
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#63534B]">
              The cards below describe intended product directions, not active
              autonomous runners. Use Assistant for legal and document review,
              then save grounded answers into Matters for the current private
              beta workflow.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {ROADMAP_WORKFLOWS.map((workflow) => (
          <Card
            key={workflow.title}
            className="flex h-full flex-col border-[#D8D2C8] bg-white shadow-sm"
          >
            <CardHeader>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF8F5]">
                  <workflow.icon className="h-6 w-6 text-[#DD3300]" />
                </div>
                <Badge
                  variant="outline"
                  className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
                >
                  {workflow.status}
                </Badge>
              </div>
              <CardTitle className="font-serif text-xl leading-7 text-[#1F1D1A]">
                {workflow.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-6">
              <p className="text-sm leading-6 text-[#63534B]">{workflow.body}</p>
              <Badge
                variant="outline"
                className="w-fit border-[#D8D2C8] bg-white text-[#63534B]"
              >
                {workflow.availability}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
