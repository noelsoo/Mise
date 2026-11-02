import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "magiclink", "recovery", "email", "email_change", "invite"];

// Token-hash flow (works across devices, unlike PKCE). Used if email templates link here.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      const dest = type === "recovery" ? "/auth/reset-password" : type === "signup" ? "/onboarding" : "/recipes";
      return NextResponse.redirect(new URL(dest, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
