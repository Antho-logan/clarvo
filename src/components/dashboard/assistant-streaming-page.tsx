"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bot,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Scale,
  Send,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  dashboardCopy,
  normalizeDashboardLocale,
  type DashboardLocale,
} from "@/lib/dashboard-i18n";
import { getDomainLabel, getLocalizedDomainOptions } from "@/lib/legal-display";
import type { AssistantCitation } from "@/lib/types";

const SUGGESTED_PROMPTS = [
  {
    domain: "tenancy_law",
    icon: FileText,
    prompt: "Wat geldt bij opzegging van huur van woonruimte?",
  },
  {
    domain: "employment_law",
    icon: Briefcase,
    prompt: "Wat zijn aandachtspunten bij ontslag op staande voet?",
  },
  {
    domain: "administrative_law",
    icon: Scale,
    prompt: "Welke eisen gelden voor bezwaar tegen een besluit?",
  },
] as const;

type AssistantStreamingPageProps = {
  query: string;
  domain?: string;
  locale?: DashboardLocale | string | null;
};

const SOFT_REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
const STREAM_DISPLAY_TICK_MS = 32;
const STREAM_DISPLAY_CHARS_PER_TICK = 7;

type StreamState = "streaming" | "grounded" | "insufficient_sources" | "error";

type ThinkingStage = {
  id: string;
  label: string;
  done: boolean;
};

function getLiveResearchStages(locale: DashboardLocale) {
  return dashboardCopy[locale].assistant.thinkingStages;
}

function getLiveResearchStageLabel(
  stageId: string,
  locale: DashboardLocale,
  fallback?: string,
) {
  return (
    getLiveResearchStages(locale).find((stage) => stage.id === stageId)
      ?.label ||
    fallback ||
    stageId
  );
}

function visibleThinkingStages(
  activeIndex: number,
  locale: DashboardLocale,
): ThinkingStage[] {
  return getLiveResearchStages(locale)
    .slice(0, activeIndex + 1)
    .map((stage, index) => ({
      ...stage,
      done: index < activeIndex,
    }));
}

function completedThinkingStages(locale: DashboardLocale): ThinkingStage[] {
  return getLiveResearchStages(locale).map((stage) => ({
    ...stage,
    done: true,
  }));
}

type ConversationTurn = {
  id: string;
  query: string;
  domain?: string;
  state: StreamState;
  answerText: string;
  citations: AssistantCitation[];
  sourceIds: string[];
  toolTrace: Array<Record<string, unknown>>;
  stages: ThinkingStage[];
  error?: string;
  saveState?: "saving" | "saved" | "error";
  saveMessage?: string;
};

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type ClientDocument = {
  id: string;
  name: string;
  size: number;
  text: string;
  truncated: boolean;
};

type AssistantStreamEvent =
  | { type: "stage"; id: string; label: string }
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

type SpeechStatus = "idle" | "listening" | "transcribing" | "error";

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): SpeechRecognitionResultLike;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

const ADMINISTRATIVE_LAW_INSUFFICIENT_MESSAGE =
  "Clarvo does not yet have enough administrative-law sources to answer this reliably.";

const GENERIC_INSUFFICIENT_MESSAGE =
  "Clarvo does not have enough grounded sources to answer this reliably.";

const MULTI_QUESTION_SUGGESTED_PROMPTS = [
  "Wat geldt bij opzegging van huur van woonruimte?",
  "Wanneer is ontslag op staande voet geldig?",
  "Wat geldt bij loondoorbetaling tijdens ziekte?",
] as const;

const DEMO_PROMPT_SHORTCUTS = [
  {
    prompt: "Wat geldt bij opzegging van huur van woonruimte?",
    domain: "tenancy_law",
    label: "Huurrecht",
  },
  {
    prompt: "Wanneer is ontslag op staande voet geldig?",
    domain: "employment_law",
    label: "Arbeidsrecht",
  },
  {
    prompt: "Wat geldt bij loondoorbetaling tijdens ziekte?",
    domain: "employment_law",
    label: "Arbeidsrecht",
  },
  {
    prompt: "Kun je mijn volledige belastingaangifte doen?",
    domain: "",
    label: "Safety/refusal example",
  },
] as const;

const LEGAL_REVIEW_DEMO_PROMPT =
  "Beoordeel deze bepaling voor een Nederlandse huurovereenkomst. Welke risico’s zie je?";

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

const OUT_OF_SCOPE_PATTERNS = [
  /belastingaangifte/i,
  /\bduits(?:e)?\b.*arbeidsrecht/i,
  /strafrecht/i,
  /voorlopige hechtenis/i,
  /advocaat vervangen/i,
  /vervangen.*advocaat/i,
] as const;

const MAX_ATTACHED_DOCUMENTS = 3;
const MAX_HISTORY_TURNS = 4;
const SUPPORTED_ATTACHMENT_PATTERN = /\.(pdf|docx|txt|md|markdown|csv)$/i;
const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

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

function appearsToContainMultipleQuestions(query: string) {
  const questionMarks = query.match(/\?/g)?.length || 0;
  if (questionMarks > 1) {
    return true;
  }

  return /\n\s*[-*]?\s*(wat|wanneer|welke|hoe|kun|kan|mag)\b/i.test(query);
}

function isOutOfScopeQuestion(query: string) {
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(query));
}

type AssistantCopy = (typeof dashboardCopy)[DashboardLocale]["assistant"];

