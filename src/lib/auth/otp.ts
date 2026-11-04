/**
 * Phone OTP sign-in (India) — EXTENSION POINT, not yet active.
 * See docs/auth.md → "Phone OTP" for the full plan.
 *
 * Shape of the future flow:
 *   1. POST /api/auth/otp/request { phone }  → normalizePhone → rate-limit →
 *      provider.send(phone) (provider generates/stores the code, or we store a
 *      hash in an otp_codes table) → 200 (never reveal whether the user exists)
 *   2. Auth.js Credentials provider "phone-otp" with { phone, code } →
 *      provider.verify(phone, code) → upsertIdentityUser({ provider: "phone",
 *      providerAccountId: phone, … }) → session.
 *
 * Providers to implement: MSG91 OTP API (DLT-compliant, India), Twilio Verify.
 */
export interface OtpProvider {
  name: string;
  isConfigured(): boolean;
  /** Send a one-time code to an E.164 phone number. */
  send(phone: string): Promise<{ requestId?: string }>;
  /** Check the code the user typed. */
  verify(phone: string, code: string, requestId?: string): Promise<boolean>;
}

export const OTP_POLICY = {
  codeLength: 6,
  ttlSeconds: 300,
  maxAttempts: 5,
  resendCooldownSeconds: 30,
  maxSendsPerPhonePerHour: 5,
} as const;
