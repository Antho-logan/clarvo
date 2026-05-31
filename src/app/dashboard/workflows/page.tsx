import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  FileSearch,
  GitMerge,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

type WorkflowPhase = "Available now" | "Next" | "Planned";

type WorkflowEntry = {
  title: string;
  phase: WorkflowPhase;
  icon: React.ComponentType<{ className?: string }>;
  body: string;
  href?: string;
  cta?: string;
};

const WORKFLOWS: readonly WorkflowEntry[] = [
  {
    title: "Document review",
    phase: "Available now",
    icon: FileSearch,
    body: "Upload a contract, ask one Dutch legal question, and inspect the contract passages alongside the legal citations. Live in the Assistant today.",
    href: "/dashboard/agents",
    cta: "Open in Assistant",
  },
  {
    title: "Research memo workflow",
    phase: "Next",
    icon: BookOpenCheck,
    body: "A guided path from saved Assistant research to a structured memo outline, with every citation preserved for lawyer review.",
  },
  {
    title: "Citation audit workflow",
    phase: "Planned",
    icon: ShieldCheck,
    body: "An automated quality gate that checks whether generated answers stay tied to the relevant BWB and Rechtspraak sources.",
  },
] as const;

function phaseBadgeClass(phase: WorkflowPhase) {
  if (phase === "Available now") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (phase === "Next") {
    return "border-[#DD3300]/30 bg-[#FFF7F3] text-[#8A2408]";
  }
  return "border-[#D8D2C8] bg-[#F8F6F1] text-[#7C746B]";
}

export default async function WorkflowsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BDA989]">
          Product roadmap
        </p>
        <h1 className="mb-2 font-serif text-3xl tracking-tight text-[#1F1D1A]">
          Workflows
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-[#63534B]">
          Where Clarvo&rsquo;s research turns into repeatable, source-backed
          steps. Document review already runs inside the Assistant — the
          workflows below are being designed deliberately, in order.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#D8D2C8] bg-[#F8F6F1] px-4 py-3">
        <GitMerge className="mt-0.5 h-5 w-5 shrink-0 text-[#DD3300]" />
        <p className="text-sm leading-6 text-[#63534B]">
          One workflow is live today; the others are on the roadmap and not yet
          active as autonomous runners. Use the Assistant for legal and document
          review, then save grounded answers into Matters.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
          Now → Next → Later
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {WORKFLOWS.map((workflow) => (
            <WorkflowCard key={workflow.title} workflow={workflow} />
          ))}
        </div>
      </section>
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: WorkflowEntry }) {
  const available = workflow.phase === "Available now";
  const Icon = workflow.icon;

  const content = (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${
            available ? "bg-emerald-50" : "bg-[#F8F6F1]"
          }`}
        >
          <Icon
            className={`h-6 w-6 ${available ? "text-emerald-600" : "text-[#BDA989]"}`}
          />
        </div>
        <Badge variant="outline" className={phaseBadgeClass(workflow.phase)}>
          {workflow.phase}
        </Badge>
      </div>
      <h3 className="font-serif text-xl leading-7 text-[#1F1D1A]">
        {workflow.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-[#63534B]">
        {workflow.body}
      </p>
      {available && workflow.cta ? (
        <span className="mt-5 inline-flex items-center text-sm font-medium text-[#DD3300] transition-colors group-hover:text-[#A92700]">
          {workflow.cta}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </span>
      ) : (
        <span className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-[#BDA989]">
          On the roadmap
        </span>
      )}
    </>
  );

  if (available && workflow.href) {
    return (
      <Link
        href={workflow.href}
        className="group flex h-full flex-col rounded-xl border border-emerald-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-[#D8D2C8] bg-white p-5 shadow-sm">
      {content}
    </div>
  );
}
