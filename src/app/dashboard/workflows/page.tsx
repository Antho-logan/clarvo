import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitMerge, Briefcase, FileText, AlertCircle, Play, CheckCircle2 } from "lucide-react";

const WORKFLOWS = [
    {
        title: "Ontslag op Staande Voet (Immediate Dismissal)",
        domain: "Arbeidsrecht",
        tasks: 8,
        time: "Est. 15m",
        icon: Briefcase,
        description: "Generates the dismissal letter, computes UWV transition payments, and flags required evidence points.",
        color: "text-[#DD3300]",
        bg: "bg-[#DD3300]/10"
    },
    {
        title: "Huurverhoging Bedrijfsruimte Check",
        domain: "Huurrecht",
        tasks: 5,
        time: "Est. 5m",
        icon: FileText,
        description: "Validates CPI indexation clauses against ROZ-models and drafts the notification letter.",
        color: "text-[#BDA989]",
        bg: "bg-[#BDA989]/10"
    },
    {
        title: "Bezwaarschrift Omgevingsvergunning",
        domain: "Bestuursrecht",
        tasks: 12,
        time: "Est. 25m",
        icon: AlertCircle,
        description: "Builds a timeline of procedural deadlines and drafts the preliminary appeal based on local jurisprudence.",
        color: "text-[#63534B]",
        bg: "bg-[#EEEDE4]"
    }
];

export default function WorkflowsPage() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight mb-2">Workflows</h1>
                    <p className="text-[#63534B]">Execute structured, deterministic playbooks customized for Dutch legal domains.</p>
                </div>
                <Button className="bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90">
                    <GitMerge className="w-4 h-4 mr-2" /> Build Workflow
                </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {WORKFLOWS.map((wf, idx) => (
                    <Card key={idx} className="bg-white border-[#D8D2C8] shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                        <CardHeader className="pb-4">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${wf.bg}`}>
                                    <wf.icon className={`w-6 h-6 ${wf.color}`} />
                                </div>
                                <Badge variant="outline" className="text-[#63534B] border-[#D8D2C8] bg-[#EEEDE4]">{wf.domain}</Badge>
                            </div>
                            <h3 className="text-lg font-serif text-[#1F1D1A] mb-2 leading-snug">{wf.title}</h3>
                            <p className="text-sm text-[#63534B] leading-relaxed line-clamp-3">
                                {wf.description}
                            </p>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end">
                            <div className="flex items-center space-x-4 mb-6 text-xs text-[#7C746B]">
                                <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-[#BDA989]" /> {wf.tasks} Steps</span>
                                <span>•</span>
                                <span>{wf.time}</span>
                            </div>
                            <Button className="w-full bg-[#F5F5F4] text-[#1F1D1A] hover:bg-[#EEEDE4] border border-[#D8D2C8]">
                                <Play className="w-4 h-4 mr-2" /> Run Workflow
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
