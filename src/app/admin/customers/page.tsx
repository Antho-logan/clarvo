import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Users } from "lucide-react";

import { auth } from "@/auth";
import { CustomerCreateForm } from "@/app/admin/customers/CustomerCreateForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isOwnerEmail, listCustomers } from "@/lib/admin-customers";

export const runtime = "nodejs";

type CustomersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  await searchParams;
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect("/login?callbackUrl=/admin/customers");
  }
  if (!isOwnerEmail(email)) {
    redirect("/dashboard");
  }

  const customers = await listCustomers();

  return (
    <main className="min-h-screen bg-[#F5F5F4] px-5 py-8 text-[#1F1D1A] sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-5 inline-flex items-center text-sm text-[#63534B] transition-colors hover:text-[#1F1D1A]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BDA989]">
              Owner administration
            </p>
            <h1 className="font-serif text-4xl tracking-tight">Customers</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#63534B]">
              Create invited private-beta customers without enabling public
              signup or editing the auth database directly.
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit border-[#D8D2C8] bg-white px-3 py-1.5 text-[#63534B]"
          >
            Owner only
          </Badge>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="border-[#D8D2C8] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
                <Users className="mr-2 h-5 w-5 text-[#DD3300]" />
                Customer list
              </CardTitle>
              <p className="text-sm leading-6 text-[#63534B]">
                Users stored in the Clarvo auth database. Roles are derived
                from the configured owner email allowlist.
              </p>
            </CardHeader>
            <CardContent>
              {customers.length ? (
                <div className="overflow-hidden rounded-xl border border-[#D8D2C8]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#EEEDE4] text-xs uppercase tracking-[0.14em] text-[#63534B]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEDE4]">
                      {customers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="px-4 py-3 font-medium text-[#1F1D1A]">
                            {customer.email}
                          </td>
                          <td className="px-4 py-3 text-[#63534B]">
                            {customer.name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="border-[#D8D2C8] bg-[#F8F6F1] text-[#63534B]"
                            >
                              {customer.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-[#63534B]">
                            {formatDate(customer.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#D8D2C8] bg-[#F8F6F1] p-6 text-sm leading-6 text-[#63534B]">
                  No customers have been created yet.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-[#D8D2C8] bg-white shadow-sm">
              <CardContent className="flex gap-3 p-5 text-sm leading-6 text-[#63534B]">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#DD3300]" />
                <p>
                  Customer creation is server-side only. Public signup and dev
                  bypass remain controlled by production environment flags.
                </p>
              </CardContent>
            </Card>
            <CustomerCreateForm />
          </div>
        </div>
      </div>
    </main>
  );
}
