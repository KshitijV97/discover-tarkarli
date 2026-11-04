"use server";

import { signIn, signOut } from "@/auth";
import { safeCallbackUrl } from "@/lib/auth/roles";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeCallbackUrl(String(formData.get("callbackUrl") ?? "")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
