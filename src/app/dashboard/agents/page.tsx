import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Scale, Briefcase, FileText, Search, Sparkles, Send, Paperclip } from "lucide-react";

const SUGGESTED_PROMPTS = [
    {
        domain: "Huurrecht",
        icon: FileText,
        prompt: "Analyze this commercial lease agreement and extract the termination clauses and penalty risks."
    },
    {
        domain: "Arbeidsrecht",
        icon: Briefcase,
        prompt: "Summarize the employer's concrete obligations in this arbeidsovereenkomst regarding sick leave."
    },
    {
        domain: "Bestuursrecht",
        icon: Scale,
        prompt: "Review this municipal decision and build a timeline of the procedural deadlines for an appeal."
    },
    {
        domain: "Ondernemingsrecht",
        icon: Search,
        prompt: "Review this supplier contract and highlight instances of uncapped liability for the vendor."
    }
];

export default function AssistantPage() {
    return (
        <div className="max-w-5xl mx-auto pb-12 h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2 flex items-center">
                        <Bot className="w-8 h-8 mr-3 text-[#BDA989]" /> Source-Backed Assistant
                    </h1>
                    <p className="text-[#63534B]">Query documents and curated legal databases with full citation traceability.</p>
                </div>
            </div>

            <Card className="flex-1 bg-white border-[#D8D2C8] shadow-sm flex flex-col overflow-hidden">
                {/* Chat History / Empty State Area */}
                <CardContent className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-[#EEEDE4] rounded-2xl flex items-center justify-center mb-6">
                        <Sparkles className="w-8 h-8 text-[#DD3300]" />
                    </div>
                    <h2 className="text-xl font-serif text-[#1F1D1A] mb-2">How can I assist your matter today?</h2>
                    <p className="text-[#63534B] max-w-md mx-auto mb-8">
                        Upload a document or select a specialized workflow prompt below to begin your analysis.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 w-full max-w-3xl text-left">
                        {SUGGESTED_PROMPTS.map((item, idx) => (
                            <button
                                key={idx}
                                className="p-4 rounded-xl border border-[#D8D2C8] bg-[#F5F5F4] hover:bg-white hover:border-[#DD3300]/30 hover:shadow-sm transition-all text-left flex flex-col h-full group"
                            >
                                <div className="flex items-center space-x-2 mb-2">
                                    <item.icon className="w-4 h-4 text-[#BDA989] group-hover:text-[#DD3300] transition-colors" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-[#63534B]">{item.domain}</span>
                                </div>
                                <p className="text-sm text-[#1F1D1A] leading-relaxed">"{item.prompt}"</p>
                            </button>
                        ))}
                    </div>
                </CardContent>

                {/* Input Area */}
                <div className="p-4 border-t border-[#D8D2C8] bg-[#F5F5F4] shrink-0">
                    <div className="max-w-4xl mx-auto relative flex items-end bg-white rounded-xl border border-[#D8D2C8] shadow-sm focus-within:border-[#DD3300] focus-within:ring-1 focus-within:ring-[#DD3300]/20 transition-all p-2">
                        <Button variant="ghost" size="icon" className="shrink-0 text-[#BDA989] hover:text-[#DD3300]">
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        <textarea
                            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none px-3 py-3 text-sm text-[#1F1D1A] placeholder:text-[#BDA989] focus:outline-none"
                            placeholder="Ask a question or request an analysis..."
                            rows={1}
                        />
                        <Button size="icon" className="shrink-0 bg-[#DD3300] text-white hover:bg-[#DD3300]/90 rounded-lg ml-2 h-[44px] w-[44px]">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="text-center mt-3 flex items-center justify-center space-x-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold text-[#BDA989] border-[#D8D2C8]">Context: Entire Vault</Badge>
                        <span className="text-xs text-[#7C746B]">Outputs are strictly grounded in uploaded sources and Dutch law.</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
