import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssistantStreamingPage } from "@/components/dashboard/assistant-streaming-page";

describe("assistant streaming page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(await screen.findByText("Source grounded")).toBeInTheDocument();
    expect(await screen.findByText("BW Boek 7")).toBeInTheDocument();
  });
});
