import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { credentialsSignIn, magicLinkSignIn } from "@/app/login/actions";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function errorMessage(error: string | undefined) {
  if (error === "credentials") {
    return "Email or password was not accepted.";
  }
  if (error === "email_disabled") {
    return "Magic links are disabled until RESEND_API_KEY is configured.";
  }
  if (error === "email") {
    return "The magic link could not be sent.";
  }
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const callbackUrl = readSingleValue(params.callbackUrl) || "/dashboard";
  const error = errorMessage(readSingleValue(params.error));
  const devBypass = process.env.AUTH_DEV_BYPASS === "true";

  return (
    <main className="min-h-screen bg-[#EEEDE4] px-6 py-10 text-[#1F1D1A]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
          <section>
            <Link href="/" className="font-serif text-2xl font-bold tracking-tight">
              VERIDICTA
            </Link>
            <div className="mt-12 max-w-2xl">
              <div className="mb-6 inline-flex items-center rounded-full border border-[#D8D2C8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#63534B]">
                <ShieldCheck className="mr-2 h-4 w-4 text-[#DD3300]" />
                Protected workspace
              </div>
              <h1 className="font-serif text-5xl leading-tight tracking-tight md:text-6xl">
                Legal research stays behind the dashboard gate.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#63534B]">
                Sign in to search the BWB and ECLI corpus, run workflows, and inspect cited sources.
              </p>
            </div>
          </section>

          <Card className="border-[#D8D2C8] bg-white shadow-xl">
            <CardHeader>
              <CardTitle className="font-serif text-3xl">Sign in</CardTitle>
              <p className="text-sm text-[#63534B]">
                Use an existing account, or enable `AUTH_ALLOW_CREDENTIAL_SIGNUP=true` locally to create a test account on first login.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {error ? (
                <div className="rounded-xl border border-[#DD3300]/20 bg-[#DD3300]/10 px-4 py-3 text-sm text-[#8A2408]">
                  {error}
                </div>
              ) : null}

              {devBypass ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Developer bypass is enabled. Dashboard pages open with a local demo identity.
                </div>
              ) : null}

              <form action={credentialsSignIn} className="space-y-4">
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#1F1D1A]" htmlFor="email">
                    Email
                  </label>
                  <Input id="email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#1F1D1A]" htmlFor="password">
                    Password
                  </label>
                  <Input id="password" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button className="w-full bg-[#DD3300] text-white hover:bg-[#DD3300]/90">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Continue with password
                </Button>
              </form>

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[#7C746B]">
                <span className="h-px flex-1 bg-[#D8D2C8]" />
                or
                <span className="h-px flex-1 bg-[#D8D2C8]" />
              </div>

              <form action={magicLinkSignIn} className="space-y-4">
                <input type="hidden" name="callbackUrl" value={callbackUrl} />
                <label className="sr-only" htmlFor="magic-email">
                  Magic-link email
                </label>
                <Input id="magic-email" name="email" type="email" placeholder="name@firm.nl" />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-[#D8D2C8] text-[#1F1D1A]"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send magic link
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
