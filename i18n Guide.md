# i18n Guide

All i18n functionality is located in `src/i18n`

Sample translations `src/i18n/translations/en.json`:

```json
{
  "heading": "Hi,<0>User</0>",
  "title": "Hi, <br/> There"
}
```

## Available components:

- Trans.astro - for translations containing html tags within

  ```jsx
  /** use <Trans /> (self closing) for translations containing basic "strong", "br", "em", "i", "b" html tags **/

  <Trans translation={t.title} />;

  /**for complex translation with span tags or other tags with attributes use like this **/

  <Trans translation={t.heading}>
    Hi,<span style="color: red;">User</span>
  </Trans>;
  ```

- Link.astro - to automatically preped url with the current locale. if you pass href as `/about` and it will generate `/en/about`, `/de/about` etc depending on the locale.
- LanguagePicker.astro, MobileLocales.astro - It displays a language switcher.

## Utility functions

1. getLangFromUrl - Retrieves the language code from the URL path

   ```ts
   import { getLangFromUrl, useTranslations } from "@/i18n";
   import Layout from "@/layouts/Layout.astro";
   const lang = getLangFromUrl(Astro.url); // lang will be en,de,da,es etc
   ```

2. useTranslations - Loads translations

   ```ts
   const t = useTranslations(lang);
   // t will be the loaded translation like t:{"heading": "Hi,<0>User</0>","title": "Hi, <br/> There"}
   // you can destructure to only the key you want to use
   ```

3. useRoute - Generates a localized route based on the provided language locale and route name.

   ```ts
   const locale = getLangFromUrl(Astro.url);

   const r = useRoute(locale);
   r("visualizations"); // returns da: visualiseringer ,es: visualizaciones etc
   ```

4. useRoutes - Retrieves the localized routes for the provided language locale.

## Adding a language

1.  Go to `src/i18n/config`
2.  Add the locale

    ```ts
    export const locales = {
      en: "English",
      de: "Deutsch",
      // more locales here
    };
    ```

3.  Add the file to load for the locale

    ```ts
    export const translations = {
      en: () =>
        import("./translations/en.json").then((module) => module.default),
      de: () =>
        import("./translations/de.json").then((module) => module.default),
    } as const;
    ```

4.  Done

## Adding translations

1. Go to `src/i18n/translations`
2. Add the relevant translations to all json files `en.json` etc.
   It is important to add to ALL files bacause you will get an error when trying to access a key that is non existent.Also keys present in all files get autocompleted when using the `t`, so it will be a hint if you dont get autocomplete on a translation that something is wrong.
3. Route translations are created in `src/i18n/translations/routes.json`

## Using translations

1. in `pages/[locale]`

   ```ts
   // you can get the matched locale from params
   const { locale } = Astro.params;

   // get the translations for the locale
   const {
     pages: { home: t }, // extracting home translations
   } = await useTranslation(locale as Locale);
   ```

2. in component files outside `src/pages`

   ```ts
   import { getLangFromUrl, useTranslation } from "@/i18n";

   // extract the locale from the url
   const lang = getLangFromUrl(Astro.url);

   const {
     pages: {
       about: { our_values: t },
     },
   } = await useTranslation(lang);
   ```