function getRefusalDisplay(query: string, copy: AssistantCopy) {
  if (appearsToContainMultipleQuestions(query)) {
    return {
      kind: "multi-question",
      statusLabel: copy.askOneAtATime,
      title: copy.askOneAtATime,
      body: copy.askOneAtATimeBody,
      suggestions: MULTI_QUESTION_SUGGESTED_PROMPTS,
    } as const;
  }

  if (isOutOfScopeQuestion(query)) {
    return {
      kind: "out-of-scope",
      statusLabel: copy.outsideCoverage,
      title: copy.outsideCoverage,
      body: copy.outsideCoverageBody,
      suggestions: [],
    } as const;
  }

  return {
    kind: "insufficient-sources",
    statusLabel: copy.notEnoughSources,
    title: copy.notEnoughSources,
    body: "",
    suggestions: SUGGESTED_PROMPTS.map((item) => item.prompt),
  } as const;
}

function getSuggestedPromptDescription(
  domain: (typeof SUGGESTED_PROMPTS)[number]["domain"],
  copy: AssistantCopy,
) {
  if (domain === "tenancy_law") {
    return copy.suggestedTenancyDescription;
  }
  if (domain === "employment_law") {
    return copy.suggestedEmploymentDescription;
  }
  return copy.suggestedAdministrativeDescription;
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

function makeTurnId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatCitationMeta(citation: AssistantCitation) {
  return [
    citation.source_id,
    citation.article ? `Art. ${citation.article}` : null,
    citation.court,
    citation.decision_date,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getTurnDomains(turn: ConversationTurn) {
  return Array.from(
    new Set(
      [
        turn.domain,
        ...turn.citations
          .map((item) => item.domain)
          .filter((item): item is string => Boolean(item)),
      ].filter((item): item is string => Boolean(item)),
    ),
  );
}

function buildConversationHistory(turns: ConversationTurn[]): ChatHistoryMessage[] {
  return turns
    .slice(-MAX_HISTORY_TURNS)
    .flatMap((turn) => {
      const messages: ChatHistoryMessage[] = [
        { role: "user", content: turn.query },
      ];
      const answer = turn.answerText.trim();
      if (answer) {
        messages.push({
          role: "assistant",
          content: answer.slice(0, 2400),
        });
      }
      return messages;
    });
}

function previewDocumentText(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 180) {
    return cleaned;
  }
  return `${cleaned.slice(0, 177)}...`;
}

function getDocumentParagraphs(text: string) {
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length > 0) {
    return paragraphs;
  }

  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned ? [cleaned] : [];
}

function formatParagraphCount(count: number) {
  return `${count} extracted paragraph${count === 1 ? "" : "s"}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSupportedUpload(file: File) {
  return (
    SUPPORTED_ATTACHMENT_PATTERN.test(file.name) ||
    SUPPORTED_ATTACHMENT_TYPES.has(file.type)
  );
}

function getCitationKey(citation: AssistantCitation, index: number) {
  return [
    citation.id,
    citation.source_id,
    citation.article,
    citation.snippet,
    index,
  ]
    .filter(Boolean)
    .join("-");
}

function dedupeCitations(turns: ConversationTurn[]) {
  const seen = new Set<string>();
  const citations: AssistantCitation[] = [];
  for (const citation of turns.flatMap((turn) => turn.citations)) {
    const key =
      citation.id ||
      `${citation.source_id || ""}:${citation.article || ""}:${citation.snippet || ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    citations.push(citation);
  }
  return citations;
}

async function readSaveError(response: Response) {
  const body = await response.text();
  if (!body) {
    return response.statusText || "Save failed.";
  }

  try {
    const parsed = JSON.parse(body) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "detail" in parsed &&
      typeof parsed.detail === "string"
    ) {
      return parsed.detail;
    }
  } catch {
    return body;
  }

  return response.statusText || "Save failed.";
}

async function readDocumentExtractionError(response: Response) {
  try {
    const parsed = (await response.json()) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "detail" in parsed &&
      typeof parsed.detail === "string"
    ) {
      return parsed.detail;
    }
  } catch {
    return response.statusText || "Document extraction failed.";
  }
  return response.statusText || "Document extraction failed.";
}

async function extractClientDocument(file: File): Promise<ClientDocument> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/agent/extract-document", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readDocumentExtractionError(response));
  }

  const body = (await response.json()) as {
    name?: string;
    text?: string;
    truncated?: boolean;
  };
  if (!body.text) {
    throw new Error("No readable text could be extracted from this file.");
  }

  return {
    id: makeTurnId(),
    name: body.name || file.name,
    size: file.size,
    text: body.text,
    truncated: Boolean(body.truncated),
  };
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as SpeechRecognitionWindow;
  return (
    speechWindow.SpeechRecognition ||
    speechWindow.webkitSpeechRecognition ||
    null
  );
}

