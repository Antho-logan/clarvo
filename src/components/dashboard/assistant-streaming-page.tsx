"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bot, Briefcase, FileText, Scale, Send, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDomainLabel } from "@/lib/legal-display";
import { DOMAIN_OPTIONS, type AssistantCitation } from "@/lib/types";

const SUGGESTED_PROMPTS = [
  {
    domain: "tenancy_law",
    icon: FileText,
    prompt: "Wat geldt bij opzegging van huur van woonruimte?",
    description: "Checks the stored tenancy corpus and cites matching sources.",
  },
  {
    domain: "employment_law",
    icon: Briefcase,
    prompt: "Wat zijn aandachtspunten bij ontslag op staande voet?",
    description:
      "Uses employment-law sources when the corpus supports the answer.",
  },
  {
    domain: "administrative_law",
    icon: Scale,
    prompt: "Welke eisen gelden voor bezwaar tegen een besluit?",
    description:
      "Surfaces administrative-law sources or refuses transparently.",
  },
] as const;

type AssistantStreamingPageProps = {
  query: string;
  domain?: string;
};

type StreamState = "idle" | "streaming" | "grounded" | "insufficient_sources";

type AssistantStreamEvent =
  | { type: "token"; content: string }
  | { type: "citation"; citation?: AssistantCitation }
  | {
      type: "done";
      status?: "grounded";
      source_ids?: string[];
      tool_trace?: Array<Record<string, unknown>>;
    }
  | {
      type: "insufficient_sources";
      answer: string;
      question: string;
      source_ids: string[];
      citations: AssistantCitation[];
      tool_trace: Array<Record<string, unknown>>;
    };

const ADMINISTRATIVE_LAW_INSUFFICIENT_MESSAGE =
  "Veridicta does not yet have enough administrative-law sources to answer this reliably.";

const GENERIC_INSUFFICIENT_MESSAGE =
  "Veridicta does not have enough grounded sources to answer this reliably.";

const REFUSAL_PATTERNS = [
  /does not yet have enough/i,
  /not enough (supporting|grounded)?\s*sources/i,
  /cannot answer/i,
  /can't answer/i,
  /kan (deze vraag )?niet betrouwbaar beantwoorden/i,
  /onvoldoende/i,
  /niet genoeg/i,
  /buiten.*scope/i,
  /valt buiten/i,
  /niet ondersteund/i,
  /only (answer|supports?)/i,
  /alleen.*ondersteun/i,
  /out[- ]of[- ]scope/i,
  /unsupported/i,
] as const;

function buildAssistantHref(query: string, domain?: string) {
  const params = new URLSearchParams({
    q: query,
  });

  if (domain) {
    params.set("domain", domain);
  }

  return `/dashboard/agents?${params.toString()}`;
}

function isAdministrativeLawQuestion(query: string, domain?: string) {
  const normalized = query.toLowerCase();
  return (
    domain === "administrative_law" ||
    normalized.includes("bezwaar") ||
    normalized.includes("bestuursrecht") ||
    normalized.includes("besluit")
  );
}

function getInsufficientMessage(query: string, domain?: string) {
  return isAdministrativeLawQuestion(query, domain)
    ? ADMINISTRATIVE_LAW_INSUFFICIENT_MESSAGE
    : GENERIC_INSUFFICIENT_MESSAGE;
}

function isRefusalAnswer(answer: string) {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(answer));
}

function readSseEvents(buffer: string) {
  const frames = buffer.split("\n\n");
  const remainder = frames.pop() || "";
  const events = frames
    .map((frame) =>
      frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n"),
    )
    .filter(Boolean)
    .map((payload) => JSON.parse(payload) as AssistantStreamEvent);

  return { events, remainder };
}

