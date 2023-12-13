import { translations, type Locale, defaultLang } from "./config";

import routes from "./translations/routes.json";

/**
 * Retrieves the language code from the URL path ie. Astro.url
 */
export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split("/");
  if (lang in translations) return lang as Locale;
  return defaultLang;
}

/**
 *  Retrieves the route key from the provided path.
 */
export function getRouteKeyByPath(lang: Locale, path: string) {
  return Object.keys(routes[lang]).find((key) => {
    return routes[lang]?.[key as keyof RouteTranslation] === path;
  });
}
/**
 *  Retrieves the localized routes for the provided language locale.
 *
 */
export function useRoutes(lang: Locale = defaultLang) {
  return routes[lang];
}

/**
 * Generates a localized route based on the provided language locale and route name.
 *
 * @param {Locale} [lang=defaultLang] - The language locale for the route.
 * @param {boolean} [prefixed=false] - Determines whether the route should be prefixed with the language locale.
 * @returns {function} A higher-order function that takes a route name and returns a localized route.
 */
export function useRoute(lang: Locale = defaultLang, prefixed = false) {
  return function (routeName: keyof RouteTranslation) {
    const rpath = routes[lang][routeName];

    if ((routeName as string) === "/") {
      return prefixed ? `/${lang}/` : "";
    }

    if (!rpath) {
      console.log(`Route ${routeName} not found in routes.json`);

      return routeName;
    }

    if (prefixed) {
      return `/${lang}/${routes[lang][routeName]}`;
    }
    return "/" + routes[lang][routeName];
  };
}

export type RouteTranslation = Awaited<ReturnType<typeof useRoutes>>;

/**
 * Loads json translations
 * */
export const useTranslation = async (lang: Locale) => translations[lang]();

/**
 *  translate paths
 */
export function useTranslatedPath(lang: Locale) {
  return (path: string, l: Locale = lang) => `/${l}${path}`;
}

/**
 * Sanitizes HTML content in translations by keeping only allowed tags.
 * This function removes any HTML tags that are not in the specified list of allowed tags.
 *
 * @param input - The input string containing HTML content.
 * @returns A sanitized string with only allowed HTML tags.
 */
export function sanitizeTranslations(input: string): string {
  // List of allowed HTML tags
  const allowedTags = ["strong", "br", "em", "i", "b"];

  // Regular expression for matching HTML tags
  const htmlTagRegex = /<\/?([^\s>]+)(\s[^>]*)*(>|$)/g;

  return input.replace(htmlTagRegex, (match) => {
    // Extract the tag from the match
    const tag = match.replace(/<\/?([^\s>]+)(\s[^>]*)*(>|$)/, "$1");

    // Check if the matched tag is in the allowedTags array
    if (allowedTags.includes(tag)) {
      return match; // Keep the allowed tag
    } else {
      return ""; // Remove the disallowed tag
    }
  });
}

/**
 * Interpolates a localized string with HTML tags using a reference string.
 * @param localizedString - The string to be interpolated.
 * @param referenceString - The reference string containing HTML tags.
 * @returns The interpolated string with replaced HTML tags.
 */
export const interpolate = (
  localizedString: string,
  referenceString: string
): string => {
  // Regular expression to match HTML tags
  const tagsRegex = /<([\w\d]+)([^>]*)>/gi;

  // Extract HTML tags from the reference string
  const referenceStringMatches = referenceString.match(tagsRegex);

  // Check if reference string has HTML tags for interpolation
  if (!referenceStringMatches) {
    console.warn(
      "WARNING(i18n): The default slot does not include any HTML tag to interpolate! Use the `t` function directly."
    );
    return localizedString;
  }

  // Extracted information about reference tags
  const referenceTags: { name: string; attributes: string }[] = [];
  referenceStringMatches.forEach((tagNode) => {
    const [, name, attributes] = tagsRegex.exec(tagNode) || [];
    referenceTags.push({ name, attributes });

    // Reset regex state
    tagsRegex.lastIndex = 0;
  });

  // Perform tag replacement in the localized string
  let interpolatedString = localizedString;
  for (let index = 0; index < referenceTags.length; index++) {
    const referencedTag = referenceTags[index];

    // Replace opening and self-closing tags
    interpolatedString = interpolatedString.replace(
      new RegExp(`<${index}(\\/?)>`, "g"),
      (_, isSelfClosing) => {
        if (isSelfClosing) {
          // Handle self-closing tags
          return `<${referencedTag.name}${referencedTag.attributes} />`;
        } else {
          // Handle opening tags
          return `<${referencedTag.name}${referencedTag.attributes}>`;
        }
      }
    );

    // Replace closing tags
    interpolatedString = interpolatedString.replace(
      new RegExp(`</${index}>`, "g"),
      `</${referencedTag.name}>`
    );
  }

  return interpolatedString;
};
