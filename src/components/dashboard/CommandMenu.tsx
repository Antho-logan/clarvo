"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Briefcase,
  Files,
  GitMerge,
  LayoutDashboard,
  Paintbrush,
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

type NavLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
};

const NAV: NavLink[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, keywords: ["overview", "start"] },
  { label: "Assistant", href: "/dashboard/agents", icon: Bot, keywords: ["ai", "chat", "ask"] },
  { label: "Matters", href: "/dashboard/matters", icon: Briefcase, keywords: ["cases", "clients"] },
  { label: "Workflows", href: "/dashboard/workflows", icon: GitMerge, keywords: ["flows", "automation"] },
  { label: "Knowledge", href: "/dashboard/knowledge", icon: Scale, keywords: ["search", "bwb", "ecli", "case law"] },
  { label: "Vault", href: "/dashboard/documents", icon: Files, keywords: ["documents", "files"] },
  { label: "UI Sandbox", href: "/dashboard/ui-sandbox", icon: Paintbrush, keywords: ["frontend", "design", "claude", "sandbox"] },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, keywords: ["profile", "account"] },
];

const DOMAIN_SHORTCUTS: NavLink[] = [
  {
    label: "Search Arbeidsrecht",
    href: "/dashboard/knowledge?domain=employment_law",
    icon: Scale,
    keywords: ["employment", "labour"],
  },
  {
    label: "Search Huurrecht",
    href: "/dashboard/knowledge?domain=tenancy_law",
    icon: Scale,
    keywords: ["rental", "tenancy"],
  },
  {
    label: "Search Bestuursrecht",
    href: "/dashboard/knowledge?domain=administrative_law",
    icon: Scale,
    keywords: ["administrative"],
  },
];

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

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
          Search or jump to…
        </span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[#D8D2C8] bg-white px-1.5 font-mono text-[10px] font-medium text-[#63534B]">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search matters, documents, research…"
        />
        <CommandList>
          <CommandEmpty>No results. Try a different term.</CommandEmpty>

          {trimmedQuery.length >= 2 ? (
            <>
              <CommandGroup heading="Ask Veridicta">
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
                    Ask the assistant:{" "}
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
                    Search knowledge base for{" "}
                    <span className="text-[#1F1D1A] font-medium">
                      &ldquo;{trimmedQuery}&rdquo;
                    </span>
                  </span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}

          <CommandGroup heading="Navigate">
            {NAV.map((item) => (
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

          <CommandGroup heading="Knowledge shortcuts">
            {DOMAIN_SHORTCUTS.map((item) => (
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

          <CommandGroup heading="Account">
            <CommandItem
              value="profile settings account"
              onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
            >
              <Settings className="text-[#63534B]" />
              <span>Profile & settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
