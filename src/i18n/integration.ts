import type { AstroIntegration } from "astro";
import fs from "fs-extra";
import path from "node:path";
import {
  locales,
  type Locale,
  defaultLocale,
  showDefaultLocale,
  clearTempPages,
} from "./config";
import { fileURLToPath } from "node:url";
import { useRoutes, type RouteTranslation } from "./utils";
import {
  INTEGRATION_NAME,
  PAGES_DIR,
  ROUTES_DIR,
  TEMP_PAGES_DIR,
} from "./constants";

type Route = {
  filename: string;
  url: string;
  locale: string;
};

function getRouteTranslations(routePath: string, lang: Locale) {
  if (!Object.keys(locales).includes(lang)) {
    return routePath;
  }

  if (routePath === "/") {
    return routePath;
  }

  const routes = useRoutes(lang as Locale);

  const translatedPath = routes?.[routePath as keyof RouteTranslation[Locale]];

  if (translatedPath) {
    return translatedPath;
  }

  return routePath;
}

function generateRoutes(
  routes: Route[],
  /**
   * The directory where the entrypoints are located.
   */
  entryDir: string = ROUTES_DIR,
  /**
   * Whether the routes should be prefixed with the language.
   */
  prefixed: boolean = false
) {
  return routes.flatMap(({ locale: lang, ...r }) => {
    let currentPath = "";
    const [firstSegment, ...pathSegments] = r.url.split("/");

    const HAS_LOCALE = Object.keys(locales).includes(firstSegment);
    const HAS_SEGMENTS = pathSegments.length > 0;

    if (HAS_LOCALE) {
      currentPath = HAS_SEGMENTS ? pathSegments.join("/") : "/";
    }

    if (!HAS_SEGMENTS && firstSegment != "" && !HAS_LOCALE) {
      currentPath = firstSegment;
    }

    const tpath = getRouteTranslations(currentPath, lang as Locale);

    const defaultLangPattern = tpath === "/" ? "/" : `/${tpath}`;

    const langPattern = tpath === "/" ? `/${lang}` : `/${lang}/${tpath}`;

    const entryPrefix = lang === "" ? "" : `${lang}/`;

    return {
      pattern: lang === "" ? defaultLangPattern : langPattern,
      entrypoint: prefixed
        ? `./src/${entryDir}/${entryPrefix}${r.filename}`
        : `./src/${entryDir}/${r.filename}`,
    };
  });
}

function generateUrl(dirpath: string): Route[] {
  /**
   * Read the directory and its subdirectories recursively, and filter Astro files.
   *
   */
  let files: fs.Dirent[] = [];

  try {
    files = fs.readdirSync(dirpath, { recursive: true, withFileTypes: true });
  } catch (error) {
    console.error(`Failed to read directory at path: ${dirpath}`);
    console.error(error);
  }

  /**
   * Filter Astro files based on specific criteria.
   *
   */
  const filteredFiles = files.filter((file) => {
    /**
     * Check if the file starts with an underscore, indicating it is hidden.
     *
     */
    const isHidden = file.name.startsWith("_");

    /**
     * Check if the file has the ".astro" extension.
     *
     */
    const isAstro = file.name.endsWith(".astro");

    return !isHidden && isAstro;
  });

  return filteredFiles.map((file) => {
    const fullPath = path.join(file.path, file.name);

    const relativePath = path.relative(dirpath, fullPath);

    let fileUrl = relativePath.split(".")[0];

    /**
     * Handle special case: If the file URL is "index", set it to "/".
     */
    if (fileUrl === "index") {
      fileUrl = "/";
    }

    /**
     * Handle special case: If the file URL ends with "index", remove the "index" part.
     */
    if (fileUrl.endsWith("index")) {
      fileUrl = fileUrl.split("/").slice(0, -1).join("/");
    }

    let locale = "";
    const segments = fileUrl.split("/");

    if (Object.keys(locales).includes(segments[0])) {
      locale = segments[0];
    }

    return { filename: file.name, url: fileUrl, locale };
  });
}

export function i18nRoutes(): AstroIntegration {
  let routesDir: string = "";
  let pagesDir: string = "";
  let tempPagesDir: string = "";
  return {
    name: INTEGRATION_NAME,
    hooks: {
      "astro:config:setup": async ({
        logger,
        addWatchFile,
        injectRoute,
        config,
        command,
      }) => {
        routesDir = fileURLToPath(new URL(ROUTES_DIR, config.srcDir));
        pagesDir = fileURLToPath(new URL(PAGES_DIR, config.srcDir));
        tempPagesDir = fileURLToPath(new URL(TEMP_PAGES_DIR, config.srcDir));

        /**
         * Check if the routes directory exists.
         */
        if (!fs.existsSync(routesDir)) {
          throw new Error(
            `[${INTEGRATION_NAME}]: ❌ Routes directory not found at '${routesDir}'`
          );
        }

        fs.emptyDirSync(pagesDir);
        fs.emptyDirSync(tempPagesDir);

        // addWatchFile(routesFile);
        /**
         * Build mode onlyDocum
         */
        if (command === "build") {
          logger.info("Loading routes...");

          ["", ...Object.keys(locales)].forEach((lang) => {
            const localizedPagesDir = path.join(tempPagesDir, lang);

            if (lang !== "") {
              logger.info(`✅ Loaded ${locales[lang as Locale]} pages!`);
            }

            /**
             * If the language is the default language and we don't want to show the default language in the URL,
             */
            if (lang == defaultLocale && !showDefaultLocale) {
              /**
               * Copy the routes directory to the pages directory.
               */
              fs.copySync(routesDir, tempPagesDir);
            } else {
              /**
               * Copy the routes directory to the  localized pages directory.
               */
              fs.copySync(routesDir, localizedPagesDir);
            }
          });
          const routePaths = generateUrl(tempPagesDir);
          const routes = generateRoutes(
            routePaths,
            TEMP_PAGES_DIR,
            command === "build"
          );

          routes.forEach((route) => {
            logger.info("✅ " + route.pattern);
            injectRoute(route);
          });
        }

        /**
         * Dev mode only
         */
        if (command === "dev") {
          const translationsDir = new URL("./i18n/translations", config.srcDir);

          const translationFiles = fs.readdirSync(translationsDir);

          translationFiles.forEach((filename) => {
            const routesFile = new URL(
              "./i18n/translations/" + filename,
              config.srcDir
            );
            addWatchFile(routesFile);
          });

          logger.info("👀 Watching " + translationFiles.join(", "));

          logger.info("Generating routes...");

          const routePaths = generateUrl(routesDir);

          const dynamicRoutePaths = ["", ...Object.keys(locales)].flatMap(
            (lang) => {
              const prefix = lang === "" ? "/" : lang;

              return routePaths.map((rpath) => {
                const pathname =
                  lang === "" ? rpath.url : `${lang}/${rpath.url}`;

                return {
                  filename: rpath.filename,
                  url: rpath.url === "/" ? prefix : pathname,
                  locale: lang,
                };
              });
            }
          );
          const routes = generateRoutes(dynamicRoutePaths);

          logger.info("Injecting routes");
          routes.forEach((route) => {
            logger.info("✅ " + route.pattern);
            injectRoute(route);
          });
        }
      },
      "astro:build:done": ({ logger }) => {
        if (clearTempPages) {
          logger.info("Cleaning up...");
          fs.removeSync(tempPagesDir);
          logger.info("✅ Done!");
        }
      },
    },
  };
}
