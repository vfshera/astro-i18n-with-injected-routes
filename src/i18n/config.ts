/**
 * Supported languages object.
 */
export const locales = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
};

/**
 * Default language.
 */
export const defaultLocale: Locale = "en";

/**
 * Whether the default language should be shown in the URL.
 */
export const showDefaultLocale = false;

/**
 *  Whether the temporary pages should be cleared after build.
 */
export const clearTempPages = true;

/**
 * Translations object containing translations for different languages.
 */
export const translations = {
  en: () => import("./translations/en.json").then((module) => module.default),
  fr: () => import("./translations/fr.json").then((module) => module.default),
  es: () => import("./translations/es.json").then((module) => module.default),
  de: () => import("./translations/de.json").then((module) => module.default),
} as const;

/**
 * Types
 */
export type Locale = keyof typeof locales;
export type Translation = typeof translations;
