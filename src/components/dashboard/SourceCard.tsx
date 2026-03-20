import Link from "next/link";
import { ArrowRight, ExternalLink, Landmark, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  getArticleLabel,
  getDocumentHeading,
  getDocumentSnippet,
  getDomainLabel,
  getSearchScore,
  getSourceIdentifier,
  getSourceTypeLabel,
} from "@/lib/legal-display";
import type { DocumentRecord, SearchResult } from "@/lib/types";

type SourceCardProps = {
  item: DocumentRecord | SearchResult;
  href?: string;
  footerLabel?: string;
};

export function SourceCard({ item, href, footerLabel = "Open source" }: SourceCardProps) {
  const Icon = item.source_type === "case_law" ? Scale : Landmark;
  const articleLabel = getArticleLabel(item);
  const dateLabel =
    "decision_date" in item && item.decision_date
      ? formatDate(item.decision_date)
      : "fetched_at" in item && item.fetched_at
        ? formatDate(item.fetched_at)
        : null;

  return (
    <Card className="bg-white border-[#D8D2C8] shadow-sm hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEEDE4] flex items-center justify-center border border-[#D8D2C8]/60">
              <Icon className="w-5 h-5 text-[#63534B]" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="text-[#63534B] border-[#D8D2C8] bg-[#F5F5F4]"
                >
                  {getSourceTypeLabel(item.source_type)}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[#63534B] border-[#D8D2C8] bg-[#EEEDE4]"
                >
                  {getDomainLabel(item.domain)}
                </Badge>
                {"score" in item ? (
                  <Badge
                    variant="outline"
                    className="text-[#DD3300] border-[#DD3300]/20 bg-[#DD3300]/5"
                  >
                    {getSearchScore(item)}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#7C746B]">
                {getSourceIdentifier(item)}
              </p>
            </div>
          </div>

          {item.source_url ? (
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[#7C746B] hover:text-[#DD3300] transition-colors"
              aria-label="Open official source"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : null}
        </div>

        <CardTitle className="text-xl font-serif text-[#1F1D1A] leading-snug">
          {getDocumentHeading(item)}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#63534B]">
          {articleLabel ? <span>{articleLabel}</span> : null}
          {"ecli" in item && item.ecli ? <span>{item.ecli}</span> : null}
          {"court" in item && item.court ? <span>{item.court}</span> : null}
          {"subject" in item && item.subject ? <span>{item.subject}</span> : null}
          {dateLabel ? <span>{dateLabel}</span> : null}
        </div>

        <p className="text-sm leading-7 text-[#63534B]">
          {getDocumentSnippet(item.text, 280)}
        </p>

        {href ? (
          <Link
            href={href}
            className="inline-flex items-center text-sm font-medium text-[#DD3300] hover:text-[#B82A00] transition-colors"
          >
            {footerLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
