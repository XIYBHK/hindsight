import {
  defaultLocale,
  languageCookieName,
  parseAcceptLanguage,
  resolveSupportedLocale,
  resources,
  type SupportedLocale,
} from "./resources";

type CookieValue = string | { value?: string } | undefined;
type RequestLike = {
  headers?: Headers;
  cookies?: {
    get: (name: string) => CookieValue;
  };
};

type ApiErrorPayload = Record<string, unknown> & {
  errorKey: string;
};

const localizedErrorFields = ["error", "message", "detail", "details"] as const;

function parseCookieHeader(cookieHeader: string | null | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();
    if (!key) continue;

    try {
      cookies.set(key, decodeURIComponent(value));
    } catch {
      cookies.set(key, value);
    }
  }

  return cookies;
}

function getCookieLocale(request: RequestLike | undefined): string | undefined {
  const cookieValue = request?.cookies?.get(languageCookieName);
  if (typeof cookieValue === "string") return cookieValue;
  if (cookieValue?.value) return cookieValue.value;

  return parseCookieHeader(request?.headers?.get("cookie")).get(languageCookieName);
}

export function resolveApiErrorLocale(request?: RequestLike): SupportedLocale {
  return resolveSupportedLocale([
    getCookieLocale(request),
    ...parseAcceptLanguage(request?.headers?.get("accept-language")),
  ]);
}

function getTranslationValue(locale: SupportedLocale, key: string): string | undefined {
  let current: unknown = resources[locale].translation;

  for (const part of key.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

function getFallbackMessage(payload: ApiErrorPayload): string | undefined {
  for (const field of localizedErrorFields) {
    const value = payload[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

export function translateApiError(
  errorKey: string,
  fallbackMessage?: string,
  request?: RequestLike
): string {
  const locale = resolveApiErrorLocale(request);

  return (
    getTranslationValue(locale, errorKey) ??
    getTranslationValue(defaultLocale, errorKey) ??
    fallbackMessage ??
    errorKey
  );
}

export function localizeApiErrorPayload<TPayload extends ApiErrorPayload>(
  request: RequestLike | undefined,
  payload: TPayload
): TPayload {
  const message = translateApiError(payload.errorKey, getFallbackMessage(payload), request);
  const localizedPayload: ApiErrorPayload = { ...payload };
  let updatedExistingField = false;

  for (const field of localizedErrorFields) {
    if (field in localizedPayload && typeof localizedPayload[field] === "string") {
      localizedPayload[field] = message;
      updatedExistingField = true;
    }
  }

  if (!updatedExistingField) {
    localizedPayload.error = message;
  }

  return localizedPayload as TPayload;
}
