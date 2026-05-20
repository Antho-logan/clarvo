"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Briefcase,
  DatabaseZap,
  Files,
  GitMerge,
  Globe,
  LayoutDashboard,
  LogOut,
  Paintbrush,
  Scale,
  Settings,
  UserCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandMenu } from "@/components/dashboard/CommandMenu";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Assistant", href: "/dashboard/agents", icon: Bot },
  { label: "Matters", href: "/dashboard/matters", icon: Briefcase },
  { label: "Workflows", href: "/dashboard/workflows", icon: GitMerge },
  { label: "Knowledge", href: "/dashboard/knowledge", icon: Scale },
  { label: "Vault", href: "/dashboard/documents", icon: Files },
  { label: "UI Sandbox", href: "/dashboard/ui-sandbox", icon: Paintbrush },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

type DashboardUser = {
  name: string;
  email: string;
  image?: string | null;
};

type DashboardShellProps = {
  children: React.ReactNode;
  user: DashboardUser;
  signOutAction: () => Promise<void>;
};

function getInitials(user: DashboardUser) {
  const value = user.name || user.email;
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DashboardShell({ children, user, signOutAction }: DashboardShellProps) {
  const pathname = usePathname();
  const initials = getInitials(user) || "VD";

  return (
    <div className="flex h-screen bg-[#F5F5F4] overflow-hidden">
      <aside className="w-64 bg-[#EEEDE4] border-r border-[#D8D2C8] flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-[#D8D2C8]">
          <Link
            href="/dashboard"
            aria-label="Veridicta dashboard home"
            className="font-[Georgia,'Times_New_Roman',ui-serif,serif] text-[1.6rem] font-bold uppercase tracking-[0.02em] text-[#1F1D1A]"
          >
            VERIDICTA
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-0.5 px-3">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`relative flex items-center pl-4 pr-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/60 text-[#1F1D1A]"
                        : "text-[#63534B] hover:bg-white/40 hover:text-[#1F1D1A]"
                    }`}
                  >
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#DD3300]"
                      />
                    ) : null}
                    <item.icon className="w-[18px] h-[18px] mr-3 text-[#7C746B]" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-3 border-t border-[#D8D2C8]/70">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#7C746B]">
            Workspace
          </p>
          <p className="text-xs text-[#63534B] truncate mt-0.5">{user.email}</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white border-b border-[#D8D2C8] flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center flex-1 max-w-xl">
            <CommandMenu />
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 ml-6">
            <Button variant="ghost" size="sm" className="hidden sm:flex text-[#63534B] hover:text-[#1F1D1A]" asChild>
              <Link href="/dashboard/knowledge">
                <Globe className="w-4 h-4 mr-2" />
                <span className="text-xs font-semibold">NL corpus</span>
              </Link>
            </Button>

            <Button variant="ghost" size="sm" className="hidden lg:flex text-[#63534B] hover:text-[#1F1D1A]" asChild>
              <Link href="/dashboard/documents">
                <DatabaseZap className="w-4 h-4 mr-2" />
                <span className="text-xs font-semibold">Ingestion</span>
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Open profile menu">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 bg-white border-[#D8D2C8]">
                <DropdownMenuLabel>
                  <span className="block text-sm text-[#1F1D1A]">{user.name}</span>
                  <span className="block truncate text-xs font-normal text-[#7C746B]">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <UserCircle className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction} className="-mx-1">
                  <button
                    type="submit"
                    role="menuitem"
                    className="relative flex w-full select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
