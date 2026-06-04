"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Briefcase,
  Files,
  GitMerge,
  LayoutDashboard,
  Scale,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  dashboardCopy,
  normalizeDashboardLocale,
  type DashboardLocale,
} from "@/lib/dashboard-i18n";

type NavLink = {
  key?: keyof typeof dashboardCopy.en.nav;
  label?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
};

const NAV: NavLink[] = [
  { key: "home", href: "/dashboard", icon: LayoutDashboard, keywords: ["overview", "start"] },
  { key: "assistant", href: "/dashboard/agents", icon: Bot, keywords: ["ai", "chat", "ask"] },
  { key: "matters", href: "/dashboard/matters", icon: Briefcase, keywords: ["cases", "clients"] },
  { key: "workflows", href: "/dashboard/workflows", icon: GitMerge, keywords: ["flows", "automation"] },
  { key: "knowledge", href: "/dashboard/knowledge", icon: Scale, keywords: ["search", "bwb", "ecli", "case law"] },
  { key: "vault", href: "/dashboard/documents", icon: Files, keywords: ["documents", "files"] },
  { key: "settings", href: "/dashboard/settings", icon: Settings, keywords: ["profile", "account"] },
];

type CommandMenuProps = {
  locale?: DashboardLocale | string | null;
};

export function CommandMenu({ locale }: CommandMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const resolvedLocale =
    locale == null ? "en" : normalizeDashboardLocale(locale);
  const copy = dashboardCopy[resolvedLocale];
  const domainShortcuts: NavLink[] = [
    {
      label: copy.command.searchEmployment,
      href: "/dashboard/knowledge?domain=employment_law",
      icon: Scale,
      keywords: ["employment", "labour", "arbeidsrecht"],
    },
    {
      label: copy.command.searchTenancy,
      href: "/dashboard/knowledge?domain=tenancy_law",
      icon: Scale,
      keywords: ["rental", "tenancy", "huurrecht"],
    },
    {
      label: copy.command.searchAdministrative,
      href: "/dashboard/knowledge?domain=administrative_law",
      icon: Scale,
      keywords: ["administrative", "bestuursrecht"],
    },
  ];

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const runCommand = React.useCallback(
    (action: () => void) => {
      setOpen(false);
      setQuery("");
      action();
    },
    [],
  );

  const trimmedQuery = query.trim();

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full max-w-md justify-between bg-[#F5F5F4] border-[#D8D2C8] text-[#7C746B] hover:text-[#1F1D1A] hover:bg-white h-9 px-3 font-normal"
      >
        <span className="flex items-center gap-2 text-sm">
          <Search className="w-4 h-4 text-[#BDA989]" />
          {copy.shell.searchButton}
        </span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[#D8D2C8] bg-white px-1.5 font-mono text-[10px] font-medium text-[#63534B]">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={copy.command.inputPlaceholder}
        />
        <CommandList>
          <CommandEmpty>{copy.command.empty}</CommandEmpty>

          {trimmedQuery.length >= 2 ? (
            <>
              <CommandGroup heading={copy.command.askClarvo}>
                <CommandItem
                  value={`assistant ${trimmedQuery}`}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(
                        `/dashboard/agents?q=${encodeURIComponent(trimmedQuery)}`,
                      ),
                    )
                  }
                >
                  <Sparkles className="text-[#DD3300]" />
                  <span className="truncate">
                    {copy.command.askAssistant}:{" "}
                    <span className="text-[#1F1D1A] font-medium">
                      &ldquo;{trimmedQuery}&rdquo;
                    </span>
                  </span>
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value={`knowledge ${trimmedQuery}`}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(
                        `/dashboard/knowledge?q=${encodeURIComponent(trimmedQuery)}`,
                      ),
                    )
                  }
                >
                  <Scale className="text-[#63534B]" />
                  <span className="truncate">
                    {copy.command.searchKnowledge}{" "}
                    <span className="text-[#1F1D1A] font-medium">
                      &ldquo;{trimmedQuery}&rdquo;
                    </span>
                  </span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}

          <CommandGroup heading={copy.command.navigate}>
            {NAV.map((item) => {
              const label = item.key ? copy.nav[item.key] : item.label || "";
              return (
              <CommandItem
                key={item.href}
                value={`${label} ${(item.keywords ?? []).join(" ")}`}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="text-[#63534B]" />
                <span>{label}</span>
              </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={copy.command.knowledgeShortcuts}>
            {domainShortcuts.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${(item.keywords ?? []).join(" ")}`}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="text-[#63534B]" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={copy.command.account}>
            <CommandItem
              value="profile settings account"
              onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
            >
              <Settings className="text-[#63534B]" />
              <span>{copy.command.profileSettings}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
