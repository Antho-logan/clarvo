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

type StreamState = "streaming" | "grounded" | "insufficient_sources" | "error";

type ConversationTurn = {
  id: string;
  query: string;
  domain?: string;
  state: StreamState;
  answerText: string;
  citations: AssistantCitation[];
  sourceIds: string[];
  toolTrace: Array<Record<string, unknown>>;
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
  "Veridicta does not yet have enough administrative-law sources to answer this reliably.";

const GENERIC_INSUFFICIENT_MESSAGE =
  "Veridicta does not have enough grounded sources to answer this reliably.";

const MULTI_QUESTION_SUGGESTED_PROMPTS = [
  "Wat geldt bij opzegging van huur van woonruimte?",
  "Wanneer is ontslag op staande voet geldig?",
  "Wat geldt bij loondoorbetaling tijdens ziekte?",
] as const;

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

function getRefusalDisplay(query: string) {
  if (appearsToContainMultipleQuestions(query)) {
    return {
      kind: "multi-question",
      statusLabel: "Ask one legal question at a time",
      title: "Ask one legal question at a time",
      body:
        "This prompt contains multiple separate legal questions. Veridicta retrieves sources per legal issue. Ask one question at a time so the assistant can attach the right citations.",
      suggestions: MULTI_QUESTION_SUGGESTED_PROMPTS,
    } as const;
  }

  if (isOutOfScopeQuestion(query)) {
    return {
      kind: "out-of-scope",
      statusLabel: "Outside current coverage",
      title: "Outside current coverage",
      body:
        "Veridicta currently supports selected Dutch legal research workflows. This question is outside the current corpus or requires professional advice beyond the product scope.",
      suggestions: [],
    } as const;
  }

  return {
    kind: "insufficient-sources",
    statusLabel: "Not enough supporting sources",
    title: "Not enough supporting sources",
    body: "",
    suggestions: SUGGESTED_PROMPTS.map((item) => item.prompt),
  } as const;
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
}: AssistantStreamingPageProps) {
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
        },
      ]);

      try {
        const response = await fetch("/api/agent/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: trimmedQuestion,
            domain: requestedDomain,
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
              updateTurn(turnId, (turn) => ({
                ...turn,
                answerText: turn.answerText + event.content,
              }));
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
              const answer =
                event.answer?.trim() ||
                getInsufficientMessage(trimmedQuestion, requestedDomain);
              streamedAnswer = answer;
              streamedCitations = [];
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
              const finalAnswer = streamedAnswer.trim();
              if (!finalAnswer || isRefusalAnswer(finalAnswer)) {
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

              updateTurn(turnId, (turn) => ({
                ...turn,
                citations: streamedCitations,
                sourceIds: event.source_ids || [],
                toolTrace: event.tool_trace || [],
                state: "grounded",
              }));
            }
          }
        }

        if (!sawFinalEvent) {
          const finalAnswer = streamedAnswer.trim();
          if (!finalAnswer || isRefusalAnswer(finalAnswer)) {
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
            updateTurn(turnId, (turn) => ({
              ...turn,
              citations: streamedCitations,
              state: "grounded",
            }));
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
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
        abortControllersRef.current.delete(abortController);
      }
    },
    [updateTurn],
  );

  const saveTurnToMatter = useCallback(
    async (turn: ConversationTurn) => {
      if (turn.state !== "grounded" || turn.citations.length === 0) {
        updateTurn(turn.id, (current) => ({
          ...current,
          saveState: "error",
          saveMessage: "Only grounded answers with citations can be saved.",
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
        updateTurn(turn.id, (current) => ({
          ...current,
          saveState: "saved",
          saveMessage: `Saved to ${body.matter?.title || "matter"}.`,
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
    [updateTurn],
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
            Source-backed legal research
          </p>
          <h1 className="flex items-center text-3xl font-serif tracking-tight text-[#1F1D1A] md:text-4xl">
            <Bot className="mr-3 h-8 w-8 text-[#DD3300]" />
            Legal Research Assistant
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#63534B]">
            Ask one Dutch legal research question. The assistant checks stored
            sources first, answers only when support is strong, and keeps the
            citations visible in the conversation.
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
                  Start with one legal issue
                </h2>
                <p className="mx-auto mb-8 max-w-xl text-sm leading-7 text-[#63534B]">
                  Veridicta retrieves sources per legal issue. Focus the prompt
                  so the answer can attach the right citations.
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
                          {getDomainLabel(item.domain)}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-6 text-[#1F1D1A]">
                        {item.prompt}
                      </p>
                      <p className="mt-3 text-xs leading-5 text-[#7C746B]">
                        {item.description}
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
                  {clientDocuments.map((document) => (
                    <Badge
                      key={document.id}
                      variant="outline"
                      className="gap-2 border-[#D8D2C8] bg-[#F8F6F1] px-2 py-1 text-[#63534B]"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#DD3300]" />
                      <span>{document.name}</span>
                      <span className="text-[10px] text-[#7C746B]">
                        {formatFileSize(document.size)}
                        {document.truncated ? ", trimmed" : ""}
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
                  ))}
                  {attachmentError ? (
                    <span className="text-xs text-[#8A2408]">
                      {attachmentError}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <form
                onSubmit={handleSubmit}
                className="flex items-end rounded-xl border border-[#D8D2C8] bg-white p-2 shadow-sm transition-all focus-within:border-[#DD3300] focus-within:ring-2 focus-within:ring-[#DD3300]/10"
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

                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-[46px] w-[46px] shrink-0 rounded-lg border-[#D8D2C8] bg-white text-[#63534B] transition-all hover:border-[#DD3300]/30 hover:bg-[#FFF8F5]"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach contract document"
                  title="Attach a PDF, DOCX, or text contract"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <textarea
                  name="q"
                  className="min-h-[46px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-[#1F1D1A] placeholder:text-[#BDA989] focus:outline-none"
                  placeholder="Ask one Dutch legal question, for example: huurcontract opzegtermijn"
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  rows={1}
                />

                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={`ml-2 h-[46px] w-[46px] shrink-0 rounded-lg border-[#D8D2C8] bg-white transition-all hover:border-[#DD3300]/30 hover:bg-[#FFF8F5] ${
                    speechStatus === "listening"
                      ? "border-[#DD3300]/40 bg-[#FFF8F5] text-[#DD3300]"
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

                <select
                  name="domain"
                  value={selectedDomain}
                  onChange={(event) => setSelectedDomain(event.target.value)}
                  className="mr-2 hidden h-[46px] rounded-lg border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-xs text-[#1F1D1A] transition-colors focus:border-[#DD3300]/50 focus:outline-none sm:block"
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
                  className="ml-2 h-[46px] w-[46px] shrink-0 rounded-lg bg-[#DD3300] text-white shadow-sm transition-all hover:bg-[#C22D00] hover:shadow-md disabled:opacity-50"
                  disabled={!draftQuery.trim()}
                  aria-label="Send question"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-center">
            <Badge
              variant="outline"
              className="border-[#D8D2C8] text-[10px] font-semibold uppercase text-[#BDA989]"
            >
              Context: Stored sources
            </Badge>
            {clientDocuments.length > 0 ? (
              <Badge
                variant="outline"
                className="border-[#D8D2C8] bg-[#F8F6F1] text-[10px] font-semibold uppercase text-[#63534B]"
              >
                {clientDocuments.length} chat attachment
                {clientDocuments.length === 1 ? "" : "s"}
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
            <span className="text-xs text-[#7C746B]">
              Results are grounded in the live backend search index. Voice input
              is transcribed locally by the browser when supported. Review
              before sending.
            </span>
            </div>
          </div>
        </Card>
        {hasResearchContext ? (
          <CitationSidebar citations={activeCitations} documents={clientDocuments} />
        ) : null}
      </div>
      <span className="sr-only">{totalToolEvents} tool events inspected.</span>
    </div>
  );
}

function CitationSidebar({
  citations,
  documents,
}: {
  citations: AssistantCitation[];
  documents: ClientDocument[];
}) {
  return (
    <aside className="h-fit rounded-lg border border-[#D8D2C8] bg-white p-4 shadow-sm lg:sticky lg:top-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-serif text-[#1F1D1A]">Research context</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {citations.length > 0 ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              Source trail preserved
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
              Legal source trail
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
                  <div
                    key={getCitationKey(citation, index)}
                    className="rounded-lg border border-[#D8D2C8] bg-white p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
                      >
                        {citation.source_type === "case_law"
                          ? "Cited case law"
                          : "Cited legislation"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-[#D8D2C8] bg-[#EEEDE4] text-[#63534B]"
                      >
                        {getDomainLabel(citation.domain)}
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
                          Show source preview
                        </summary>
                        <p className="mt-2 text-xs leading-5 text-[#63534B]">
                          <span className="font-medium text-[#1F1D1A]">
                            Source preview:
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
                        Open source
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {documents.length > 0 ? (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C746B]">
              Contract context
            </h3>
            <div className="space-y-3">
              {documents.map((document, index) => (
                <div
                  key={document.id}
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
                      Current chat
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-5 text-[#1F1D1A]">
                    {document.name}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#63534B]">
                    {previewDocumentText(document.text)}
                  </p>
                  {document.truncated ? (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#8A2408]">
                      Trimmed for review
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function ConversationTurnView({
  turn,
  onSave,
}: {
  turn: ConversationTurn;
  onSave: (turn: ConversationTurn) => void;
}) {
  const refusalDisplay = getRefusalDisplay(turn.query);
  const domainsFound = getTurnDomains(turn);
  const sourceCount = turn.sourceIds.length || turn.citations.length;
  const loadingLabel = turn.answerText
    ? "Checking citations..."
    : "Researching sources...";

  return (
    <article className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D8D2C8] bg-white sm:flex">
          <UserCircle className="h-5 w-5 text-[#7C746B]" />
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-[#D8D2C8] bg-white px-5 py-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C746B]">
              Question
            </span>
            <Badge
              variant="outline"
              className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
            >
              {turn.domain ? getDomainLabel(turn.domain) : "All domains"}
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
                Retrieval unavailable
              </p>
              <p className="text-sm leading-6 text-[#63534B]">{turn.error}</p>
            </div>
          ) : null}

          {turn.state === "streaming" ? (
            <div className="rounded-lg border border-[#D8D2C8] bg-white px-5 py-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#63534B]">
                <Loader2 className="h-4 w-4 text-[#DD3300] motion-safe:animate-spin" />
                {loadingLabel}
              </div>
              {turn.answerText ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-[#1F1D1A]">
                  {turn.answerText}
                </p>
              ) : (
                <div className="space-y-2" aria-hidden="true">
                  <div className="h-3 w-2/3 rounded-full bg-[#EEEDE4] motion-safe:animate-pulse" />
                  <div className="h-3 w-5/6 rounded-full bg-[#EEEDE4] motion-safe:animate-pulse" />
                  <div className="h-3 w-1/2 rounded-full bg-[#EEEDE4] motion-safe:animate-pulse" />
                </div>
              )}
            </div>
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
                    Search all domains
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
              <div className="rounded-lg border border-[#D8D2C8] bg-white px-5 py-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Grounded answer
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-[#DD3300]/30 bg-[#FFF7F3] text-[#8A2408]"
                  >
                    Needs lawyer review
                  </Badge>
                  <p className="text-xs text-[#7C746B]">
                    Domains surfaced:{" "}
                    {domainsFound.length > 0
                      ? domainsFound
                          .map((item) => getDomainLabel(item))
                          .join(", ")
                      : "None"}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-[#1F1D1A]">
                  {turn.answerText}
                </p>
	                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEEDE4] pt-4">
	                  <div aria-live="polite" className="text-sm text-[#63534B]">
	                    {sourceCount > 0 ? (
	                      <span>
	                        Source trail preserved: {sourceCount} cited legal source
	                        {sourceCount === 1 ? "" : "s"} in the side panel.
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
                      ? "Saving..."
                      : turn.saveState === "saved"
                        ? "Saved to Matter"
                        : "Save to Matter"}
                  </Button>
                </div>
              </div>
	            </div>
	          ) : null}
        </div>
      </div>
    </article>
  );
}
