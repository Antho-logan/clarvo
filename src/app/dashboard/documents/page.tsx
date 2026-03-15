import { Files, Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VaultPage() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2">Vault</h1>
                    <p className="text-[#63534B]">Secure, jurisdiction-aware storage for active matters and firm knowledge.</p>
                </div>
                <Button className="bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90">
                    <Upload className="w-4 h-4 mr-2" /> Upload Sources
                </Button>
            </div>

            <div className="bg-white border border-[#D8D2C8] rounded-xl p-12 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-[#EEEDE4] rounded-full flex items-center justify-center mb-6">
                    <Files className="w-8 h-8 text-[#63534B]" />
                </div>
                <h3 className="text-xl font-serif text-[#1F1D1A] mb-2">Your Vault is Empty</h3>
                <p className="text-[#63534B] max-w-md mx-auto mb-6">
                    Upload contracts, evidential filings, or regulatory texts to begin agentic processing. All files are encrypted and processed within the EU.
                </p>
                <div className="flex items-center text-xs text-[#7C746B] justify-center mt-4">
                    <ShieldCheck className="w-4 h-4 mr-1 text-[#BDA989]" /> GDPR Compliant • ISO 27001
                </div>
            </div>
        </div>
    );
}
