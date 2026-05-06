import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssistantStreamingPage } from "@/components/dashboard/assistant-streaming-page";

describe("assistant streaming page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
        "This prompt contains multiple separate legal questions. Veridicta retrieves sources per legal issue. Ask one question at a time so the assistant can attach the right citations.",
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
        "Veridicta currently supports selected Dutch legal research workflows. This question is outside the current corpus or requires professional advice beyond the product scope.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cited sources")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Not enough supporting sources"),
    ).not.toBeInTheDocument();
  });
});
