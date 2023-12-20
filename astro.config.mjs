import { defineConfig } from "astro/config";
import { i18nRoutes } from "./src/i18n/integration";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [i18nRoutes(), tailwind()]
});