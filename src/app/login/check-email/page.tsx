import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen bg-[#EEEDE4] px-6 py-10 text-[#1F1D1A]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <Card className="w-full border-[#D8D2C8] bg-white shadow-xl">
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F4]">
              <MailCheck className="h-6 w-6 text-[#DD3300]" />
            </div>
            <CardTitle className="font-serif text-3xl">
              Check your email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-[#63534B]">
            <p>
              If that address has access to Veridicta, a sign-in link is on its
              way. The link opens the dashboard directly after verification.
            </p>
            <Link
              href="/login"
              className="inline-flex rounded-full border border-[#D8D2C8] bg-[#F5F5F4] px-4 py-2 text-sm font-medium text-[#1F1D1A] hover:border-[#DD3300]/30"
            >
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
