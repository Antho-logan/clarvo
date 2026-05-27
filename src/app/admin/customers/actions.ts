"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createCustomer } from "@/lib/admin-customers";
import { isOwnerEmail } from "@/lib/admin-customers";

export type CreateCustomerState =
  | {
      status: "idle";
      message?: undefined;
      email?: undefined;
      temporaryPassword?: undefined;
    }
  | {
      status: "success";
      message: string;
      email: string;
      temporaryPassword: string;
    }
  | {
      status: "error";
      message: string;
      email?: undefined;
      temporaryPassword?: undefined;
    };

export const initialCreateCustomerState: CreateCustomerState = {
  status: "idle",
};

export async function createCustomerAction(
  _previousState: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect("/login?callbackUrl=/admin/customers");
  }
  if (!isOwnerEmail(email)) {
    redirect("/dashboard");
  }

  try {
    const customer = await createCustomer({
      email: String(formData.get("email") || ""),
      name: String(formData.get("name") || ""),
    });

    revalidatePath("/admin/customers");
    return {
      status: "success",
      message:
        "Customer created. Copy the temporary password now; it will not be shown again after this page changes.",
      email: customer.email,
      temporaryPassword: customer.temporaryPassword,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Customer could not be created.",
    };
  }
}
