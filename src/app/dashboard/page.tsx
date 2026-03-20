import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    AlertCircle,
    ArrowRight,
    Bot,
    Briefcase,
    Clock,
    FileText,
    Search,
    Sparkles,
    Globe
} from "lucide-react";

const RECENT_MATTERS = [
    { id: "M-2041", name: "Huurgeschil Centrum - Visser", client: "Visser Retail BV", status: "Review", jurisdiction: "NL", urgency: "High" },
    { id: "M-2042", name: "Ontslag op staande voet - Jansen", client: "TechCorp BV", status: "Drafting", jurisdiction: "NL", urgency: "Medium" },
    { id: "M-2045", name: "Bezwaar Omgevingsvergunning Alpha", client: "Projectontwikkeling X", status: "Research", jurisdiction: "NL", urgency: "Low" },
];

const AGENT_ACTIVITY = [
    { time: "10 mins ago", action: "Arbeidsovereenkomst risk summary generated", matter: "M-2042", agent: "Risk Analyst" },
    { time: "1 hour ago", action: "Huurcontract termination clauses extracted", matter: "M-2041", agent: "Extraction" },
    { time: "3 hours ago", action: "Jurisprudence matched for Bestuursrecht appeal", matter: "M-2045", agent: "Research" },
];

const SUGGESTED_ACTIONS = [
    { title: "Review flagged termination risk in Visser huurcontract", matter: "M-2041", type: "Risk" },
    { title: "Approve generated bezwaarschrift concept", matter: "M-2045", type: "Approval" },
    { title: "Extract employer obligations for Jansen case", matter: "M-2042", type: "Task" },
];

export default function DashboardHome() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Welcome Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight">
                        Good morning, Clara.
                    </h1>
                    <p className="text-[#63534B]">Here&apos;s what needs your attention today.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="text-[#1F1D1A] border-[#D8D2C8] bg-white hover:bg-[#F5F5F4]">
                        <Sparkles className="w-4 h-4 mr-2 text-[#DD3300]" /> Ask Veridicta
                    </Button>
                    <Button className="bg-[#DD3300] text-white hover:bg-[#DD3300]/90">
                        New Matter
                    </Button>
                </div>
            </div>

            {/* Practice Area Quick-Starts */}
            <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: "Arbeidsrecht", icon: Briefcase, color: "text-[#DD3300]", bg: "bg-[#DD3300]/10" },
                    { label: "Huurrecht", icon: FileText, color: "text-[#BDA989]", bg: "bg-[#BDA989]/10" },
                    { label: "Bestuursrecht", icon: AlertCircle, color: "text-[#63534B]", bg: "bg-[#EEEDE4]" },
                    { label: "Ondernemingsrecht", icon: Search, color: "text-[#BDA989]", bg: "bg-[#BDA989]/10" },
                    { label: "Vreemdelingenrecht", icon: Globe, color: "text-[#DD3300]", bg: "bg-[#DD3300]/10" },
                ].map((area, idx) => (
                    <Card key={idx} className="bg-white border-[#D8D2C8] shadow-sm hover:border-[#DD3300]/30 hover:shadow-md transition-all cursor-pointer group">
                        <CardHeader className="flex flex-row items-center space-y-0 pb-2 pt-4 px-4">
                            <div className={`w-8 h-8 rounded-lg ${area.bg} flex items-center justify-center mr-3 group-hover:scale-105 transition-transform`}>
                                <area.icon className={`w-4 h-4 ${area.color}`} />
                            </div>
                            <CardTitle className="text-sm font-medium text-[#1F1D1A] leading-tight">{area.label}</CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Column - Matters and Suggesions */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Suggested Actions */}
                    <Card className="bg-[#1F1D1A] border-none text-white shadow-md">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-serif flex items-center">
                                <Sparkles className="w-5 h-5 mr-2 text-[#DD3300]" /> Smart Next Steps
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {SUGGESTED_ACTIONS.map((action, idx) => (
                                    <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                                        <div className="flex items-start space-x-3">
                                            <div className="mt-0.5">
                                                {action.type === 'Risk' ? <AlertCircle className="w-4 h-4 text-[#DD3300]" /> :
                                                    <CheckCircle className="w-4 h-4 text-[#BDA989]" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[#F5F5F4]">{action.title}</p>
                                                <p className="text-xs text-[#BDA989] mt-1">Matter: {action.matter}</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-[#7C746B]" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Matters */}
                    <Card className="bg-white border-[#D8D2C8] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-serif text-[#1F1D1A]">Active Matters</CardTitle>
                            <Button variant="ghost" size="sm" className="text-[#DD3300]">View all</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-[#7C746B] uppercase border-b border-[#D8D2C8]/50">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Matter</th>
                                            <th className="px-4 py-3 font-medium">Client</th>
                                            <th className="px-4 py-3 font-medium">Status</th>
                                            <th className="px-4 py-3 font-medium">Jurisdiction</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D8D2C8]/30">
                                        {RECENT_MATTERS.map((matter, idx) => (
                                            <tr key={idx} className="hover:bg-[#F5F5F4] transition-colors cursor-pointer">
                                                <td className="px-4 py-3 font-medium text-[#1F1D1A]">{matter.name}</td>
                                                <td className="px-4 py-3 text-[#63534B]">{matter.client}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="bg-[#EEEDE4] text-[#63534B] border-[#D8D2C8] font-normal">
                                                        {matter.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="bg-white text-[#1F1D1A] border-[#D8D2C8] font-normal">
                                                        {matter.jurisdiction}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Sidebar - Agent Activity */}
                <div className="space-y-8">
                    <Card className="bg-white border-[#D8D2C8] shadow-sm">
                        <CardHeader className="pb-4 border-b border-[#D8D2C8]/30 mb-4">
                            <CardTitle className="text-lg font-serif text-[#1F1D1A] flex items-center">
                                <Bot className="w-5 h-5 mr-2 text-[#BDA989]" /> Recent Agent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {AGENT_ACTIVITY.map((activity, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="mt-1 relative">
                                            <div className="w-6 h-6 rounded-full bg-[#EEEDE4] border border-[#D8D2C8] flex items-center justify-center shrink-0">
                                                <Bot className="w-3 h-3 text-[#63534B]" />
                                            </div>
                                            {idx !== AGENT_ACTIVITY.length - 1 && (
                                                <div className="absolute top-6 bottom-[-24px] left-1/2 w-px bg-[#D8D2C8]/50 transform -translate-x-1/2" />
                                            )}
                                        </div>
                                        <div className="flex-1 pb-1">
                                            <p className="text-sm font-medium text-[#1F1D1A] leading-snug">{activity.action}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-xs text-[#7C746B] flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" /> {activity.time}
                                                </span>
                                                <span className="text-[#D8D2C8]">•</span>
                                                <span className="text-xs text-[#DD3300]">{activity.agent}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full mt-6 text-[#63534B] border-[#D8D2C8]">View Full Log</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function CheckCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
