import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssistantStreamingPage } from "@/components/dashboard/assistant-streaming-page";

describe("assistant streaming page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (
      window as Window &
        typeof globalThis & {
          SpeechRecognition?: unknown;
          webkitSpeechRecognition?: unknown;
        }
    ).SpeechRecognition;
    delete (
      window as Window &
        typeof globalThis & {
          SpeechRecognition?: unknown;
          webkitSpeechRecognition?: unknown;
        }
    ).webkitSpeechRecognition;
  });

  function createAssistantStream(events: Array<Record<string, unknown>>) {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (const event of events) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        }
        controller.close();
      },
    });
  }

  function mockAssistantStream(events: Array<Record<string, unknown>>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(createAssistantStream(events), { status: 200 })),
    );
  }

  function installMockSpeechRecognition() {
    const instances: Array<{
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      maxAlternatives?: number;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      abort: ReturnType<typeof vi.fn>;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onresult: ((event: Record<string, unknown>) => void) | null;
      onerror: ((event: Record<string, unknown>) => void) | null;
    }> = [];

    class MockSpeechRecognition {
      lang = "";
      continuous = true;
      interimResults = false;
      maxAlternatives?: number;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((event: Record<string, unknown>) => void) | null = null;
      onerror: ((event: Record<string, unknown>) => void) | null = null;
      start = vi.fn(() => this.onstart?.());
      stop = vi.fn(() => this.onend?.());
      abort = vi.fn();

      constructor() {
        instances.push(this);
      }
    }

    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });

    return instances;
  }

  function speechResult(transcript: string) {
    const result = {
      isFinal: true,
      0: { transcript },
      length: 1,
      item: () => ({ transcript }),
    };
    return {
      resultIndex: 0,
      results: {
        0: result,
        length: 1,
        item: () => result,
      },
    };
  }

  it("renders microphone fallback without crashing in unsupported browsers", async () => {
    render(<AssistantStreamingPage query="" domain={undefined} />);

    const micButton = await screen.findByRole("button", {
      name: "Voice input not supported",
    });

    expect(micButton).toBeDisabled();
    expect(micButton).toHaveAttribute(
      "title",
      "Voice input is not supported in this browser yet. Type your question instead.",
    );
    expect(
      screen.getByText(/Voice input is transcribed locally by the browser/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Upload a clause or contract excerpt, then ask for a legal review.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Contract text is treated as user-provided facts, not legal authority.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("fills the assistant input from a mocked Dutch voice transcript", async () => {
    const instances = installMockSpeechRecognition();

    render(<AssistantStreamingPage query="" domain={undefined} />);

    const micButton = await screen.findByRole("button", {
      name: "Start voice input",
    });
    fireEvent.click(micButton);

    expect(instances[0].lang).toBe("nl-NL");
    expect(instances[0].interimResults).toBe(true);
    expect(await screen.findByText("Listening...")).toBeInTheDocument();

    act(() => {
      instances[0].onresult?.(
        speechResult("Wat geldt bij opzegging van huur van woonruimte?"),
      );
      instances[0].onend?.();
    });

    expect(screen.getByRole("textbox")).toHaveValue(
      "Wat geldt bij opzegging van huur van woonruimte?",
    );
  });

  it("still submits typed questions through the normal assistant path", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          createAssistantStream([
            { type: "token", content: "Typed antwoord." },
            {
              type: "done",
              status: "grounded",
              source_ids: [],
              tool_trace: [],
            },
          ]),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AssistantStreamingPage query="" domain={undefined} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Wanneer is ontslag op staande voet geldig?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("Typed antwoord.")).toBeInTheDocument();
    const [, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const payload = JSON.parse(String(requestInit.body));
    expect(payload.question).toBe(
      "Wanneer is ontslag op staande voet geldig?",
    );
    expect(payload.max_iterations).toBe(2);
    expect(payload.conversation_history).toEqual([]);
    expect(payload.client_documents).toEqual([]);
  });

  it("fills the input from demo shortcuts without submitting automatically", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AssistantStreamingPage query="" domain={undefined} />);

    expect(screen.getByText("Demo example prompts")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Citations and lawyer review are required before relying on an answer.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Use demo prompt: Wat geldt bij loondoorbetaling tijdens ziekte?",
      }),
    );

    expect(screen.getByRole("textbox")).toHaveValue(
      "Wat geldt bij loondoorbetaling tijdens ziekte?",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    expect(screen.getByText("Safety/refusal example")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Use demo prompt: Kun je mijn volledige belastingaangifte doen?",
      }),
    );

    expect(screen.getByRole("textbox")).toHaveValue(
      "Kun je mijn volledige belastingaangifte doen?",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends attached text documents with the assistant request", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void init;
        if (String(input) === "/api/agent/extract-document") {
          return new Response(
            JSON.stringify({
              name: "huurcontract.txt",
              text:
                "Contractuele opzegtermijn: twee maanden.\nBetaling vindt plaats voor de eerste dag.\nInspectie gebeurt na afspraak.",
              truncated: false,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          createAssistantStream([
            { type: "token", content: "Contractantwoord." },
            {
              type: "done",
              status: "grounded",
              source_ids: [],
              tool_trace: [],
            },
          ]),
          { status: 200 },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AssistantStreamingPage query="" domain={undefined} />);

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(
      [
        "Contractuele opzegtermijn: twee maanden.\nBetaling vindt plaats voor de eerste dag.\nInspectie gebeurt na afspraak.",
      ],
      "huurcontract.txt",
      { type: "text/plain" },
    );

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect((await screen.findAllByText("huurcontract.txt")).length).toBeGreaterThan(1);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Wat betekent dit voor mijn contract?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("Contractantwoord.")).toBeInTheDocument();
    expect(screen.getByText("Research context")).toBeInTheDocument();
    expect(screen.getByText("Contract context")).toBeInTheDocument();
    expect(screen.queryByText("Legal source trail")).not.toBeInTheDocument();
    expect(screen.getAllByText("huurcontract.txt").length).toBeGreaterThan(1);
    expect(
      screen.getByText("Current-chat document · 3 extracted paragraphs"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Current-chat context only; not permanent storage."),
    ).toBeInTheDocument();
    expect(screen.getByText("First contract paragraph")).toBeInTheDocument();
    expect(
      screen.getByText(/Contractuele opzegtermijn: twee maanden/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Contract text is treated as user-provided facts, not legal authority.",
      ).length,
    ).toBeGreaterThan(0);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/agent/extract-document");
    const [, requestInit] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    const payload = JSON.parse(String(requestInit.body));
    expect(payload.client_documents).toEqual([
      {
        name: "huurcontract.txt",
        text:
          "Contractuele opzegtermijn: twee maanden.\nBetaling vindt plaats voor de eerste dag.\nInspectie gebeurt na afspraak.",
      },
    ]);
  });

  it("extracts PDF uploads before sending them to the assistant", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void init;
        if (String(input) === "/api/agent/extract-document") {
          return new Response(
            JSON.stringify({
              name: "arbeidscontract.pdf",
              text: "PDF contracttekst over proeftijd.",
              truncated: false,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          createAssistantStream([
            { type: "token", content: "PDF antwoord." },
            {
              type: "done",
              status: "grounded",
              source_ids: [],
              tool_trace: [],
            },
          ]),
          { status: 200 },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AssistantStreamingPage query="" domain={undefined} />);

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["%PDF-1.7 fake"], "arbeidscontract.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(await screen.findAllByText("arbeidscontract.pdf")).toHaveLength(2);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Wat zegt dit contract over de proeftijd?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("PDF antwoord.")).toBeInTheDocument();
    const extractionBody = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(extractionBody.get("file")).toBe(file);
    const payload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(payload.client_documents).toEqual([
      {
        name: "arbeidscontract.pdf",
        text: "PDF contracttekst over proeftijd.",
      },
    ]);
  });

  it("renders streamed tokens before the final done event", async () => {
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array> | null =
      null;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(stream, { status: 200 })),
    );

    render(
      <AssistantStreamingPage query="huur opzegging" domain="tenancy_law" />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    await act(async () => {
      streamController?.enqueue(
        encoder.encode('data: {"type":"token","content":"Eerste "}\n\n'),
      );
    });

    expect(await screen.findByText(/Eerste/)).toBeInTheDocument();
    expect(screen.queryByText(/Tweede/)).not.toBeInTheDocument();

    await act(async () => {
      streamController?.enqueue(
        encoder.encode('data: {"type":"token","content":"Tweede."}\n\n'),
      );
      streamController?.enqueue(
        encoder.encode(
          'data: {"type":"citation","label":"BW Boek 7","source_id":"BWBR0005290","citation":{"id":"doc-1","source_type":"legislation","source_id":"BWBR0005290","domain":"tenancy_law","title":"BW Boek 7","article":"7:271","section":null,"court":null,"decision_date":null,"source_url":null,"snippet":"Opzegging huur."}}\n\n',
        ),
      );
      streamController?.enqueue(
        encoder.encode(
          'data: {"type":"done","status":"grounded","source_ids":["BWBR0005290"],"tool_trace":[]}\n\n',
        ),
      );
      streamController?.close();
    });

    expect(await screen.findByText(/Eerste Tweede./)).toBeInTheDocument();
    expect(await screen.findByText("Grounded answer")).toBeInTheDocument();
    expect(screen.getByText("Needs lawyer review")).toBeInTheDocument();
    expect(screen.getByText("Source trail preserved")).toBeInTheDocument();
    expect(screen.getByText("Legal source trail")).toBeInTheDocument();
    expect(screen.getByText("Show source preview")).toBeInTheDocument();
    expect(await screen.findByText("BW Boek 7")).toBeInTheDocument();
  });

  it("keeps previous answers visible when a new question starts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          createAssistantStream([
            { type: "token", content: "Antwoord huur." },
            {
              type: "done",
              status: "grounded",
              source_ids: ["BWBR0005290"],
              tool_trace: [],
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          createAssistantStream([
            { type: "token", content: "Antwoord ontslag." },
            {
              type: "done",
              status: "grounded",
              source_ids: ["ECLI:NL:HR:1"],
              tool_trace: [],
            },
          ]),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      <AssistantStreamingPage query="huur opzegging" domain="tenancy_law" />,
    );

    expect(await screen.findByText("Antwoord huur.")).toBeInTheDocument();

    rerender(
      <AssistantStreamingPage
        query="ontslag op staande voet"
        domain="employment_law"
      />,
    );

    expect(await screen.findByText("Antwoord ontslag.")).toBeInTheDocument();
    expect(screen.getByText("Antwoord huur.")).toBeInTheDocument();
    expect(screen.getByText("huur opzegging")).toBeInTheDocument();
    expect(screen.getAllByText("ontslag op staande voet").length).toBeGreaterThan(
      0,
    );
    const [, secondRequestInit] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    const secondPayload = JSON.parse(String(secondRequestInit.body));
    expect(secondPayload.conversation_history).toEqual([
      { role: "user", content: "huur opzegging" },
      { role: "assistant", content: "Antwoord huur." },
    ]);
  });

  it("saves grounded answers to a matter with citation payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          createAssistantStream([
            { type: "token", content: "Antwoord huur." },
            {
              type: "citation",
              citation: {
                id: "doc-1",
                source_type: "legislation",
                source_id: "BWBR0005290",
                domain: "tenancy_law",
                title: "BW Boek 7",
                article: "7:271",
                section: null,
                court: null,
                decision_date: null,
                source_url: null,
                snippet: "Opzegging huur.",
              },
            },
            {
              type: "done",
              status: "grounded",
              source_ids: ["BWBR0005290"],
              tool_trace: [],
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ matter: { title: "Demo Matter" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AssistantStreamingPage query="huur opzegging" domain="tenancy_law" />,
    );

    expect(await screen.findByText("Antwoord huur.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save to Matter" }));

    expect(await screen.findByText("Saved to Demo Matter.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Saved to Matter" }),
    ).toBeDisabled();

    const saveCall = fetchMock.mock.calls[1];
    expect(saveCall[0]).toBe("/api/matters/research-notes");
    const payload = JSON.parse(String(saveCall[1]?.body));
    expect(payload.question).toBe("huur opzegging");
    expect(payload.status).toBe("grounded");
    expect(payload.citations[0].source_id).toBe("BWBR0005290");
    expect(payload.domains).toEqual(["tenancy_law"]);
  });

  it("does not show save success when matter persistence fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          createAssistantStream([
            { type: "token", content: "Antwoord huur." },
            {
              type: "citation",
              citation: {
                id: "doc-1",
                source_type: "legislation",
                source_id: "BWBR0005290",
                domain: "tenancy_law",
                title: "BW Boek 7",
                article: "7:271",
                section: null,
                court: null,
                decision_date: null,
                source_url: null,
                snippet: "Opzegging huur.",
              },
            },
            {
              type: "done",
              status: "grounded",
              source_ids: ["BWBR0005290"],
              tool_trace: [],
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Matter save failed." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AssistantStreamingPage query="huur opzegging" domain="tenancy_law" />,
    );

    expect(await screen.findByText("Antwoord huur.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save to Matter" }));

    expect(await screen.findByText("Matter save failed.")).toBeInTheDocument();
    expect(screen.queryByText("Saved to Demo Matter.")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save to Matter" }),
    ).not.toBeDisabled();
  });

  it("explains mixed multi-question refusals", async () => {
    mockAssistantStream([
      {
        type: "insufficient_sources",
        answer: "Ik kan deze vraag niet betrouwbaar beantwoorden.",
        question: "mixed",
        source_ids: [],
        citations: [],
        tool_trace: [],
      },
    ]);

    render(
      <AssistantStreamingPage
        query="Wat geldt bij opzegging van huur van woonruimte? Wanneer is ontslag op staande voet geldig? Wat geldt bij loondoorbetaling tijdens ziekte? Kun je mijn volledige belastingaangifte doen?"
        domain={undefined}
      />,
    );

    expect(
      await screen.findAllByText("Ask one legal question at a time"),
    ).toHaveLength(2);
    expect(
      screen.getByText(
        "This prompt contains multiple separate legal questions. Clarvo retrieves sources per legal issue. Ask one question at a time so the assistant can attach the right citations.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Wat geldt bij opzegging van huur van woonruimte?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Not enough supporting sources"),
    ).not.toBeInTheDocument();
  });

  it("explains out-of-scope refusals without citation UI", async () => {
    mockAssistantStream([
      {
        type: "insufficient_sources",
        answer: "Ik kan deze vraag niet betrouwbaar beantwoorden.",
        question: "tax",
        source_ids: [],
        citations: [],
        tool_trace: [],
      },
    ]);

    render(
      <AssistantStreamingPage
        query="Kun je mijn volledige belastingaangifte doen?"
        domain={undefined}
      />,
    );

    expect(await screen.findAllByText("Outside current coverage")).toHaveLength(
      2,
    );
    expect(
      screen.getByText(
        "Clarvo currently supports selected Dutch legal research workflows. This question is outside the current corpus or requires professional advice beyond the product scope.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cited sources")).not.toBeInTheDocument();
    expect(screen.queryByText("Legal source trail")).not.toBeInTheDocument();
    expect(screen.queryByText("Source trail preserved")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs lawyer review")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Not enough supporting sources"),
    ).not.toBeInTheDocument();
  });
});
