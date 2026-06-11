# Themes

This folder is the source of truth for every visual "skin" the site offers.
Each theme lives in its own subfolder, the build pipeline (`npm run
build:themes`) copies the contents to `public/themes/<id>/`, and at runtime
the SPA loads the user's chosen theme as a `<link rel="stylesheet">` tag.

The current built-in set is `classic`, `minimal`, `solarpunk`, `futurist`,
`applish`, `winamp` — feel free to add more.

## Folder layout

```
themes/
└── my-theme/
    ├── theme.yaml       (required)
    ├── theme.css        (required)
    ├── fonts/           (optional)
    │   └── *.woff2
    └── icons/           (optional, for future icon overrides)
        └── *.svg
```

## `theme.yaml` schema

```yaml
id: my-theme                          # must match the folder name (kebab-case)
name_key: theme.skin.my-theme.name    # i18n key, NOT the literal name
description_key: theme.skin.my-theme.description
preview_color: "#3b82f6"              # any CSS colour, used for the menu swatch
order: 10                             # lower = higher in the picker (optional)
fonts:                                # optional; loaded by the theme's CSS
  - family: "My Display Font"
    src: fonts/MyDisplayFont.woff2
    weight: 400
    style: normal
```

### Why use i18n keys instead of literal names?

The site supports English, French, and Arabic (and will add more). A theme's
human-facing name and description belong in the locale strings files at
`src/spa/i18n/strings/<locale>.json`, not in the YAML. Add the matching
entries there:

```jsonc
// src/spa/i18n/strings/en.json
"theme.skin.my-theme.name": "My Theme",
"theme.skin.my-theme.description": "Why it is so pretty."
```

The theme picker renders names via `t(name_key)` — adding a new theme
without populating every locale will fall back to showing the key string,
which is your sign to translate.

## `theme.css` contract

The site's design tokens are CSS custom properties on `:root`. Every theme
overrides those tokens. Your theme.css **must** define both the implicit
"dark default" block and the explicit `[data-theme="light"]` block so the
user's light/system/dark picker always reads as designed.

```css
:root {
  /* dark variant */
  --bg: #...;
  --bg-elev: #...;
  --bg-elev-2: #...;
  --fg: #...;
  --muted: #...;
  --line: #...;
  --line-strong: #...;
  --accent: #...;
  --accent-fg: #...;

  /* optional */
  --font-display: "Your Display Font", serif;
  --font-sans: "Your Body Font", system-ui, sans-serif;
  --radius-sm: 0.5rem; /* …etc */
}

:root[data-theme="light"] {
  /* light variant — REQUIRED. Same property list, light values. */
}
```

Browse `src/spa/styles/app.css` to see every available token and the
component-level classes (`.scard`, `.player`, `.lmenu` …) you can re-style
beyond the tokens.

### Accessibility rules every theme must follow

- **Contrast.** Body text needs WCAG AA contrast (≥ 4.5:1) against `--bg`
  and against `--bg-elev`; large headlines need ≥ 3:1.
- **Large text safety.** Use `rem` and `em`, never pixel-fixed widths or
  font-sizes. The base font-size is whatever the user has set in their
  browser; a theme that hard-codes 12px breaks for anyone who needs 200%.
- **RTL safety.** Use logical CSS properties: `padding-inline`,
  `margin-inline-start`, `border-inline-end`, `inset-inline-end`, etc. The
  Arabic locale flips the entire layout via `<html dir="rtl">`; everything
  must follow without extra effort.
- **`:focus-visible`** must remain visible against your `--bg`. Don't strip
  outlines.
- **Reduced motion.** Avoid keyframe animations on background gradients.
  If you must animate, gate the rule on
  `@media (prefers-reduced-motion: no-preference)`.

### Localized strings inside theme CSS

You shouldn't need any. Strings live in `src/spa/i18n/strings/`. If a
specific theme wants to show a tagline or label, add a key to the locale
files and have the SPA render it; theme CSS is text-free.

## Fonts

Drop SIL-OFL or public-domain woff2 files into `fonts/` and reference them
from your CSS via a relative path:

```css
@font-face {
  font-family: "My Font";
  src: url("fonts/MyFont.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

The build script copies the entire `fonts/` folder to
`public/themes/<id>/fonts/` so the relative URLs resolve at runtime. Don't
reference remote fonts — the catalog ships entirely self-contained.

Curated examples of where to find PD / OFL fonts:

- [Google Fonts](https://fonts.google.com) — most are SIL OFL.
- [Font Squirrel](https://www.fontsquirrel.com/fonts/list/find_fonts).
- [Open Foundry](https://open-foundry.com).

## Local development loop

```bash
# from catalog/
npm run build:themes        # processes themes/ → public/themes/
npm run build:data          # one-time, builds the SQLite
npm run dev                 # Astro dev server with HMR
```

In the dev server, open the skin picker (the swatch ▾ in the top bar) and
flip between your theme and `classic`. Both apply instantly — editing
`themes/my-theme/theme.css` triggers a re-copy on the next
`build:themes` run; reload to pick up the new bytes.

## WinAmp .wsz import

The `winamp` theme is hand-authored; if you want a particular classic
.wsz skin's exact palette, run:

```bash
npm run winamp:import -- path/to/Skin.wsz my-winamp
```

That unpacks the skin, sniffs the four anchor colours (titlebar, body,
text, accent) from `main.bmp`/`titlebar.bmp`, and writes a new
`themes/my-winamp/` folder that re-uses the WinAmp template with those
colours substituted in. See `scripts/winamp-import.ts` for details.

## Publishing a new theme

1. Pick a kebab-case `id`.
2. Create `themes/<id>/theme.yaml`, `theme.css`, optional `fonts/`.
3. Add `theme.skin.<id>.name` and `theme.skin.<id>.description` to every
   file under `src/spa/i18n/strings/`.
4. Run `npm run build:themes`; the SPA's skin picker now lists your theme.
5. Open a PR — that's it.