export function AssistantStreamingPage({
  query,
  domain,
  locale,
}: AssistantStreamingPageProps) {
  const resolvedLocale =
    locale == null ? "en" : normalizeDashboardLocale(locale);
  const copy = dashboardCopy[resolvedLocale].assistant;
  const localizedDomainOptions = useMemo(
    () => getLocalizedDomainOptions(resolvedLocale),
    [resolvedLocale],
  );
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [draftQuery, setDraftQuery] = useState(query);
  const [selectedDomain, setSelectedDomain] = useState(domain || "");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const startedUrlQueryRef = useRef("");
  const turnsRef = useRef<ConversationTurn[]>([]);
  const clientDocumentsRef = useRef<ClientDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllersRef = useRef<Set<AbortController>>(new Set());
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const updateTurn = useCallback(
    (
      turnId: string,
      updater: (turn: ConversationTurn) => ConversationTurn,
    ) => {
      setTurns((current) =>
        current.map((turn) => (turn.id === turnId ? updater(turn) : turn)),
      );
    },
    [],
  );

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    clientDocumentsRef.current = clientDocuments;
  }, [clientDocuments]);

  const startResearch = useCallback(
    async (question: string, requestedDomain?: string) => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion) {
        return;
      }

      const turnId = makeTurnId();
      const abortController = new AbortController();
      abortControllersRef.current.add(abortController);
      const stageTimers: Array<ReturnType<typeof setTimeout>> = [];
      let stagesCompleted = false;
      let stopDisplayTicker = () => {};

      setTurns((current) => [
        ...current,
        {
          id: turnId,
          query: trimmedQuestion,
          domain: requestedDomain,
          state: "streaming",
          answerText: "",
          citations: [],
          sourceIds: [],
          toolTrace: [],
          stages: visibleThinkingStages(0, resolvedLocale),
        },
      ]);

      try {
        const showThinkingStage = (stageIndex: number) => {
          if (abortController.signal.aborted || stagesCompleted) {
            return;
          }
          updateTurn(turnId, (turn) => ({
            ...turn,
            stages: visibleThinkingStages(stageIndex, resolvedLocale),
          }));
        };
        const completeThinkingTrace = () => {
          if (stagesCompleted) {
            return;
          }
          stagesCompleted = true;
          for (const timer of stageTimers) {
            clearTimeout(timer);
          }
          updateTurn(turnId, (turn) => ({
            ...turn,
            stages: completedThinkingStages(resolvedLocale),
          }));
        };

        getLiveResearchStages(resolvedLocale).slice(1).forEach((_, index) => {
          stageTimers.push(
            setTimeout(() => showThinkingStage(index + 1), 520 * (index + 1)),
          );
        });

        const response = await fetch("/api/agent/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: trimmedQuestion,
            domain: requestedDomain,
            response_language: resolvedLocale,
            max_iterations: 2,
            conversation_history: buildConversationHistory(turnsRef.current),
            client_documents: clientDocumentsRef.current.map((document) => ({
              name: document.name,
              text: document.text,
            })),
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(response.statusText || copy.streamFailed);
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
        let displayedAnswer = "";
        let displayQueue = "";
        let displayTimer: ReturnType<typeof setInterval> | null = null;
        let displayDrainResolvers: Array<() => void> = [];

        const resolveDisplayDrain = () => {
          const resolvers = displayDrainResolvers;
          displayDrainResolvers = [];
          resolvers.forEach((resolve) => resolve());
        };

        stopDisplayTicker = () => {
          if (displayTimer) {
            clearInterval(displayTimer);
            displayTimer = null;
          }
          displayQueue = "";
          resolveDisplayDrain();
        };

        const flushDisplayChunk = () => {
          if (abortController.signal.aborted) {
            stopDisplayTicker();
            return;
          }
          if (!displayQueue) {
            stopDisplayTicker();
            return;
          }

          const nextChunk = displayQueue.slice(0, STREAM_DISPLAY_CHARS_PER_TICK);
          displayQueue = displayQueue.slice(STREAM_DISPLAY_CHARS_PER_TICK);
          displayedAnswer += nextChunk;
          updateTurn(turnId, (turn) => ({
            ...turn,
            answerText: displayedAnswer,
          }));

          if (!displayQueue) {
            stopDisplayTicker();
          }
        };

        const startDisplayTicker = () => {
          if (!displayTimer) {
            displayTimer = setInterval(
              flushDisplayChunk,
              STREAM_DISPLAY_TICK_MS,
            );
          }
        };

        const queueAnswerDisplay = (content: string) => {
          if (!content) {
            return;
          }
          displayQueue += content;
          startDisplayTicker();
        };

        const waitForDisplayQueue = async () => {
          if (!displayQueue && !displayTimer) {
            return;
          }
          await new Promise<void>((resolve) => {
            displayDrainResolvers.push(resolve);
            startDisplayTicker();
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parsed = readSseEvents(buffer);
          buffer = parsed.remainder;

          for (const event of parsed.events) {
            if (event.type === "stage") {
              stagesCompleted = false;
              updateTurn(turnId, (turn) => ({
                ...turn,
                stages: [
                  ...turn.stages.map((item) => ({ ...item, done: true })),
                  {
                    id: event.id,
                    label: getLiveResearchStageLabel(
                      event.id,
                      resolvedLocale,
                      event.label,
                    ),
                    done: false,
                  },
                ],
              }));
            } else if (event.type === "token") {
              completeThinkingTrace();
              streamedAnswer += event.content;
              queueAnswerDisplay(event.content);
            } else if (event.type === "citation" && event.citation) {
              streamedCitations = [
                ...streamedCitations,
                event.citation as AssistantCitation,
              ];
              updateTurn(turnId, (turn) => ({
                ...turn,
                citations: [
                  ...turn.citations,
                  event.citation as AssistantCitation,
                ],
              }));
            } else if (event.type === "insufficient_sources") {
              sawFinalEvent = true;
              completeThinkingTrace();
              const answer =
                event.answer?.trim() ||
                getInsufficientMessage(trimmedQuestion, requestedDomain);
              streamedAnswer = answer;
              streamedCitations = [];
              stopDisplayTicker();
              displayedAnswer = answer;
              updateTurn(turnId, (turn) => ({
                ...turn,
                answerText: answer,
                citations: [],
                sourceIds: event.source_ids || [],
                toolTrace: event.tool_trace || [],
                state: "insufficient_sources",
              }));
            } else if (event.type === "done") {
              sawFinalEvent = true;
              completeThinkingTrace();
              const finalAnswer = streamedAnswer.trim();
              if (!finalAnswer || isRefusalAnswer(finalAnswer)) {
                stopDisplayTicker();
                updateTurn(turnId, (turn) => ({
                  ...turn,
                  answerText:
                    finalAnswer ||
                    getInsufficientMessage(trimmedQuestion, requestedDomain),
                  citations: [],
                  sourceIds: [],
                  toolTrace: event.tool_trace || [],
                  state: "insufficient_sources",
                }));
                continue;
              }

              await waitForDisplayQueue();
              updateTurn(turnId, (turn) => ({
                ...turn,
                answerText: finalAnswer,
                citations: streamedCitations,
                sourceIds: event.source_ids || [],
                toolTrace: event.tool_trace || [],
                state: "grounded",
              }));
            }
          }
        }

        if (!sawFinalEvent) {
          completeThinkingTrace();
          const finalAnswer = streamedAnswer.trim();
          if (!finalAnswer || isRefusalAnswer(finalAnswer)) {
            stopDisplayTicker();
            updateTurn(turnId, (turn) => ({
              ...turn,
              answerText:
                finalAnswer ||
                getInsufficientMessage(trimmedQuestion, requestedDomain),
              citations: [],
              sourceIds: [],
              state: "insufficient_sources",
            }));
          } else {
            await waitForDisplayQueue();
            updateTurn(turnId, (turn) => ({
              ...turn,
              answerText: finalAnswer,
              citations: streamedCitations,
              state: "grounded",
            }));
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          stopDisplayTicker();
          stagesCompleted = true;
          for (const timer of stageTimers) {
            clearTimeout(timer);
          }
          updateTurn(turnId, (turn) => ({
            ...turn,
            error:
              error instanceof Error
                ? error.message
                : "The assistant could not retrieve grounded results.",
            state: "error",
          }));
        }
      } finally {
        // Make sure no pacing interval survives a completed or aborted request.
        stopDisplayTicker();
        for (const timer of stageTimers) {
          clearTimeout(timer);
        }
        abortControllersRef.current.delete(abortController);
      }
    },
    [copy.streamFailed, resolvedLocale, updateTurn],
  );

  const saveTurnToMatter = useCallback(
    async (turn: ConversationTurn) => {
      if (turn.state !== "grounded" || turn.citations.length === 0) {
        updateTurn(turn.id, (current) => ({
          ...current,
          saveState: "error",
          saveMessage: copy.onlyGrounded,
        }));
        return;
      }

      updateTurn(turn.id, (current) => ({
        ...current,
        saveState: "saving",
        saveMessage: undefined,
      }));

      try {
        const response = await fetch("/api/matters/research-notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: turn.query,
            answer: turn.answerText,
            status: turn.state,
            citations: turn.citations,
            source_ids: turn.sourceIds,
            domains: getTurnDomains(turn),
          }),
        });

        if (!response.ok) {
          throw new Error(await readSaveError(response));
        }

        const body = (await response.json()) as {
          matter?: { title?: string };
        };
        const matterTitle = body.matter?.title || "matter";
        updateTurn(turn.id, (current) => ({
          ...current,
          saveState: "saved",
          saveMessage:
            resolvedLocale === "nl"
              ? `${copy.savedToMatter}: ${matterTitle}.`
              : `Saved to ${matterTitle}.`,
        }));
      } catch (error) {
        updateTurn(turn.id, (current) => ({
          ...current,
          saveState: "error",
          saveMessage:
            error instanceof Error
              ? error.message
              : "The research note could not be saved.",
        }));
      }
    },
    [copy.onlyGrounded, copy.savedToMatter, resolvedLocale, updateTurn],
  );

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  useEffect(() => {
    setDraftQuery(query);
    setSelectedDomain(domain || "");

    if (!query) {
      return;
    }

    const urlQueryKey = `${query}\u0000${domain || ""}`;
    if (startedUrlQueryRef.current === urlQueryKey) {
      return;
    }

    startedUrlQueryRef.current = urlQueryKey;
    void startResearch(query, domain);
  }, [query, domain, startResearch]);

  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function handleVoiceInput() {
    if (speechStatus === "listening") {
      setSpeechStatus("transcribing");
      setSpeechMessage("Transcribing...");
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setSpeechSupported(false);
      setSpeechStatus("error");
      setSpeechMessage(
        "Voice input is not supported in this browser yet. Type your question instead.",
      );
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.lang = "nl-NL";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setSpeechStatus("listening");
        setSpeechMessage("Listening...");
      };
      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results.item(index) || event.results[index];
          const alternative = result.item(0) || result[0];
          if (!alternative?.transcript) {
            continue;
          }
          if (result.isFinal) {
            finalTranscript += alternative.transcript;
          } else {
            interimTranscript += alternative.transcript;
          }
        }

        const transcript = (finalTranscript || interimTranscript).trim();
        if (transcript) {
          setSpeechStatus(finalTranscript ? "transcribing" : "listening");
          setSpeechMessage(finalTranscript ? "Transcribing..." : "Listening...");
          setDraftQuery(transcript);
        }
      };
      recognition.onerror = (event) => {
        setSpeechStatus("error");
        setSpeechMessage(
          event.error === "not-allowed"
            ? "Microphone access was blocked. Type your question instead."
            : "Voice input stopped. Type your question instead.",
        );
        recognitionRef.current = null;
      };
      recognition.onend = () => {
        setSpeechStatus((current) =>
          current === "listening" || current === "transcribing"
            ? "idle"
            : current,
        );
        setSpeechMessage((current) =>
          current === "Listening..." || current === "Transcribing..."
            ? null
            : current,
        );
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setSpeechStatus("error");
      setSpeechMessage(
        "Voice input could not start. Type your question instead.",
      );
      recognitionRef.current = null;
    }
  }

  async function handleAttachFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_ATTACHED_DOCUMENTS - clientDocumentsRef.current.length;
    if (remainingSlots <= 0) {
      setAttachmentError(`Attach up to ${MAX_ATTACHED_DOCUMENTS} text documents per chat.`);
      return;
    }

    const readableFiles = files.slice(0, remainingSlots);
    const rejectedFile = readableFiles.find((file) => !isSupportedUpload(file));
    if (rejectedFile) {
      setAttachmentError(
        "Supported uploads are PDF, DOCX, TXT, Markdown, and CSV files.",
      );
      return;
    }

    try {
      const documents = await Promise.all(
        readableFiles.map((file) => extractClientDocument(file)),
      );
      setAttachmentError(
        files.length > remainingSlots
          ? `Added ${remainingSlots} documents. Attach up to ${MAX_ATTACHED_DOCUMENTS} per chat.`
          : null,
      );
      setClientDocuments((current) => [...current, ...documents]);
    } catch (error) {
      setAttachmentError(
        error instanceof Error
          ? error.message
          : "This document could not be converted into readable text.",
      );
    }
  }

  function removeClientDocument(documentId: string) {
    setClientDocuments((current) =>
      current.filter((document) => document.id !== documentId),
    );
    setAttachmentError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = draftQuery.trim();
    if (!trimmedQuestion) {
      return;
    }

    const nextDomain = selectedDomain || undefined;
    startedUrlQueryRef.current = `${trimmedQuestion}\u0000${nextDomain || ""}`;
    if (typeof window !== "undefined") {
      window.history.pushState(
        null,
        "",
        buildAssistantHref(trimmedQuestion, nextDomain),
      );
    }
    setDraftQuery("");
    void startResearch(trimmedQuestion, nextDomain);
  }

  function fillDemoPrompt(prompt: string, shortcutDomain?: string) {
    setDraftQuery(prompt);
    setSelectedDomain(shortcutDomain || "");
  }

  const totalToolEvents = useMemo(
    () => turns.reduce((count, turn) => count + turn.toolTrace.length, 0),
    [turns],
  );
  const activeCitations = useMemo(() => dedupeCitations(turns), [turns]);
  const hasResearchContext = activeCitations.length > 0 || clientDocuments.length > 0;
  const hasConversation = turns.length > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl flex-col pb-8">
      <div className="mb-6 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BDA989]">
            {copy.kicker}
          </p>
          <h1 className="flex items-center text-3xl font-serif tracking-tight text-[#1F1D1A] md:text-4xl">
            <Bot className="mr-3 h-8 w-8 text-[#DD3300]" />
            {copy.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#63534B]">
            {copy.description}
          </p>
        </div>
      </div>

      <div
        className={
          hasResearchContext
            ? "grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
            : "flex flex-1"
        }
      >
        <Card className="flex min-h-[640px] flex-1 flex-col overflow-hidden border-[#D8D2C8] bg-white shadow-sm">
          <CardContent className="flex-1 overflow-y-auto bg-[#F8F6F1] p-0">
            <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
            {!hasConversation ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D8D2C8] bg-white shadow-sm">
                  <Sparkles className="h-8 w-8 text-[#DD3300]" />
                </div>
                <h2 className="mb-2 text-2xl font-serif text-[#1F1D1A]">
                  {copy.startTitle}
                </h2>
                <p className="mx-auto mb-8 max-w-xl text-sm leading-7 text-[#63534B]">
                  {copy.startDescription}
                </p>

                <div className="grid w-full max-w-4xl gap-4 text-left md:grid-cols-3">
                  {SUGGESTED_PROMPTS.map((item) => (
                    <Link
                      key={item.prompt}
                      href={buildAssistantHref(item.prompt, item.domain)}
                      className="group flex h-full flex-col rounded-lg border border-[#D8D2C8] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#DD3300]/30 hover:shadow-md motion-reduce:hover:translate-y-0"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F5F5F4]">
                          <item.icon className="h-4 w-4 text-[#BDA989] transition-colors group-hover:text-[#DD3300]" />
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
                          {getDomainLabel(item.domain, resolvedLocale)}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-6 text-[#1F1D1A]">
                        {item.prompt}
                      </p>
                      <p className="mt-3 text-xs leading-5 text-[#7C746B]">
                        {getSuggestedPromptDescription(item.domain, copy)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {turns.map((turn) => (
                  <ConversationTurnView
                    key={turn.id}
                    turn={turn}
                    onSave={saveTurnToMatter}
                    locale={resolvedLocale}
                  />
                ))}
              </div>
            )}
            </div>
          </CardContent>

          <div className="shrink-0 border-t border-[#D8D2C8] bg-white p-4">
            <div className="mx-auto max-w-4xl">
              {clientDocuments.length > 0 || attachmentError ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {clientDocuments.map((document) => {
                    const paragraphCount = getDocumentParagraphs(
                      document.text,
                    ).length;

                    return (
                      <Badge
                        key={document.id}
                        variant="outline"
                        className="gap-2 border-[#D8D2C8] bg-[#F8F6F1] px-2 py-1 text-[#63534B]"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#DD3300]" />
                        <span className="font-medium text-[#1F1D1A]">
                          {document.name}
                        </span>
                        <span className="text-[10px] text-[#7C746B]">
                          {copy.currentChatDocument} ·{" "}
                          {formatParagraphCount(paragraphCount)} ·{" "}
                          {formatFileSize(document.size)}
                          {document.truncated ? " · trimmed" : ""}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${document.name}`}
                          className="rounded-full p-0.5 text-[#7C746B] transition-colors hover:bg-white hover:text-[#DD3300]"
                          onClick={() => removeClientDocument(document.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  {attachmentError ? (
                    <span className="text-xs text-[#8A2408]">
                      {attachmentError}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <form
                onSubmit={handleSubmit}
                className="overflow-hidden rounded-2xl border border-[#D8D2C8] bg-white shadow-sm transition-all focus-within:border-[#DD3300] focus-within:ring-2 focus-within:ring-[#DD3300]/10"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md,.markdown,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
                  className="hidden"
                  aria-label="Attach text document"
                  onChange={handleAttachFiles}
                />

                <textarea
                  name="q"
                  className="block max-h-48 min-h-[56px] w-full resize-none bg-transparent px-4 pt-4 text-sm leading-6 text-[#1F1D1A] placeholder:text-[#BDA989] focus:outline-none"
                  placeholder={
                    resolvedLocale === "nl"
                      ? "Stel een Nederlandse juridische vraag, bijvoorbeeld: opzegtermijn huurcontract"
                      : "Ask one Dutch legal question, for example: huurcontract opzegtermijn"
                  }
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  rows={1}
                />

                <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1.5">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 rounded-lg text-[#63534B] transition-colors hover:bg-[#F5F5F4] hover:text-[#DD3300]"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach contract document"
                      title="Attach a PDF, DOCX, or text contract"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>

                    <select
                      name="domain"
                      value={selectedDomain}
                      onChange={(event) => setSelectedDomain(event.target.value)}
                      className="hidden h-9 rounded-lg border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-xs text-[#1F1D1A] transition-colors focus:border-[#DD3300]/50 focus:outline-none sm:block"
                    >
                      <option value="">{copy.allDomains}</option>
                      {localizedDomainOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className={`h-9 w-9 shrink-0 rounded-lg transition-colors hover:bg-[#F5F5F4] hover:text-[#DD3300] ${
                        speechStatus === "listening"
                          ? "bg-[#FFF8F5] text-[#DD3300]"
                          : "text-[#63534B]"
                      }`}
                      disabled={!speechSupported && speechStatus !== "error"}
                      onClick={handleVoiceInput}
                      title={
                        speechSupported
                          ? "Speak a Dutch legal question"
                          : "Voice input is not supported in this browser yet. Type your question instead."
                      }
                      aria-label={
                        speechSupported
                          ? speechStatus === "listening"
                            ? "Stop voice input"
                            : "Start voice input"
                          : "Voice input not supported"
                      }
                    >
                      {speechSupported ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <MicOff className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      type="submit"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-lg bg-[#DD3300] text-white shadow-sm transition-all hover:bg-[#C22D00] hover:shadow-md disabled:opacity-50"
                      disabled={!draftQuery.trim()}
                      aria-label="Send question"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <Badge
                  variant="outline"
                  className="border-[#D8D2C8] text-[10px] font-semibold uppercase text-[#BDA989]"
                >
                  {copy.contextStoredSources}
                </Badge>
                {clientDocuments.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-[#D8D2C8] bg-[#F8F6F1] text-[10px] font-semibold uppercase text-[#63534B]"
                  >
                    {clientDocuments.length}{" "}
                    {clientDocuments.length === 1
                      ? copy.chatAttachment
                      : copy.chatAttachments}
                  </Badge>
                ) : null}
                {speechMessage ? (
                  <Badge
                    variant="outline"
                    className="border-[#D8D2C8] bg-[#FFF8F5] text-[10px] font-semibold uppercase text-[#DD3300]"
                  >
                    {speechMessage}
                  </Badge>
                ) : null}
                <span className="text-xs leading-5 text-[#7C746B]">
                  <span>
                    {copy.uploadInstruction}
                  </span>{" "}
                  <span>
                    {copy.contractFactWarning}
                  </span>{" "}
                  <span>{copy.liveBackend}</span>{" "}
                  <span>
                    {copy.voiceLocal}
                  </span>{" "}
                  <span>{copy.reviewBeforeSending}</span>
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-[#EEEDE4] bg-[#F8F6F1] px-3 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
                    {copy.demoPrompts}
                  </span>
                  <span className="text-xs text-[#7C746B]">
                    {copy.demoPromptNote}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEMO_PROMPT_SHORTCUTS.map((shortcut) => (
                    <button
                      key={shortcut.prompt}
                      type="button"
                      aria-label={`Use demo prompt: ${shortcut.prompt}`}
                      className="rounded-full border border-[#D8D2C8] bg-white px-3 py-1.5 text-left text-xs leading-5 text-[#63534B] transition-colors hover:border-[#DD3300]/30 hover:bg-[#FFF8F5] hover:text-[#1F1D1A]"
                      onClick={() =>
                        fillDemoPrompt(shortcut.prompt, shortcut.domain)
                      }
                    >
                      <span className="mr-2 font-semibold text-[#1F1D1A]">
                        {shortcut.domain
                          ? getDomainLabel(shortcut.domain, resolvedLocale)
                          : shortcut.label}
                      </span>
                      {shortcut.prompt}
                    </button>
                  ))}
                </div>
                {clientDocuments.length > 0 ? (
                  <div className="mt-3 border-t border-[#D8D2C8] pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
                      {copy.documentReviewExample}
                    </p>
                    <button
                      type="button"
                      aria-label={`Use demo prompt: ${LEGAL_REVIEW_DEMO_PROMPT}`}
                      className="rounded-full border border-[#D8D2C8] bg-white px-3 py-1.5 text-left text-xs leading-5 text-[#63534B] transition-colors hover:border-[#DD3300]/30 hover:bg-[#FFF8F5] hover:text-[#1F1D1A]"
                      onClick={() =>
                        fillDemoPrompt(LEGAL_REVIEW_DEMO_PROMPT, "tenancy_law")
                      }
                    >
                      <span className="mr-2 font-semibold text-[#1F1D1A]">
                        {copy.legalReviewMode}
                      </span>
                      {LEGAL_REVIEW_DEMO_PROMPT}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
        {hasResearchContext ? (
          <CitationSidebar
            citations={activeCitations}
            documents={clientDocuments}
            locale={resolvedLocale}
          />
        ) : null}
      </div>
      <span className="sr-only">{totalToolEvents} tool events inspected.</span>
    </div>
  );
}

function CitationSidebar({
  citations,
  documents,
  locale,
}: {
  citations: AssistantCitation[];
  documents: ClientDocument[];
  locale: DashboardLocale;
}) {
  const copy = dashboardCopy[locale].assistant;
  return (
    <motion.aside
      initial={{ opacity: 0, y: 14, filter: "blur(3px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.68, ease: SOFT_REVEAL_EASE }}
      className="h-fit rounded-lg border border-[#D8D2C8] bg-white p-4 shadow-sm motion-reduce:transform-none lg:sticky lg:top-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-serif text-[#1F1D1A]">
          {copy.researchContext}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {citations.length > 0 ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              {copy.sourceTrailBadge}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
          >
            {citations.length + documents.length}
          </Badge>
        </div>
      </div>
      <div className="space-y-5">
        {citations.length > 0 ? (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C746B]">
              {copy.legalSourceTrail}
            </h3>
            <div className="space-y-3">
              {citations.map((citation, index) => {
                const citationTarget = citation.source_id || citation.id;
                const citationMeta = formatCitationMeta(citation);
                const sourceHref = citationTarget
                  ? `/dashboard/documents/${encodeURIComponent(
                      citationTarget,
                    )}${citation.domain ? `?domain=${encodeURIComponent(citation.domain)}` : ""}`
                  : null;

                return (
                  <motion.div
                    key={getCitationKey(citation, index)}
                    initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.56,
                      delay: 0.12 + Math.min(index * 0.08, 0.28),
                      ease: SOFT_REVEAL_EASE,
                    }}
                    className="rounded-lg border border-[#D8D2C8] bg-white p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
                      >
                        {citation.source_type === "case_law"
                          ? copy.citedCaseLaw
                          : copy.citedLegislation}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-[#D8D2C8] bg-[#EEEDE4] text-[#63534B]"
                      >
                        {getDomainLabel(citation.domain, locale)}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-5 text-[#1F1D1A]">
                      {citation.title || citation.source_id || citation.id}
                    </p>
                    {citationMeta ? (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#7C746B]">
                        {citationMeta}
                      </p>
                    ) : null}
                    {citation.snippet ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-[#DD3300]">
                          {copy.showSourcePreview}
                        </summary>
                        <p className="mt-2 text-xs leading-5 text-[#63534B]">
                          <span className="font-medium text-[#1F1D1A]">
                            {copy.sourcePreview}
                          </span>{" "}
                          {citation.snippet}
                        </p>
                      </details>
                    ) : null}
                    {sourceHref ? (
                      <Link
                        href={sourceHref}
                        className="mt-3 inline-flex items-center text-xs font-medium text-[#DD3300] hover:text-[#A92700]"
                      >
                        {copy.openSource}
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </section>
        ) : null}

        {documents.length > 0 ? (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C746B]">
              {copy.contractContext}
            </h3>
            <div className="space-y-3">
              {documents.map((document, index) => {
                const paragraphs = getDocumentParagraphs(document.text);

                return (
                  <motion.div
                    key={document.id}
                    initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.56,
                      delay: 0.12 + Math.min(index * 0.08, 0.28),
                      ease: SOFT_REVEAL_EASE,
                    }}
                    className="rounded-lg border border-[#D8D2C8] bg-[#F8F6F1] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="border-[#D8D2C8] bg-white text-[#63534B]"
                      >
                        D{index + 1}
                      </Badge>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#7C746B]">
                        {copy.currentChatOnly}
                      </span>
                    </div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[#7C746B]">
                      {copy.currentChatDocument} ·{" "}
                      {formatParagraphCount(paragraphs.length)}
                    </p>
                    <p className="text-sm font-medium leading-5 text-[#1F1D1A]">
                      {document.name}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#63534B]">
                      <span className="font-medium text-[#1F1D1A]">
                        {copy.firstContractParagraph}
                      </span>
                      : {previewDocumentText(paragraphs[0] || document.text)}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-[#7C746B]">
                      {copy.contractFactWarning}
                    </p>
                    {document.truncated ? (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#8A2408]">
                        {copy.trimmedForReview}
                      </p>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </motion.aside>
  );
}

function ConversationTurnView({
  turn,
  onSave,
  locale,
}: {
  turn: ConversationTurn;
  onSave: (turn: ConversationTurn) => void;
  locale: DashboardLocale;
}) {
  const copy = dashboardCopy[locale].assistant;
  const refusalDisplay = getRefusalDisplay(turn.query, copy);
  const domainsFound = getTurnDomains(turn);
  const sourceCount = turn.sourceIds.length || turn.citations.length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: SOFT_REVEAL_EASE }}
      className="space-y-4 motion-reduce:transform-none"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D8D2C8] bg-white sm:flex">
          <UserCircle className="h-5 w-5 text-[#7C746B]" />
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-[#D8D2C8] bg-white px-5 py-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
              {copy.question}
            </span>
            <Badge
              variant="outline"
              className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
            >
              {turn.domain
                ? getDomainLabel(turn.domain, locale)
                : copy.allDomains}
            </Badge>
          </div>
          <p className="whitespace-pre-wrap text-base leading-7 text-[#1F1D1A]">
            {turn.query}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D8D2C8] bg-[#1F1D1A] sm:flex">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          {turn.state === "error" ? (
            <div className="rounded-lg border border-[#DD3300]/20 bg-white px-5 py-4 shadow-sm">
              <p className="mb-1 font-medium text-[#1F1D1A]">
                {copy.retrievalUnavailable}
              </p>
              <p className="text-sm leading-6 text-[#63534B]">{turn.error}</p>
            </div>
          ) : null}

          {turn.state === "streaming" ? (
            <motion.div
              initial={{ opacity: 0, y: 6, filter: "blur(1px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.3, ease: SOFT_REVEAL_EASE }}
              className="rounded-lg border border-[#D8D2C8] bg-white px-5 py-4 shadow-sm motion-reduce:transform-none"
            >
              {turn.stages.length > 0 ? (
                <div className="space-y-4">
                  <ThinkingTrace stages={turn.stages} locale={locale} />
                  {turn.answerText ? (
                    <StreamingAnswer text={turn.answerText} />
                  ) : null}
                </div>
              ) : turn.answerText ? (
                <StreamingAnswer text={turn.answerText} />
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-[#63534B]">
                  <Loader2 className="h-4 w-4 text-[#DD3300] motion-safe:animate-spin" />
                  {copy.connecting}
                </div>
              )}
            </motion.div>
          ) : null}

          {turn.state === "insufficient_sources" ? (
            <div className="rounded-lg border border-[#D8D2C8] bg-white px-5 py-5 text-left shadow-sm">
              <Badge
                variant="outline"
                className="mb-3 border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
              >
                {refusalDisplay.statusLabel}
              </Badge>
              <h2 className="mb-2 text-xl font-serif text-[#1F1D1A]">
                {refusalDisplay.title}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#63534B]">
                {refusalDisplay.body || turn.answerText}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {turn.domain &&
                refusalDisplay.kind === "insufficient-sources" ? (
                  <Link
                    href={buildAssistantHref(turn.query)}
                    className="inline-flex items-center rounded-full border border-[#DD3300]/20 bg-[#FFF8F5] px-4 py-2 text-sm font-medium text-[#DD3300] transition-colors hover:border-[#DD3300]/40"
                  >
                    {copy.searchAllDomains}
                  </Link>
                ) : null}
                {refusalDisplay.suggestions.map((prompt) => (
                  <Link
                    key={`retry-${turn.id}-${prompt}`}
                    href={buildAssistantHref(prompt)}
                    className="inline-flex items-center rounded-full border border-[#D8D2C8] bg-[#F8F6F1] px-4 py-2 text-sm text-[#63534B] transition-colors hover:border-[#DD3300]/30 hover:bg-white hover:text-[#1F1D1A]"
                  >
                    {prompt}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {turn.state === "grounded" ? (
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 6, filter: "blur(1px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.36, ease: SOFT_REVEAL_EASE }}
                className="rounded-lg border border-[#D8D2C8] bg-white px-5 py-5 shadow-sm motion-reduce:transform-none"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {copy.groundedAnswer}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-[#DD3300]/30 bg-[#FFF7F3] text-[#8A2408]"
                  >
                    {copy.needsReview}
                  </Badge>
                  <p className="text-xs text-[#7C746B]">
                    {copy.domainsSurfaced}:{" "}
                    {domainsFound.length > 0
                      ? domainsFound
                          .map((item) => getDomainLabel(item, locale))
                          .join(", ")
                      : copy.noDomains}
                  </p>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#1F1D1A]">
                  {turn.answerText}
                </p>
	                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEEDE4] pt-4">
	                  <div aria-live="polite" className="text-sm text-[#63534B]">
	                    {sourceCount > 0 ? (
	                      <span>
	                        {copy.sourceTrailPreserved}: {sourceCount}{" "}
	                        {sourceCount === 1
                            ? copy.citedLegalSource
                            : copy.citedLegalSources}{" "}
                          {copy.sidePanel}.
	                      </span>
	                    ) : null}
	                    {turn.saveState === "saved" ? (
	                      <span className="block text-emerald-700">
	                        {turn.saveMessage}
	                      </span>
	                    ) : null}
	                    {turn.saveState === "error" ? (
	                      <span className="block text-[#8A2408]">
	                        {turn.saveMessage}
	                      </span>
	                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#D8D2C8] bg-white text-[#1F1D1A] hover:border-[#DD3300]/30 hover:bg-[#FFF8F5]"
                    disabled={turn.saveState === "saving" || turn.saveState === "saved"}
                    onClick={() => onSave(turn)}
                  >
                    <Briefcase className="mr-2 h-4 w-4 text-[#DD3300]" />
                    {turn.saveState === "saving"
                      ? copy.saving
                      : turn.saveState === "saved"
                        ? copy.savedToMatter
                        : copy.saveToMatter}
                  </Button>
                </div>
              </motion.div>
	            </div>
	          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

function ThinkingTrace({
  stages,
  locale,
}: {
  stages: ThinkingStage[];
  locale: DashboardLocale;
}) {
  const copy = dashboardCopy[locale].assistant;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-medium text-[#63534B]">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#DD3300] opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#DD3300]" />
        </span>
        {copy.thinking}
      </div>
      <ul className="space-y-1.5 pl-0.5">
        <AnimatePresence initial={false}>
          {stages.map((stage) => (
            <motion.li
              key={stage.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2 text-xs"
            >
              {stage.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 shrink-0 text-[#BDA989] motion-safe:animate-spin" />
              )}
              <span
                className={
                  stage.done
                    ? "text-[#7C746B]"
                    : "font-medium text-[#1F1D1A]"
                }
              >
                {stage.label}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function StreamingAnswer({ text }: { text: string }) {
  return (
    <motion.p
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "linear" }}
      aria-live="polite"
      className="whitespace-pre-wrap break-words text-sm leading-7 text-[#1F1D1A]"
      style={{ overflowAnchor: "none" }}
    >
      {text}
      <motion.span
        aria-hidden="true"
        className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] rounded-full bg-[#DD3300] align-middle"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }}
      />
    </motion.p>
  );
}
