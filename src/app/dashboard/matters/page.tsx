import { Archive, Briefcase, FileText, Search, SlidersHorizontal } from "lucide-react";

import { archiveMatterAction, createMatterAction, updateMatterAction } from "@/app/dashboard/matters/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, getMatters } from "@/lib/api/client";
import { getDomainLabel, isValidDomain } from "@/lib/legal-display";
import { DOMAIN_OPTIONS } from "@/lib/types";

type MattersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
    error: error instanceof ApiError ? error.message : "Matters could not be loaded.",
  }));
  const matters = "matters" in mattersResult ? mattersResult.matters : [];
  const selectedMatter = matters.find((matter) => matter.id === selectedMatterId) || matters[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 font-serif text-3xl tracking-tight text-[#1F1D1A]">Matters</h1>
          <p className="max-w-3xl text-[#63534B]">
            Lightweight private matter notes for saved context. Full matter workspaces and document bundles are intentionally deferred.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]">
          Limited preview · {matters.length} notes
        </Badge>
      </div>

      {"error" in mattersResult ? (
        <Card className="border-[#DD3300]/20 bg-white">
          <CardContent className="p-6 text-sm text-[#8A2408]">{mattersResult.error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_420px]">
        <section className="space-y-6">
          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
                <SlidersHorizontal className="mr-2 h-5 w-5 text-[#BDA989]" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-4" method="get">
                <Input name="q" defaultValue={query} placeholder="Search title or client" />
                <select name="status" defaultValue={status} className="h-10 rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm">
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
                <select name="rechtsgebied" defaultValue={rechtsgebied} className="h-10 rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm">
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

          <div className="space-y-4">
            {matters.map((matter) => (
              <a
                key={matter.id}
                href={`/dashboard/matters?matter=${matter.id}`}
                className="block rounded-xl border border-[#D8D2C8] bg-white p-5 shadow-sm transition hover:border-[#DD3300]/40"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="font-serif text-xl text-[#1F1D1A]">{matter.title}</h2>
                    <p className="mt-1 text-sm text-[#63534B]">
                      {matter.client || "Client not set"} · {getDomainLabel(matter.rechtsgebied)}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-[#D8D2C8] text-[#63534B]">
                    {matter.status}
                  </Badge>
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#63534B]">
                  {matter.description || "No notes have been added yet."}
                </p>
              </a>
            ))}
            {matters.length === 0 ? (
              <Card className="border-dashed border-[#D8D2C8] bg-white">
                <CardContent className="p-10 text-center text-sm text-[#63534B]">
                  No matters matched the current filters.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
                <Briefcase className="mr-2 h-5 w-5 text-[#DD3300]" />
                New Matter Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createMatterAction} className="space-y-4">
                <Input name="title" required placeholder="Short matter title" />
                <Input name="client" placeholder="Client or internal reference" />
                <select name="rechtsgebied" className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm">
                  <option value="">Choose rechtsgebied</option>
                  {DOMAIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <textarea name="description" placeholder="Notes for this MVP matter preview" className="min-h-28 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 py-2 text-sm" />
                <Button className="w-full bg-[#DD3300] text-white hover:bg-[#DD3300]/90">Create note</Button>
              </form>
            </CardContent>
          </Card>

          {selectedMatter ? (
            <Card className="border-[#D8D2C8] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
                  <FileText className="mr-2 h-5 w-5 text-[#BDA989]" />
                  Matter Note
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <form action={updateMatterAction} className="space-y-4">
                  <input type="hidden" name="matter_id" value={selectedMatter.id} />
                  <Input name="title" defaultValue={selectedMatter.title} required />
                  <Input name="client" defaultValue={selectedMatter.client || ""} placeholder="Client" />
                  <select name="status" defaultValue={selectedMatter.status} className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                  <select name="rechtsgebied" defaultValue={selectedMatter.rechtsgebied || ""} className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm">
                    <option value="">No domain tag</option>
                    {DOMAIN_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <textarea name="description" defaultValue={selectedMatter.description || ""} className="min-h-28 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 py-2 text-sm" />
                  <Button className="w-full bg-[#1F1D1A] text-white">Save changes</Button>
                </form>

                <form action={archiveMatterAction}>
                  <input type="hidden" name="matter_id" value={selectedMatter.id} />
                  <Button variant="outline" className="w-full border-[#D8D2C8] text-[#1F1D1A]">
                    <Archive className="mr-2 h-4 w-4" />
                    Archive matter
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
