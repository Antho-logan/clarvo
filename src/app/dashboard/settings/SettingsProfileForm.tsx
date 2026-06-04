"use client";

import { useActionState } from "react";
import { Settings, UserCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import {
  type UpdateSettingsState,
  updateSettingsAction,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UserSettings } from "@/lib/types";

type SettingsProfileFormProps = {
  initialSettings: UserSettings | null;
  primaryDomainOptions: Array<{ label: string; value: string }>;
  showSavedMessage?: boolean;
};

const initialUpdateSettingsState: UpdateSettingsState = {
  status: "idle",
};

export function SettingsProfileForm({
  initialSettings,
  primaryDomainOptions,
  showSavedMessage = false,
}: SettingsProfileFormProps) {
  const [state, formAction] = useActionState(
    updateSettingsAction,
    initialUpdateSettingsState,
  );
  const settings =
    state.status === "success" ? state.settings : initialSettings;

  return (
    <form action={formAction} className="space-y-8">
      <Card className="border-[#D8D2C8] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
            <UserCircle className="mr-2 h-5 w-5 text-[#DD3300]" />
            Profile and workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#1F1D1A]"
              htmlFor="display_name"
            >
              Display name
            </label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={settings?.display_name || ""}
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#1F1D1A]"
              htmlFor="firm_name"
            >
              Workspace or firm
            </label>
            <Input
              id="firm_name"
              name="firm_name"
              defaultValue={settings?.firm_name || ""}
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#1F1D1A]"
              htmlFor="theme_preference"
            >
              Theme preference
            </label>
            <select
              id="theme_preference"
              name="theme_preference"
              defaultValue={settings?.theme_preference || "system"}
              className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#1F1D1A]"
              htmlFor="language_preference"
            >
              Dashboard language
            </label>
            <select
              id="language_preference"
              name="language_preference"
              defaultValue={settings?.language_preference || "nl"}
              className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
            >
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#1F1D1A]"
              htmlFor="primary_domain"
            >
              Primary practice area
            </label>
            <select
              id="primary_domain"
              name="primary_domain"
              defaultValue={settings?.primary_domain || ""}
              className="h-10 w-full rounded-md border border-[#D8D2C8] bg-[#F5F5F4] px-3 text-sm"
            >
              <option value="">No default practice area</option>
              {primaryDomainOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-3 md:col-span-2">
            <SaveSettingsButton />
            {state.status === "success" || showSavedMessage ? (
              <p
                role="status"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              >
                {state.status === "success"
                  ? state.message
                  : "Profile settings saved."}
              </p>
            ) : null}
            {state.status === "error" ? (
              <p
                role="alert"
                className="rounded-md border border-[#DD3300]/20 bg-[#FFF7F3] px-3 py-2 text-sm text-[#8A2408]"
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function SaveSettingsButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending}
      className="w-fit bg-[#DD3300] text-white hover:bg-[#DD3300]/90 disabled:opacity-70"
    >
      <Settings className="mr-2 h-4 w-4" />
      {pending ? "Saving profile settings..." : "Save profile settings"}
    </Button>
  );
}
