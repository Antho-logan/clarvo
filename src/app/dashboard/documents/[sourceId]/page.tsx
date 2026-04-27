import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Landmark, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getDocument } from "@/lib/api/client";
import {
  formatDate,
  getArticleLabel,
  getDocumentHeading,
  getDomainLabel,
  getSourceIdentifier,
  getSourceTypeLabel,
} from "@/lib/legal-display";

type DocumentDetailPageProps = {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DocumentDetailPage({
  params,
  searchParams,
}: DocumentDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const sourceId = decodeURIComponent(resolvedParams.sourceId);
  const domain = readSingleValue(resolvedSearchParams.domain) || undefined;

  const detailResult = await getDocument(sourceId, { domain }).catch((error) => ({
    error:
      error instanceof ApiError
        ? error.message
        : "The source detail could not be loaded.",
  }));

  if ("error" in detailResult) {
    return (
      <div className="max-w-5xl mx-auto pb-12">
        <Link
          href="/dashboard/documents"
          className="inline-flex items-center text-sm text-[#7C746B] hover:text-[#1F1D1A] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Vault
        </Link>

        <Card className="bg-white border-[#DD3300]/20 shadow-sm">
          <CardContent className="p-8">
            <h1 className="text-3xl font-serif text-[#1F1D1A] mb-3">
              Source detail unavailable
            </h1>
            <p className="text-[#63534B] leading-7">{detailResult.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const documents = detailResult.documents;
  const primaryDocument = documents[0];
  const Icon = primaryDocument?.source_type === "case_law" ? Scale : Landmark;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center text-sm text-[#7C746B] hover:text-[#1F1D1A] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Vault
      </Link>

      {primaryDocument ? (
        <div className="space-y-6">
          <Card className="bg-white border-[#D8D2C8] shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#EEEDE4] border border-[#D8D2C8]/60 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#63534B]" />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className="text-[#63534B] border-[#D8D2C8] bg-[#F5F5F4]"
                      >
                        {getSourceTypeLabel(primaryDocument.source_type)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[#63534B] border-[#D8D2C8] bg-[#EEEDE4]"
                      >
                        {getDomainLabel(primaryDocument.domain)}
                      </Badge>
                    </div>
                    <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight">
                      {getDocumentHeading(primaryDocument)}
                    </h1>
                  </div>
                </div>

                {primaryDocument.source_url ? (
                  <a
                    href={primaryDocument.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-sm font-medium text-[#DD3300] hover:text-[#B82A00] transition-colors"
                  >
                    Official source
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                ) : null}
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm text-[#63534B]">
                <div className="rounded-xl bg-[#F5F5F4] border border-[#D8D2C8]/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#7C746B] mb-2">
                    Source Identifier
                  </p>
                  <p className="text-[#1F1D1A] font-medium">
                    {getSourceIdentifier(primaryDocument)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F5F4] border border-[#D8D2C8]/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#7C746B] mb-2">
                    Stored Segments
                  </p>
                  <p className="text-[#1F1D1A] font-medium">{detailResult.count}</p>
                </div>
                <div className="rounded-xl bg-[#F5F5F4] border border-[#D8D2C8]/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#7C746B] mb-2">
                    Fetched
                  </p>
                  <p className="text-[#1F1D1A] font-medium">
                    {formatDate(primaryDocument.fetched_at) || "Not recorded"}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F5F4] border border-[#D8D2C8]/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#7C746B] mb-2">
                    Case metadata
                  </p>
                  <p className="text-[#1F1D1A] font-medium">
                    {[primaryDocument.ecli, primaryDocument.court, formatDate(primaryDocument.decision_date)]
                      .filter(Boolean)
                      .join(" · ") || primaryDocument.subject || "Legislation source"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {documents.map((document) => (
              <Card
                key={document.id}
                className="bg-white border-[#D8D2C8] shadow-sm"
              >
                <CardHeader className="pb-4 border-b border-[#D8D2C8]/40">
                  <CardTitle className="text-lg font-serif text-[#1F1D1A] flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-[#BDA989]" />
                    {getArticleLabel(document) || document.document_type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {document.subject ? (
                    <p className="text-sm font-medium text-[#1F1D1A]">
                      {document.subject}
                    </p>
                  ) : null}
                  <div className="prose prose-sm max-w-none text-[#63534B] whitespace-pre-wrap leading-7">
                    {document.text}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
