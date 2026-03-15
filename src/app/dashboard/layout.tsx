"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Briefcase,
    Files,
    Bot,
    GitMerge,
    Scale,
    Settings,
    Bell,
    HelpCircle,
    Globe,
    Search
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Assistant", href: "/dashboard/agents", icon: Bot },
    { label: "Matters", href: "/dashboard/matters", icon: Briefcase },
    { label: "Workflows", href: "/dashboard/workflows", icon: GitMerge },
    { label: "Knowledge", href: "/dashboard/knowledge", icon: Scale },
    { label: "Vault", href: "/dashboard/documents", icon: Files },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex h-screen bg-[#F5F5F4] overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-[#EEEDE4] border-r border-[#D8D2C8] flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-[#D8D2C8]">
                    <Link href="/dashboard" className="font-serif text-xl font-bold tracking-tight text-[#1F1D1A]">
                        VERIDICTA
                    </Link>
                </div>

                <nav className="flex-1 py-4 overflow-y-auto">
                    <ul className="space-y-1 px-3">
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-[#DD3300]/10 text-[#DD3300]'
                                            : 'text-[#63534B] hover:bg-white/50 hover:text-[#1F1D1A]'
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#DD3300]' : 'text-[#BDA989]'}`} />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-4 border-t border-[#D8D2C8]">
                    <div className="flex items-center space-x-3 bg-white p-2 rounded-lg border border-[#D8D2C8]/50 shadow-sm">
                        <Avatar className="w-8 h-8 rounded-md">
                            <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150" />
                            <AvatarFallback className="rounded-md">CR</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-[#1F1D1A] truncate">Clara Rostova</p>
                            <p className="text-xs text-[#7C746B] truncate">Rostova & Partners</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-[#D8D2C8] flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
                    <div className="flex items-center flex-1 max-w-xl">
                        <div className="relative w-full">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#BDA989]" />
                            <input
                                type="text"
                                placeholder="Search matters, documents, research..."
                                className="w-full bg-[#F5F5F4] border-none text-sm placeholder:text-[#7C746B] text-[#1F1D1A] pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#DD3300]/50"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4 ml-6">
                        <Button variant="ghost" size="sm" className="hidden sm:flex text-[#63534B]">
                            <Globe className="w-4 h-4 mr-2" />
                            <span className="text-xs font-semibold">EN</span>
                        </Button>

                        <Button variant="ghost" size="icon" className="text-[#63534B]">
                            <HelpCircle className="w-5 h-5" />
                        </Button>

                        <Button variant="ghost" size="icon" className="text-[#63534B] relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-[#DD3300] rounded-full border border-white" />
                        </Button>

                        <Avatar className="w-8 h-8 md:hidden">
                            <AvatarFallback>CR</AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
