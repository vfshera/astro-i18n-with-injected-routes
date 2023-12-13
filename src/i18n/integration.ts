import type { AstroIntegration } from "astro";
import { readdir } from "fs/promises";
import { locales, type Locale } from "./config";
import { fileURLToPath } from "url";
import { useRoutes, type RouteTranslation } from "./utils";

type Route = {
  filename: string;
  url: string;
};

function getRouteTranslations(routePath: string, lang: Locale) {
  if (!Object.keys(locales).includes(lang)) {
    return routePath;
  }

  if (routePath === "/") {
    return routePath;
  }

  const routes = useRoutes(lang as Locale);

  const translatedPath = routes?.[routePath as keyof RouteTranslation];

  if (translatedPath) {
    return translatedPath;
  }

  return routePath;
}

function generateRoutes(routes: Route[]) {
  const languages = ["", ...Object.keys(locales)];

  return routes.flatMap((r) => {
    return languages.map((lang) => {
      const tpath = getRouteTranslations(r.url, lang as Locale);
      let defaultLangPattern = tpath === "/" ? "/" : `/${tpath}`;

      let langPattern = tpath === "/" ? `/${lang}` : `/${lang}/${tpath}`;

      return {
        pattern: lang === "" ? defaultLangPattern : langPattern,
        entrypoint: `./src/routes/${r.filename}`,
      };
    });
  });
}

async function generateUrl(dirpath: string): Promise<Route[]> {
  /**
   * Read the directory and its subdirectories recursively, and filter Astro files.
   *
   */
  let files: string[] = [];

  try {
    files = await readdir(dirpath, { recursive: true });
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
    const isHidden = file.startsWith("_");

    /**
     * Check if the file has the ".astro" extension.
     *
     */
    const isAstro = file.endsWith(".astro");

    return !isHidden && isAstro;
  });

  return filteredFiles.map((file) => {
    let fileUrl = file.split(".")[0];

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

    return { filename: file, url: fileUrl };
  });
}

export function i18nRoutes(): AstroIntegration {
  return {
    name: "astro-i18n-routing",
    hooks: {
      "astro:config:setup": async ({ logger, injectRoute, config }) => {
        logger.info("Generating routes...");
        const routesDir = fileURLToPath(new URL("routes", config.srcDir));
        const routePaths = await generateUrl(routesDir);
        const routes = generateRoutes(routePaths);

        logger.info("Injecting routes");
        routes.forEach((route) => {
          logger.info("✅ " + route.pattern);
          injectRoute(route);
        });
      },
    },
  };
}
