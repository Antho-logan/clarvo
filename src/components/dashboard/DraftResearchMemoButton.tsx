"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

const MEMO_BLOCK_MESSAGE =
  "Memo generation is only available for grounded research notes with citations.";

type DraftResearchMemoButtonProps = {
  matterId: string;
  sourceNoteId: string;
  canDraft: boolean;
};

export function DraftResearchMemoButton({
  matterId,
  sourceNoteId,
  canDraft,
}: DraftResearchMemoButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canDraft) {
    return <p className="text-xs text-[#8A2408]">{MEMO_BLOCK_MESSAGE}</p>;
  }

  async function createMemo() {
    setMessage(null);
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/matters/research-memos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matter_id: matterId,
          source_note_id: sourceNoteId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string" ? body.detail : MEMO_BLOCK_MESSAGE,
        );
      }
      setMessage("Draft memo created.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : MEMO_BLOCK_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        className="border-[#D8D2C8] bg-white text-[#1F1D1A] hover:border-[#DD3300]/40 hover:bg-[#FFF7F3]"
        disabled={isSaving || isPending}
        onClick={createMemo}
      >
        <FileText className="mr-2 h-4 w-4" />
        {isSaving || isPending ? "Drafting memo..." : "Draft research memo"}
      </Button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-[#8A2408]">{error}</p> : null}
    </div>
  );
}
