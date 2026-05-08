import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const runtime = "nodejs";

const DEV_BYPASS_USER = {
  name: "Demo User",
  email: "demo@veridicta.local",
  image: null as string | null,
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const devBypass = process.env.AUTH_DEV_BYPASS === "true";

  let resolvedUser: { name: string; email: string; image: string | null };

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

  async function signOutAction() {
    "use server";
    if (process.env.AUTH_DEV_BYPASS === "true") {
      redirect("/");
    }
    await signOut({ redirectTo: "/" });
  }

  return (
    <DashboardShell user={resolvedUser} signOutAction={signOutAction}>
      {children}
    </DashboardShell>
  );
}
