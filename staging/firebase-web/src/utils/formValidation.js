export function digitsOnly(value = "", max = Infinity) {
  return String(value).replace(/\D/g, "").slice(0, max);
}

export function normalizePakistanLocalPhone(value = "") {
  let digits = digitsOnly(value, 12);
  if (digits.startsWith("92")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function pakistanPhoneError(localDigits = "") {
  const value = digitsOnly(localDigits, 10);
  if (!value) return "Enter your mobile number.";
  if (value.length !== 10) return "Enter exactly 10 digits after +92.";
  if (!value.startsWith("3")) return "Pakistani mobile numbers must start with 3.";
  return "";
}

export function toPakistanE164(localDigits = "") {
  const value = digitsOnly(localDigits, 10);
  return `+92${value}`;
}

export function otpError(value = "") {
  const digits = digitsOnly(value, 6);
  if (digits.length !== 6) return "Enter the 6-digit verification code.";
  return "";
}

export function sanitizePersonName(value = "") {
  return String(value)
    .replace(/[^\p{L}\s.'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 80);
}

export function personNameError(value = "") {
  const trimmed = String(value).trim();
  if (!trimmed) return "Name is required.";
  if (trimmed.length < 2) return "Name is too short.";
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(trimmed)) return "Use letters only in the name.";
  return "";
}

export function sanitizeLettersText(value = "", max = 80) {
  return String(value)
    .replace(/[^\p{L}\s.'()/-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, max);
}

export function sanitizeFieldName(value = "") {
  return String(value)
    .replace(/[^\p{L}\p{N}\s.'()#&/-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 60);
}

export function positiveDecimal(value = "") {
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  const [whole = "", ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}
