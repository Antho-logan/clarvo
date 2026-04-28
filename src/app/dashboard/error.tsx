"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto py-16">
      <div className="bg-white border border-[#D8D2C8] rounded-2xl p-10 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-[#DD3300]/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-[#DD3300]" />
        </div>
        <h1 className="text-3xl font-serif text-[#1F1D1A] mb-3">
          The dashboard could not load.
        </h1>
        <p className="text-[#63534B] max-w-2xl mx-auto mb-6 leading-7">
          {error.message || "An unexpected error occurred while loading live backend data."}
        </p>
        <Button
          onClick={reset}
          className="bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90"
        >
          Retry
        </Button>
      </div>
    </div>
  );
}
