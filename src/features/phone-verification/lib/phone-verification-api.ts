import { apiJson } from "@/lib/api";

export type PhoneVerificationState = {
  /** The user must verify a WhatsApp number before using the dashboard. */
  required: boolean;
  verified: boolean;
  phone: string | null;
};

const json = { "Content-Type": "application/json" };

export function fetchPhoneVerification() {
  return apiJson<PhoneVerificationState>("/v1/auth/phone");
}

export function sendPhoneOtp(phone: string) {
  return apiJson<{ phone: string; expiresInSeconds: number }>("/v1/auth/phone/send-otp", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ phone }),
  });
}

export function verifyPhoneOtp(code: string) {
  return apiJson<{ phone: string }>("/v1/auth/phone/verify", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ code }),
  });
}
