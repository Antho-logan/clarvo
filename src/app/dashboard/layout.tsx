import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getSettings } from "@/lib/api/client";
import { normalizeDashboardLocale, type DashboardLocale } from "@/lib/dashboard-i18n";

export const runtime = "nodejs";

const DEV_BYPASS_USER = {
  name: "Demo User",
  email: "demo@clarvo.local",
  image: null as string | null,
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const devBypass = process.env.AUTH_DEV_BYPASS === "true";

  let resolvedUser: { name: string; email: string; image: string | null };
  let locale: DashboardLocale = "nl";

  if (devBypass) {
    resolvedUser = DEV_BYPASS_USER;
  } else {
    const session = await auth();
    const user = session?.user;
    if (!user?.email) {
      redirect("/login");
    }
    resolvedUser = {
      name: user.name || user.email,
      email: user.email,
      image: user.image ?? null,
    };
  }

  const settingsResult = await getSettings().catch(() => null);
  locale = normalizeDashboardLocale(settingsResult?.settings.language_preference);

  async function signOutAction() {
    "use server";
    if (process.env.AUTH_DEV_BYPASS === "true") {
      redirect("/");
    }
    await signOut({ redirectTo: "/" });
  }

  return (
    <DashboardShell
      user={resolvedUser}
      signOutAction={signOutAction}
      locale={locale}
    >
      {children}
    </DashboardShell>
  );
}
