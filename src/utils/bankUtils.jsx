const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const exactRegex = (value = "") => {
  const trimmed = String(value || "").trim();
  return trimmed ? `^${escapeRegex(trimmed)}$` : "";
};

export const highlightMatch = (value, term, exact = false) => {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  const search = String(term || "").trim();
  if (!search) return raw;

  const pattern = exact ? `^${escapeRegex(search)}$` : escapeRegex(search);
  const re = new RegExp(pattern, "gi");
  return raw.replace(re, (match) => `<span class="text-warning fw-bold">${match}</span>`);
};

export const formatBankStatus = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "ACTIVE") return "Activo";
  if (normalized === "INACTIVE") return "Inactivo";
  return status || "";
};

export const sanitizeUpperAlphaNum = (value = "") =>
  String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");

export const sanitizeNit = (value = "") =>
  String(value).toUpperCase().replace(/[^0-9-]/g, "");

export const sanitizeCountryCode = (value = "") =>
  String(value).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);

export const sanitizeSimpleText = (value = "", maxLen = 255) =>
  String(value)
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .slice(0, maxLen);

export const sanitizeSwift = (value = "") =>
  String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
