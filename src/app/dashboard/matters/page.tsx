import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    FileText,
    MessageSquare,
    Share,
    Settings,
    Users,
    Search,
    Filter,
    CheckCircle2,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";

export default function MatterDetail() {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            {/* Matter Header */}
            <div className="mb-8">
                <Link href="/dashboard" className="inline-flex items-center text-sm text-[#7C746B] hover:text-[#1F1D1A] mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                </Link>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <h1 className="text-3xl font-serif text-[#1F1D1A] tracking-tight">Huurgeschil Centrum - Visser</h1>
                            <Badge className="bg-[#EEEDE4] text-[#63534B] hover:bg-[#EEEDE4] border border-[#D8D2C8]">Active</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-[#63534B]">
                            <span>Client: Visser Retail BV</span>
                            <span>•</span>
                            <span>Domain: Huurrecht (NL)</span>
                            <span>•</span>
                            <span>Matter ID: M-2041</span>
                        </div>
                    </div>

                    <div className="flex space-x-2">
                        <Button variant="outline" className="border-[#D8D2C8] text-[#1F1D1A]">
                            <Share className="w-4 h-4 mr-2" /> Share
                        </Button>
                        <Button className="bg-[#DD3300] text-white hover:bg-[#DD3300]/90">
                            <MessageSquare className="w-4 h-4 mr-2" /> Ask Agent
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-[#EEEDE4]/50 border-b border-[#D8D2C8] w-full justify-start rounded-none h-auto p-0 mb-6">
                    {["Overview", "Documents (12)", "Research", "Drafts", "Activity"].map((tab) => (
                        <TabsTrigger
                            key={tab}
                            value={tab.split(' ')[0].toLowerCase()}
                            className="px-6 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#DD3300] data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium text-[#63534B] data-[state=active]:text-[#1F1D1A]"
                        >
                            {tab}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Area */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* AI Summary Card */}
                            <div className="bg-white border border-[#D8D2C8] rounded-xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4 border-b border-[#D8D2C8]/50 pb-4">
                                    <h3 className="text-lg font-serif text-[#1F1D1A]">AI Matter Summary</h3>
                                    <Badge variant="outline" className="bg-[#DD3300]/10 text-[#DD3300] border-transparent">Updated 2h ago</Badge>
                                </div>
                                <div className="prose prose-sm max-w-none text-[#63534B] space-y-4">
                                    <p>
                                        This matter involves a commercial lease dispute (ROZ-model 2012) between Visser Retail BV and their landlord regarding specialized service costs and maintenance obligations of the HVAC system.
                                    </p>
                                    <p>
                                        <strong>Key Risks Identified:</strong> The scanned contract contains a deviation from standard ROZ provisions regarding casco maintenance, shifting unexpected liability to the tenant. Wait times for HVAC repairs may also breach 'huurgenot'.
                                    </p>
                                </div>
                                <div className="mt-6 flex space-x-3">
                                    <Button variant="outline" size="sm" className="text-[#1F1D1A]">View Full Analysis</Button>
                                    <Button variant="outline" size="sm" className="text-[#1F1D1A]">Generate Memo (EN/NL)</Button>
                                </div>
                            </div>

                            {/* Open Tasks */}
                            <div className="bg-white border border-[#D8D2C8] rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-serif text-[#1F1D1A] mb-4">Action Items</h3>
                                <div className="space-y-3">
                                    {[
                                        { task: "Review extracted risk matrix for HVAC clause", assignee: "Clara R.", due: "Today", urgent: true },
                                        { task: "Approve timeline of landlord notifications", assignee: "Agent (Extraction)", due: "Tomorrow", urgent: false },
                                        { task: "Draft formal notice of default (ingebrekestelling)", assignee: "Markus B.", due: "Oct 24", urgent: false },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-[#D8D2C8]/50 hover:bg-[#F5F5F4] transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-4 h-4 rounded-full border ${item.urgent ? 'border-[#DD3300]' : 'border-[#BDA989]'} flex items-center justify-center`}>
                                                    {!item.urgent && <CheckCircle2 className="w-3 h-3 text-[#BDA989] opacity-0 hover:opacity-100" />}
                                                    {item.urgent && <AlertTriangle className="w-3 h-3 text-[#DD3300]" />}
                                                </div>
                                                <span className={`text-sm ${item.urgent ? 'font-medium text-[#1F1D1A]' : 'text-[#63534B]'}`}>{item.task}</span>
                                            </div>
                                            <div className="flex items-center space-x-4 text-xs text-[#7C746B]">
                                                <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {item.assignee}</span>
                                                <span>{item.due}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-6">
                            <div className="bg-[#F5F5F4] border border-[#D8D2C8] rounded-xl p-5">
                                <h4 className="font-semibold text-[#1F1D1A] mb-4 text-sm uppercase tracking-wider">Matter Details</h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-[#7C746B] mb-1">Assigned Partner</p>
                                        <p className="text-sm font-medium text-[#1F1D1A]">Helena Rostova</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#7C746B] mb-1">Lead Associate</p>
                                        <p className="text-sm font-medium text-[#1F1D1A]">Clara Rostova</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#7C746B] mb-1">Related Sources</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <Badge variant="secondary" className="bg-[#EEEDE4] text-[#63534B]">BW 7:204</Badge>
                                            <Badge variant="secondary" className="bg-[#EEEDE4] text-[#63534B]">ROZ 2012</Badge>
                                            <Badge variant="secondary" className="bg-[#EEEDE4] text-[#63534B]">Gebrek Jurisprudence</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="documents">
                    <div className="bg-white border border-[#D8D2C8] rounded-xl p-6 shadow-sm min-h-[400px] flex items-center justify-center flex-col text-center">
                        <FileText className="w-12 h-12 text-[#BDA989] mb-4" />
                        <h3 className="text-lg font-serif text-[#1F1D1A] mb-2">Document Data Room</h3>
                        <p className="text-[#63534B] max-w-md mb-6">Select a document to begin AI review, comparison, or multilingual translation.</p>
                        <Button className="bg-[#1F1D1A] text-white">Upload Documents</Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
