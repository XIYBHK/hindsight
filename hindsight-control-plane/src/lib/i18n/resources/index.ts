import en from "./en";
import yueHant from "./yue-Hant";
import zhCN from "./zh-CN";
import zhTW from "./zh-TW";

export const defaultLocale = "en";
export const languageCookieName = "hindsight_cp_locale";
export const languageStorageKey = "hindsight_cp_locale";

export const supportedLocales = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
  },
  {
    code: "zh-CN",
    label: "Chinese (Simplified)",
    nativeLabel: "简体中文",
  },
  {
    code: "zh-TW",
    label: "Chinese (Taiwan Traditional)",
    nativeLabel: "正體中文（臺灣）",
  },
  {
    code: "yue-Hant",
    label: "Cantonese (Traditional)",
    nativeLabel: "粵語（繁體）",
  },
] as const;

export type SupportedLocale = (typeof supportedLocales)[number]["code"];

export const resources = {
  en: {
    translation: en,
  },
  "zh-CN": {
    translation: zhCN,
  },
  "zh-TW": {
    translation: zhTW,
  },
  "yue-Hant": {
    translation: yueHant,
  },
} satisfies Record<SupportedLocale, { translation: typeof en }>;

const localeAliases = {
  zh: "zh-CN",
  "zh-Hans": "zh-CN",
  "zh-SG": "zh-CN",
  "zh-Hant": "zh-TW",
  "zh-Hant-TW": "zh-TW",
  yue: "yue-Hant",
  "yue-Hant-HK": "yue-Hant",
  "yue-HK": "yue-Hant",
  "zh-HK": "yue-Hant",
  "zh-Hant-HK": "yue-Hant",
} satisfies Record<string, SupportedLocale>;

function resolveLocaleAlias(value: string): SupportedLocale | undefined {
  return localeAliases[value as keyof typeof localeAliases];
}

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return supportedLocales.some((locale) => locale.code === value);
}

export function resolveSupportedLocale(values: Array<string | null | undefined>): SupportedLocale {
  for (const value of values) {
    if (!value) continue;
    if (isSupportedLocale(value)) return value;
    const alias = resolveLocaleAlias(value);
    if (alias) return alias;

    const baseLocale = value.split("-")[0];
    if (isSupportedLocale(baseLocale)) return baseLocale;
    const baseAlias = resolveLocaleAlias(baseLocale);
    if (baseAlias) return baseAlias;
  }

  return defaultLocale;
}

export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];

  return header
    .split(",")
    .map((entry) => {
      const [locale = "", ...params] = entry.trim().split(";");
      const quality = params.reduce((currentQuality, param) => {
        const [key, value] = param.trim().split("=");
        const nextQuality = Number.parseFloat(value ?? "");
        return key === "q" && Number.isFinite(nextQuality) ? nextQuality : currentQuality;
      }, 1);

      return {
        locale: locale.trim(),
        quality,
      };
    })
    .filter(({ locale, quality }) => locale.length > 0 && quality > 0)
    .sort((left, right) => right.quality - left.quality)
    .map(({ locale }) => locale);
}
