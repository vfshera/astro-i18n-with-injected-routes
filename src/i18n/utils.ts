import {
  translations,
  type Locale,
  showDefaultLocale,
  defaultLocale,
} from "./config";
import { INTEGRATION_NAME } from "./constants";

import routes from "./translations/routes.json";

export type RouteTranslation = typeof routes;
export type RouteKey = keyof RouteTranslation[Locale];

/**
 * Retrieves the language code from the URL path ie. Astro.url
 */
export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split("/");
  if (lang in translations) return lang as Locale;
  return defaultLocale;
}

/**
 *  Retrieves the localized routes for the provided language locale.
 *
 */
export function useRoutes(lang: Locale = defaultLocale) {
  return routes[lang];
}

/**
 * Loads json translations
 * */
export const useTranslation = async (lang: Locale) => translations[lang]();

/**
 *  returns a path tranlation function
 */
export function useTranslatedPath(lang: Locale) {
  /**
   *  returns a path tranlation
   */
  return function (routeKey: RouteKey | "/", l: Locale = lang) {
    /**
     * if the routeKey is a wildcard or empty string
     */

    if ((routeKey as string) === "#" || (routeKey as string) === "") {
      return routeKey;
    }

    /**
     * if the routeKey is a root path
     */
    if (routeKey === "/") {
      return !showDefaultLocale && l === defaultLocale ? "/" : `/${l}`;
    }

    const translatedPath = routes[l][routeKey as RouteKey];

    if (!translatedPath) {
      console.log(
        `[${INTEGRATION_NAME}]: ❌ key '${routeKey}' not found in routes.json`
      );

      return routeKey;
    }

    return !showDefaultLocale && l === defaultLocale
      ? "/" + translatedPath
      : `/${l}/${translatedPath}`;
  };
}

function getKeyByValue(
  obj: Record<string, string>,
  value: string
): string | undefined {
  return Object.keys(obj).find((key) => obj[key] === value);
}

export function getRouteFromUrl(url: URL): string | undefined {
  const pathname = new URL(url).pathname;
  const segments = pathname?.split("/");

  if (segments[1] === "") {
    return "/";
  }

  if (!Object.keys(routes).includes(segments[1]) && segments.length < 3) {
    return segments[1];
  }

  if (segments.length < 3) {
    return "/";
  }

  let path: string;

  if (!Object.keys(routes).includes(segments[1]) && segments.length > 2) {
    const [, ...pathSegments] = segments;
    path = pathSegments.join("/");
  } else {
    const [, , ...pathSegments] = segments;
    path = pathSegments.join("/");
  }
  if (path === undefined) {
    return undefined;
  }

  const currentLang = getLangFromUrl(url);

  const reversedKey = getKeyByValue(routes[currentLang], path);

  if (reversedKey !== undefined) {
    return reversedKey;
  }

  return undefined;
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
      `WARNING(${INTEGRATION_NAME}): The default slot does not include any HTML tag to interpolate! Use the 't' directly.`
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