export function AssistantStreamingPage({
  query,
  domain,
}: AssistantStreamingPageProps) {
  const [streamState, setStreamState] = useState<StreamState>(
    query ? "streaming" : "idle",
  );
  const [answerText, setAnswerText] = useState("");
  const [citations, setCitations] = useState<AssistantCitation[]>([]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [toolTrace, setToolTrace] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      return;
    }

    const abortController = new AbortController();

    async function streamAnswer() {
      setStreamState("streaming");
      setAnswerText("");
      setCitations([]);
      setSourceIds([]);
      setToolTrace([]);
      setSearchError(null);

      try {
        const response = await fetch("/api/agent/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: query,
            domain,
            max_iterations: 2,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(response.statusText || "Assistant stream failed.");
        }
        if (!response.body) {
          throw new Error("Assistant stream returned an empty body.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedAnswer = "";
        let streamedCitations: AssistantCitation[] = [];
        let sawFinalEvent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parsed = readSseEvents(buffer);
          buffer = parsed.remainder;
          for (const event of parsed.events) {
            if (event.type === "token") {
              streamedAnswer += event.content;
              setAnswerText((current) => current + event.content);
            } else if (event.type === "citation" && event.citation) {
              streamedCitations = [
                ...streamedCitations,
                event.citation as AssistantCitation,
              ];
              setCitations((current) => [
                ...current,
                event.citation as AssistantCitation,
              ]);
            } else if (event.type === "insufficient_sources") {
              sawFinalEvent = true;
              const answer =
                event.answer?.trim() || getInsufficientMessage(query, domain);
              streamedAnswer = answer;
              streamedCitations = [];
              setAnswerText(answer);
              setCitations([]);
              setSourceIds(event.source_ids || []);
              setToolTrace(event.tool_trace || []);
              setStreamState("insufficient_sources");
            } else if (event.type === "done") {
              sawFinalEvent = true;
              const finalAnswer = streamedAnswer.trim();
              if (!finalAnswer || isRefusalAnswer(finalAnswer)) {
                setAnswerText(
                  finalAnswer || getInsufficientMessage(query, domain),
                );
                streamedCitations = [];
                setCitations([]);
                setSourceIds([]);
                setToolTrace(event.tool_trace || []);
                setStreamState("insufficient_sources");
                continue;
              }

              setCitations(streamedCitations);
              setSourceIds(event.source_ids || []);
              setToolTrace(event.tool_trace || []);
              setStreamState("grounded");
            }
          }
        }

        if (!sawFinalEvent) {
          const finalAnswer = streamedAnswer.trim();
          if (!finalAnswer || isRefusalAnswer(finalAnswer)) {
            setAnswerText(finalAnswer || getInsufficientMessage(query, domain));
            setCitations([]);
            setSourceIds([]);
            setStreamState("insufficient_sources");
          } else {
            setCitations(streamedCitations);
            setStreamState("grounded");
          }
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setSearchError(
          error instanceof Error
            ? error.message
            : "The assistant could not retrieve grounded results.",
        );
        setStreamState("idle");
      }
    }

    void streamAnswer();

    return () => abortController.abort();
  }, [query, domain]);

  const domainsFound = useMemo(
    () =>
      Array.from(
        new Set(
          citations
            .map((item) => item.domain)
            .filter((item): item is string => Boolean(item)),
        ),
      ),
    [citations],
  );
  const hasActiveDomainFilter = Boolean(domain);
  const showAnswer =
    answerText && streamState !== "insufficient_sources" && !searchError;
  const sourceCount = sourceIds.length || citations.length;

  return (
    <div className="max-w-5xl mx-auto pb-12 min-h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2 flex items-center">
            <Bot className="w-8 h-8 mr-3 text-[#BDA989]" /> Source-Backed
            Assistant
          </h1>
          <p className="text-[#63534B] max-w-3xl">
            This assistant is retrieval-first. Ask a legal question and it will
            return the strongest matching backend sources instead of inventing a
            freeform answer.
          </p>
        </div>
      </div>

      <Card className="flex-1 bg-white border-[#D8D2C8] shadow-sm flex flex-col overflow-hidden">
        <CardContent className="flex-1 p-8 overflow-y-auto">
          {!query ? (
            <div className="flex flex-col items-center justify-center text-center h-full">
              <div className="w-16 h-16 bg-[#EEEDE4] rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-[#DD3300]" />
              </div>
              <h2 className="text-xl font-serif text-[#1F1D1A] mb-2">
                Ask a grounded legal question
              </h2>
              <p className="text-[#63534B] max-w-md mx-auto mb-8">
                The assistant uses stored BWB and Rechtspraak rows and answers
                only with cited support.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 w-full max-w-3xl text-left">
                {SUGGESTED_PROMPTS.map((item) => (
                  <Link
                    key={item.prompt}
                    href={buildAssistantHref(item.prompt, item.domain)}
                    className="p-4 rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] hover:bg-white hover:border-[#DD3300]/30 hover:shadow-sm transition-all text-left flex flex-col h-full group"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <item.icon className="w-4 h-4 text-[#BDA989] group-hover:text-[#DD3300] transition-colors" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#63534B]">
                        Focus: {getDomainLabel(item.domain)}
                      </span>
                    </div>
                    <p className="text-sm text-[#1F1D1A] leading-relaxed">
                      &ldquo;{item.prompt}&rdquo;
                    </p>
                    <p className="mt-3 text-xs leading-5 text-[#7C746B]">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid md:grid-cols-[minmax(0,2fr)_1fr] gap-4">
                <div className="rounded-2xl bg-[#1F1D1A] p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60 mb-2">
                    Retrieval Query
                  </p>
                  <h2 className="text-3xl font-serif mb-3">{query}</h2>
                  <p className="text-sm text-white/70 leading-7">
                    The assistant answers only when stored sources support the
                    question. Citations below link back to source detail views
                    where possible.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#D8D2C8] bg-[#F5F5F4] p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7C746B] mb-2">
                    Retrieval View
                  </p>
                  <p className="text-2xl font-serif text-[#1F1D1A]">
                    {streamState === "grounded"
                      ? "Grounded"
                      : streamState === "streaming"
                        ? "Streaming"
                        : "Needs sources"}
                  </p>
                  <p className="text-sm text-[#63534B] mt-2">
                    Domains surfaced:{" "}
                    {domainsFound.length > 0
                      ? domainsFound
                          .map((item) => getDomainLabel(item))
                          .join(", ")
                      : "None"}
                  </p>
                  <p className="text-sm text-[#63534B] mt-1">
                    Search scope:{" "}
                    {domain ? getDomainLabel(domain) : "All domains"}
                  </p>
                </div>
              </div>

              {searchError ? (
                <div className="rounded-2xl border border-[#DD3300]/20 bg-white p-6">
                  <p className="font-medium text-[#1F1D1A] mb-1">
                    Retrieval unavailable
                  </p>
                  <p className="text-sm text-[#63534B] leading-6">
                    {searchError}
                  </p>
                </div>
              ) : null}

              {!searchError && streamState === "insufficient_sources" ? (
                <div className="rounded-2xl border border-[#D8D2C8] bg-[#F5F5F4] p-8 text-center">
                  <h2 className="text-2xl font-serif text-[#1F1D1A] mb-3">
                    Not enough supporting sources
                  </h2>
                  <p className="text-[#63534B] max-w-2xl mx-auto leading-7">
                    {answerText}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {hasActiveDomainFilter ? (
                      <Link
                        href={buildAssistantHref(query)}
                        className="inline-flex items-center rounded-full border border-[#DD3300]/20 bg-white px-4 py-2 text-sm font-medium text-[#DD3300] hover:border-[#DD3300]/40"
                      >
                        Search all domains
                      </Link>
                    ) : null}
                    {SUGGESTED_PROMPTS.map((item) => (
                      <Link
                        key={`retry-${item.prompt}`}
                        href={buildAssistantHref(item.prompt, item.domain)}
                        className="inline-flex items-center rounded-full border border-[#D8D2C8] bg-white px-4 py-2 text-sm text-[#63534B] hover:border-[#DD3300]/30 hover:text-[#1F1D1A]"
                      >
                        {item.prompt}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {showAnswer ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[#D8D2C8] bg-[#F5F5F4] p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-xl font-serif text-[#1F1D1A]">
                        Answer
                      </h3>
                      <Badge
                        variant="outline"
                        className={
                          streamState === "grounded"
                            ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                            : "text-[#63534B] border-[#D8D2C8] bg-white"
                        }
                      >
                        {streamState === "grounded"
                          ? "Source grounded"
                          : "Streaming"}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-[#1F1D1A]">
                      {answerText}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-serif text-[#1F1D1A]">
                      Cited Sources
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[#63534B] border-[#D8D2C8] bg-[#F5F5F4]"
                    >
                      {sourceCount} citations
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {citations.map((citation) => {
                      const citationTarget = citation.source_id || citation.id;
                      const citationBody = (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge
                              variant="outline"
                              className="border-[#D8D2C8] bg-[#F5F5F4] text-[#63534B]"
                            >
                              {citation.source_type === "case_law"
                                ? "Case law"
                                : "Legislation"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-[#D8D2C8] bg-[#EEEDE4] text-[#63534B]"
                            >
                              {getDomainLabel(citation.domain)}
                            </Badge>
                          </div>
                          <p className="font-medium text-[#1F1D1A]">
                            {citation.title ||
                              citation.source_id ||
                              citation.id}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#7C746B]">
                            {[
                              citation.source_id,
                              citation.article
                                ? `Art. ${citation.article}`
                                : null,
                              citation.court,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <p className="mt-3 text-sm leading-7 text-[#63534B]">
                            {citation.snippet}
                          </p>
                        </>
                      );

                      return citationTarget ? (
                        <Link
                          key={citation.id || citation.source_id}
                          href={`/dashboard/documents/${encodeURIComponent(
                            citationTarget,
                          )}${citation.domain ? `?domain=${encodeURIComponent(citation.domain)}` : ""}`}
                          className="block rounded-2xl border border-[#D8D2C8] bg-white p-5 hover:border-[#DD3300]/30 transition-colors"
                        >
                          {citationBody}
                        </Link>
                      ) : (
                        <div
                          key={citation.snippet}
                          className="rounded-2xl border border-[#D8D2C8] bg-white p-5"
                        >
                          {citationBody}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t border-[#D8D2C8] bg-[#F5F5F4] shrink-0">
          <form
            method="get"
            className="max-w-4xl mx-auto relative flex items-end bg-white rounded-xl border border-[#D8D2C8] shadow-sm focus-within:border-[#DD3300] focus-within:ring-1 focus-within:ring-[#DD3300]/20 transition-all p-2"
          >
            <textarea
              name="q"
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none px-3 py-3 text-sm text-[#1F1D1A] placeholder:text-[#BDA989] focus:outline-none"
              placeholder="Ask a Dutch legal question, for example: huurcontract opzegtermijn"
              defaultValue={query}
              rows={1}
            />

            <select
              name="domain"
              defaultValue={domain || ""}
              className="h-[44px] rounded-lg border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-xs text-[#1F1D1A] focus:outline-none mr-2 hidden sm:block"
            >
              <option value="">All domains</option>
              {DOMAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Button
              type="submit"
              size="icon"
              className="shrink-0 bg-[#DD3300] text-white hover:bg-[#DD3300]/90 rounded-lg ml-2 h-[44px] w-[44px]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center mt-3 flex items-center justify-center space-x-2">
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-semibold text-[#BDA989] border-[#D8D2C8]"
            >
              Context: Stored sources
            </Badge>
            <span className="text-xs text-[#7C746B]">
              Results are grounded in the live backend search index.
            </span>
          </div>
        </div>
      </Card>
      <span className="sr-only">{toolTrace.length} tool events inspected.</span>
    </div>
  );
}
