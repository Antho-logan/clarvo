import Link from "next/link";
import {
  Archive,
  BookOpenText,
  Briefcase,
  CalendarClock,
  PlusCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import {
  archiveMatterAction,
  createMatterAction,
  updateMatterAction,
} from "@/app/dashboard/matters/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, getMatters } from "@/lib/api/client";
import { getDomainLabel, isValidDomain } from "@/lib/legal-display";
import { DOMAIN_OPTIONS, type Matter, type MatterResearchNote } from "@/lib/types";

type MattersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isResearchNote(value: unknown): value is MatterResearchNote {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "assistant_research_note" &&
    "question" in value &&
    typeof value.question === "string" &&
    "answer" in value &&
    typeof value.answer === "string" &&
    "citations" in value &&
    Array.isArray(value.citations) &&
    "domains" in value &&
    Array.isArray(value.domains) &&
    "citation_count" in value &&
    typeof value.citation_count === "number"
  );
}

function getResearchNotes(matter: Matter) {
  const notes = matter.tags.research_notes;
  if (!Array.isArray(notes)) {
    return [];
  }
  return notes.filter(isResearchNote);
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Saved date unknown";
  }
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getCitationLabel(citation: MatterResearchNote["citations"][number]) {
  return (
    [
      citation.source_id,
      citation.article ? `Art. ${citation.article}` : null,
      citation.court,
    ]
      .filter(Boolean)
      .join(" · ") ||
    citation.title ||
    "Saved source"
  );
}

