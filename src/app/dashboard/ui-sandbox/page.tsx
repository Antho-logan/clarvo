import { Code2, FileText, Paintbrush, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SANDBOX_FILES = [
  {
    label: "Assistant UI",
    path: "ui-sandbox/app/assistant-streaming-page.tsx.txt",
    livePath: "src/components/dashboard/assistant-streaming-page.tsx",
    focus: "Answer animation, answer layout, citation cards, save-to-matter polish.",
    priority: "Start here",
  },
  {
    label: "Login screen",
    path: "ui-sandbox/app/login-page.tsx.txt",
    livePath: "src/app/login/page.tsx",
    focus: "Premium login layout while keeping Name or email + password intact.",
    priority: "Polish",
  },
  {
    label: "Dashboard shell",
    path: "ui-sandbox/app/DashboardShell.tsx.txt",
    livePath: "src/components/dashboard/DashboardShell.tsx",
    focus: "Sidebar, top bar, profile menu, and navigation polish.",
    priority: "Polish",
  },
  {
    label: "Landing page",
    path: "ui-sandbox/landing/ApprovedStaticLanding.tsx.txt",
    livePath: "src/components/landing/ApprovedStaticLanding.tsx",
    focus: "Safe landing experiments without touching the approved live page.",
    priority: "Optional",
  },
  {
    label: "Landing styles",
    path: "ui-sandbox/landing/ApprovedStaticLanding.module.css.txt",
    livePath: "src/components/landing/ApprovedStaticLanding.module.css",
    focus: "Safe CSS experiments for the landing page.",
    priority: "Optional",
  },
] as const;

export default function UiSandboxPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BDA989]">
            Safe frontend workspace
          </p>
          <h1 className="mb-2 font-serif text-3xl tracking-tight text-[#1F1D1A]">
            UI Sandbox
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[#63534B]">
            Work from these copied text files when experimenting with Claude.
            They are not compiled by the app, so rough edits cannot damage the
            live MVP until Codex ports them back into `src/`.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]"
        >
          Non-live copies
        </Badge>
      </section>

      <Card className="border-[#D8D2C8] bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF8F5]">
            <ShieldCheck className="h-5 w-5 text-[#DD3300]" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-[#1F1D1A]">
              Edit sandbox files first, then port intentionally
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#63534B]">
              Give Claude one sandbox file at a time. Keep routes, component
              names, form fields, and backend calls intact. When the design is
              ready, ask Codex to review the sandbox diff and apply the good
              parts to the matching live file.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2">
        {SANDBOX_FILES.map((file) => (
          <Card key={file.path} className="border-[#D8D2C8] bg-white shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F8F6F1]">
                    <Paintbrush className="h-5 w-5 text-[#DD3300]" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-xl text-[#1F1D1A]">
                      {file.label}
                    </CardTitle>
                    <p className="mt-1 text-xs text-[#7C746B]">
                      {file.priority}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
                >
                  Sandbox
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-[#63534B]">{file.focus}</p>

              <div className="space-y-2 rounded-lg border border-[#D8D2C8] bg-[#F8F6F1] p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
                  <FileText className="h-3.5 w-3.5" />
                  Edit this copy
                </div>
                <code className="block break-all font-mono text-xs leading-5 text-[#1F1D1A]">
                  {file.path}
                </code>
              </div>

              <div className="space-y-2 rounded-lg border border-[#D8D2C8] bg-white p-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
                  <Code2 className="h-3.5 w-3.5" />
                  Live file matched later
                </div>
                <code className="block break-all font-mono text-xs leading-5 text-[#63534B]">
                  {file.livePath}
                </code>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
