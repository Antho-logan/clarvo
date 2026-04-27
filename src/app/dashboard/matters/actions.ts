"use server";

import { revalidatePath } from "next/cache";

import { archiveMatter, createMatter, updateMatter } from "@/lib/api/client";

function stringValue(formData: FormData, key: string) {
  const value = String(formData.get(key) || "").trim();
  return value || undefined;
}

export async function createMatterAction(formData: FormData) {
  await createMatter({
    title: stringValue(formData, "title"),
    client: stringValue(formData, "client"),
    status: stringValue(formData, "status") || "active",
    rechtsgebied: stringValue(formData, "rechtsgebied"),
    description: stringValue(formData, "description"),
    tags: {},
  });
  revalidatePath("/dashboard/matters");
}

export async function updateMatterAction(formData: FormData) {
  const matterId = stringValue(formData, "matter_id");
  if (!matterId) {
    return;
  }
  await updateMatter(matterId, {
    title: stringValue(formData, "title"),
    client: stringValue(formData, "client"),
    status: stringValue(formData, "status"),
    rechtsgebied: stringValue(formData, "rechtsgebied"),
    description: stringValue(formData, "description"),
  });
  revalidatePath("/dashboard/matters");
}

export async function archiveMatterAction(formData: FormData) {
  const matterId = stringValue(formData, "matter_id");
  if (!matterId) {
    return;
  }
  await archiveMatter(matterId);
  revalidatePath("/dashboard/matters");
}
