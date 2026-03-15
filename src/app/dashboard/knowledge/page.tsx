import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Scale, FileText, ArrowRight, ExternalLink } from "lucide-react";

const DATABASES = [
    {
        title: "Rechtspraak.nl Integration",
        description: "Direct access to Dutch case law and official rulings.",
        type: "Case Law",
        icon: Scale
    },
    {
        title: "Wetten.nl Sync",
        description: "Real-time updates on Dutch legislation and parliamentary history.",
        type: "Legislation",
        icon: FileText
    },
    {
        title: "European Directives",
        description: "Cross-referenced EU regulations impacting Dutch law.",
        type: "EU Law",
        icon: ExternalLink
    }
];

export default function KnowledgePage() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2">Knowledge Base</h1>
                    <p className="text-[#63534B]">Curated legal intelligence, internal precedents, and connected databases.</p>
                </div>
            </div>

            {/* Global Search */}
            <div className="bg-white border border-[#D8D2C8] rounded-xl p-6 shadow-sm mb-8">
                <div className="relative max-w-3xl mx-auto">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-[#BDA989]" />
                    <input
                        type="text"
                        placeholder="Search across all interconnected sources, jurisprudence, and internal firm memos..."
                        className="w-full bg-[#F5F5F4] border-none text-base placeholder:text-[#7C746B] text-[#1F1D1A] pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#DD3300]/50"
                    />
                    <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#1F1D1A] text-white h-10 px-6">
                        Deep Search
                    </Button>
                </div>
            </div>

            <h2 className="text-xl font-serif text-[#1F1D1A] mb-4">Connected Sources</h2>
            <div className="grid md:grid-cols-3 gap-6">
                {DATABASES.map((db, idx) => (
                    <Card key={idx} className="bg-white border-[#D8D2C8] shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between mb-2">
                                <db.icon className="w-6 h-6 text-[#BDA989] group-hover:text-[#DD3300] transition-colors" />
                                <Badge variant="outline" className="text-[#63534B] border-[#D8D2C8] bg-[#F5F5F4]">{db.type}</Badge>
                            </div>
                            <h3 className="text-lg font-serif text-[#1F1D1A]">{db.title}</h3>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-[#63534B] leading-relaxed mb-4">{db.description}</p>
                            <div className="flex items-center text-sm font-medium text-[#DD3300]">
                                Query Source <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