export default async function MattersPage({ searchParams }: MattersPageProps) {
  const params = await searchParams;
  const query = readSingleValue(params.q) || "";
  const status = readSingleValue(params.status) || "";
  const rechtsgebied = readSingleValue(params.rechtsgebied) || "";
  const selectedMatterId = readSingleValue(params.matter) || "";

  const mattersResult = await getMatters({
    q: query || undefined,
    status: status || undefined,
    rechtsgebied: isValidDomain(rechtsgebied) ? rechtsgebied : undefined,
    limit: 80,
  }).catch((error) => ({
    error:
      error instanceof ApiError
        ? error.message
        : "Matters could not be loaded.",
  }));
  const matters = "matters" in mattersResult ? mattersResult.matters : [];
  const selectedMatter =
    matters.find((matter) => matter.id === selectedMatterId) || matters[0];
  const selectedResearchNotes = selectedMatter
    ? getResearchNotes(selectedMatter)
    : [];
  const totalResearchNotes = matters.reduce(
    (count, matter) => count + getResearchNotes(matter).length,
    0,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BDA989]">
            Legal workspace
          </p>
          <h1 className="mb-2 font-serif text-3xl tracking-tight text-[#1F1D1A]">
            Matters
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[#63534B]">
            Saved assistant research, grouped by matter. Keep questions,
            answer previews, and citation trails visible while the fuller matter
            workspace stays deliberately lightweight.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]"
          >
            {formatCount(matters.length, "matter", "matters")}
          </Badge>
          <Badge
            variant="outline"
            className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]"
          >
            {formatCount(totalResearchNotes, "research note", "research notes")}
          </Badge>
        </div>
      </div>

      {"error" in mattersResult ? (
        <Card className="border-[#DD3300]/20 bg-white">
          <CardContent className="p-6 text-sm text-[#8A2408]">
            {mattersResult.error}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-[#D8D2C8] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
            <SlidersHorizontal className="mr-2 h-5 w-5 text-[#BDA989]" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" method="get">
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search title or client"
            />
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
            <select
              name="rechtsgebied"
              defaultValue={rechtsgebied}
              className="h-10 rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
            >
              <option value="">All domains</option>
              {DOMAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button className="bg-[#1F1D1A] text-white">
              <Search className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-[#1F1D1A]">Matter list</h2>
              <Badge
                variant="outline"
                className="border-[#D8D2C8] bg-white text-[#63534B]"
              >
                {matters.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {matters.map((matter) => (
                <MatterListCard
                  key={matter.id}
                  matter={matter}
                  selected={selectedMatter?.id === matter.id}
                />
              ))}
              {matters.length === 0 ? (
                <Card className="border-dashed border-[#D8D2C8] bg-white">
                  <CardContent className="p-8 text-center text-sm text-[#63534B]">
                    No matters matched the current filters. Create a matter or
                    save a grounded assistant answer to start a workspace.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </section>

          <CreateMatterCard />
        </aside>

        <main>
          {selectedMatter ? (
            <MatterWorkspace
              matter={selectedMatter}
              researchNotes={selectedResearchNotes}
            />
          ) : (
            <Card className="border-dashed border-[#D8D2C8] bg-white shadow-sm">
              <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-10 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[#D8D2C8] bg-[#F8F6F1]">
                  <Briefcase className="h-5 w-5 text-[#BDA989]" />
                </div>
                <h2 className="font-serif text-xl text-[#1F1D1A]">
                  No matter selected
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#63534B]">
                  Saved assistant research notes will appear here after you save
                  a grounded answer from the Assistant.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

function CreateMatterCard() {
  return (
    <Card className="border-[#D8D2C8] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
          <PlusCircle className="mr-2 h-5 w-5 text-[#DD3300]" />
          Create Matter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createMatterAction} className="space-y-4">
          <Input name="title" required placeholder="Short matter title" />
          <Input name="client" placeholder="Client or internal reference" />
          <select
            name="rechtsgebied"
            className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
          >
            <option value="">Choose rechtsgebied</option>
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            placeholder="Notes for this matter"
            className="min-h-24 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 py-2 text-sm"
          />
          <Button className="w-full bg-[#DD3300] text-white hover:bg-[#DD3300]/90">
            Create matter
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MatterWorkspace({
  matter,
  researchNotes,
}: {
  matter: Matter;
  researchNotes: MatterResearchNote[];
}) {
  return (
    <Card className="border-[#D8D2C8] bg-white shadow-sm">
      <CardHeader className="border-b border-[#EEEDE4]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="font-serif text-2xl text-[#1F1D1A]">
              {matter.title}
            </CardTitle>
            <p className="mt-2 text-sm text-[#63534B]">
              {matter.client || "Client not set"} ·{" "}
              {getDomainLabel(matter.rechtsgebied)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
            >
              {matter.status}
            </Badge>
            <Badge
              variant="outline"
              className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
            >
              {formatCount(researchNotes.length, "research note", "research notes")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        <section className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-serif text-xl text-[#1F1D1A]">
                Saved research
              </h2>
              <p className="text-sm text-[#63534B]">
                Grounded assistant answers saved with citation metadata.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-fit border-[#D8D2C8] bg-white text-[#1F1D1A]"
            >
              <Link href="/dashboard/agents">Open Assistant</Link>
            </Button>
          </div>

          {researchNotes.length > 0 ? (
            <div className="space-y-4">
              {researchNotes.map((note) => (
                <ResearchNoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-[#D8D2C8] bg-[#F8F6F1]">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <BookOpenText className="mb-4 h-8 w-8 text-[#BDA989]" />
                <h3 className="font-serif text-lg text-[#1F1D1A]">
                  No saved research yet
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#63534B]">
                  Ask a grounded legal question in the Assistant, then save the
                  answer to this matter. Refusals and unsupported answers are
                  not saved.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="grid gap-6 border-t border-[#EEEDE4] pt-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <form action={updateMatterAction} className="space-y-4">
            <div>
              <h2 className="font-serif text-xl text-[#1F1D1A]">
                Matter details
              </h2>
              <p className="text-sm text-[#63534B]">
                Lightweight metadata for this MVP workspace.
              </p>
            </div>
            <input type="hidden" name="matter_id" value={matter.id} />
            <Input name="title" defaultValue={matter.title} required />
            <Input
              name="client"
              defaultValue={matter.client || ""}
              placeholder="Client"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <select
                name="status"
                defaultValue={matter.status}
                className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
              <select
                name="rechtsgebied"
                defaultValue={matter.rechtsgebied || ""}
                className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
              >
                <option value="">No domain tag</option>
                {DOMAIN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="description"
              defaultValue={matter.description || ""}
              className="min-h-28 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 py-2 text-sm"
            />
            <Button className="bg-[#1F1D1A] text-white">Save changes</Button>
          </form>

          <form action={archiveMatterAction} className="self-end">
            <input type="hidden" name="matter_id" value={matter.id} />
            <Button
              variant="outline"
              className="w-full border-[#D8D2C8] text-[#1F1D1A]"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive matter
            </Button>
          </form>
        </section>
      </CardContent>
    </Card>
  );
}

function ResearchNoteCard({ note }: { note: MatterResearchNote }) {
  const sourcePreview = note.citations.slice(0, 4);

  return (
    <article className="rounded-xl border border-[#D8D2C8] bg-[#F8F6F1] p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              {note.status}
            </Badge>
            {note.domains.map((domain) => (
              <Badge
                key={`${note.id}-${domain}`}
                variant="outline"
                className="border-[#D8D2C8] bg-white text-[#63534B]"
              >
                {getDomainLabel(domain)}
              </Badge>
            ))}
          </div>
          <h3 className="font-serif text-lg leading-7 text-[#1F1D1A]">
            {note.question}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-[#7C746B]">
          <CalendarClock className="h-4 w-4 text-[#BDA989]" />
          {formatSavedAt(note.created_at)}
        </div>
      </div>

      <p className="line-clamp-5 text-sm leading-7 text-[#63534B]">
        {note.answer}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="border-[#D8D2C8] bg-white text-[#63534B]"
        >
          {formatCount(note.citation_count, "citation", "citations")}
        </Badge>
        {sourcePreview.length > 0 ? (
          <span className="text-xs text-[#7C746B]">
            Source trail:{" "}
            {sourcePreview.map((citation) => getCitationLabel(citation)).join(" · ")}
          </span>
        ) : (
          <span className="text-xs text-[#7C746B]">
            Citation metadata unavailable.
          </span>
        )}
      </div>
    </article>
  );
}

function MatterListCard({
  matter,
  selected,
}: {
  matter: Matter;
  selected: boolean;
}) {
  const researchNotes = getResearchNotes(matter);
  const latestNote = researchNotes[0];

  return (
    <Link
      href={`/dashboard/matters?matter=${matter.id}`}
      className={`block rounded-xl border bg-white p-4 shadow-sm transition hover:border-[#DD3300]/40 ${
        selected ? "border-[#DD3300]/40 ring-2 ring-[#DD3300]/10" : "border-[#D8D2C8]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg text-[#1F1D1A]">
            {matter.title}
          </h3>
          <p className="mt-1 truncate text-xs text-[#63534B]">
            {matter.client || "Client not set"} ·{" "}
            {getDomainLabel(matter.rechtsgebied)}
          </p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
        >
          {matter.status}
        </Badge>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#63534B]">
        {latestNote?.question ||
          matter.description ||
          "No research notes have been saved yet."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="border-[#D8D2C8] bg-white text-[#63534B]"
        >
          {formatCount(researchNotes.length, "research note", "research notes")}
        </Badge>
        {latestNote ? (
          <Badge
            variant="outline"
            className="border-[#D8D2C8] bg-white text-[#63534B]"
          >
            {formatCount(latestNote.citation_count, "citation", "citations")}
          </Badge>
        ) : null}
      </div>
    </Link>
  );
}
