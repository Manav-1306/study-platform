export const ALLOWED_LOGIN_DOMAINS = [];
export const AI_CHAT_DOMAINS = ["thapar.edu"];

export function getEmailDomain(email) {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().split("@").at(1)?.toLowerCase() ?? "";
}

export function isAllowedLoginEmail(email) {
  if (ALLOWED_LOGIN_DOMAINS.length === 0) {
    return true;
  }

  return ALLOWED_LOGIN_DOMAINS.includes(getEmailDomain(email));
}

export function isApprovedChatEmail(email) {
  return AI_CHAT_DOMAINS.includes(getEmailDomain(email));
}
