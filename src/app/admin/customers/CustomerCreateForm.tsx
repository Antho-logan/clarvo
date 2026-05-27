"use client";

import { useActionState } from "react";
import { KeyRound, UserPlus } from "lucide-react";

import {
  createCustomerAction,
  initialCreateCustomerState,
} from "@/app/admin/customers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CustomerCreateForm() {
  const [state, formAction] = useActionState(
    createCustomerAction,
    initialCreateCustomerState,
  );

  return (
    <Card className="border-[#D8D2C8] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center font-serif text-xl text-[#1F1D1A]">
          <UserPlus className="mr-2 h-5 w-5 text-[#DD3300]" />
          Create customer
        </CardTitle>
        <p className="text-sm leading-6 text-[#63534B]">
          Create an invited dashboard user. Public signup stays disabled; share
          the temporary password manually with the customer.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#1F1D1A]"
              htmlFor="customer-email"
            >
              Email
            </label>
            <Input
              id="customer-email"
              name="email"
              type="email"
              maxLength={254}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-[#1F1D1A]"
              htmlFor="customer-name"
            >
              Name
            </label>
            <Input
              id="customer-name"
              name="name"
              type="text"
              maxLength={120}
              autoComplete="name"
            />
          </div>

          <Button className="w-full bg-[#1F1D1A] text-white hover:bg-[#1F1D1A]/90">
            Create customer
          </Button>
        </form>

        {state.status === "error" ? (
          <div className="mt-5 rounded-xl border border-[#DD3300]/20 bg-[#DD3300]/10 px-4 py-3 text-sm text-[#8A2408]">
            {state.message}
          </div>
        ) : null}

        {state.status === "success" ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
            <p className="font-semibold">{state.message}</p>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Login email
                </dt>
                <dd className="mt-1 font-mono text-sm">{state.email}</dd>
              </div>
              <div>
                <dt className="flex items-center text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                  Temporary password
                </dt>
                <dd className="mt-1 rounded-md border border-emerald-200 bg-white px-3 py-2 font-mono text-sm">
                  {state.temporaryPassword}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
