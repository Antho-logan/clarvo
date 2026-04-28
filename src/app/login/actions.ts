"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";

function callbackFrom(formData: FormData) {
  const value = String(formData.get("callbackUrl") || "/dashboard");
  return value.startsWith("/") ? value : "/dashboard";
}

export async function credentialsSignIn(formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      redirectTo: callbackFrom(formData),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=credentials");
    }
    throw error;
  }
}

export async function magicLinkSignIn(formData: FormData) {
  if (!process.env.RESEND_API_KEY) {
    redirect("/login?error=email_disabled");
  }

  try {
    await signIn("resend", {
      email: String(formData.get("email") || ""),
      redirectTo: callbackFrom(formData),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=email");
    }
    throw error;
  }
}
