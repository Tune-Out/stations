/**
 * Shared writer for src/spa/i18n/<locale>.yaml bundles.
 *
 * Why YAML: contributors browse and edit translations in GitHub's web
 * editor, and YAML lets us put a contribution header on every file plus
 * a one-line description above every key explaining what the string is
 * for in the UI. The runtime still loads these as plain objects via a
 * tiny Vite plugin (see astro.config.mjs).
 *
 * The writer renders:
 *
 *   • A header comment block customised for the target locale, with the
 *     native name, contribution flow, and PR-docs link.
 *   • A `strings:` map in the canonical key order taken from `en.yaml`,
 *     each entry preceded by a description (and the English source string
 *     when the target locale is not English).
 *   • A `tags:` map in CANONICAL_TAGS order with the same comment shape.
 *
 * Used by:
 *   - scripts/build-tag-i18n.ts        (regenerates only the `tags:` block
 *                                       while preserving translated strings)
 *   - scripts/convert-i18n-to-yaml.ts  (one-shot JSON → YAML migration)
 */
import { Document, type Pair, type Scalar, type YAMLMap } from 'yaml';

import { LOCALES, SUPPORTED_LOCALES, type Locale } from '../../src/locales.js';
import { CANONICAL_TAGS } from './canonical.js';

export interface LocaleBundle {
  strings: Record<string, string>;
  tags: Record<string, string>;
}

const PR_DOCS = 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests';

function header(locale: Locale): string {
  const m = LOCALES[locale];
  const rtl = m.dir === 'rtl' ? ' (RTL)' : '';
  // Each line gets `# ` prepended by the YAML serializer; we just leave one
  // leading space so the rendered prefix is `# `.
  return [
    ' ─────────────────────────────────────────────────────────────────────────',
    ` Tune Out — UI translations for: ${m.nativeName} — ${m.name} (${locale})${rtl}`,
    ' ─────────────────────────────────────────────────────────────────────────',
    '',
    ' This file has two sections:',
    '',
    '   • `strings:` — UI text used throughout the catalog. Translate the',
    '     values; leave the keys untouched. Tokens like `{name}` and `{n}`',
    '     are placeholders the runtime substitutes — preserve them verbatim,',
    '     and keep any inline HTML (`<code>`, `<a>` …) intact.',
    '',
    '   • `tags:` — labels for the genre/tag chips. The values here are',
    '     regenerated from `scripts/build-tag-i18n.ts` whenever someone runs',
    '     `npm run build:tag-i18n`, so permanent edits should go in that',
    '     script\'s `TAG_TRANSLATIONS` table. The keys are slugs and never',
    '     change.',
    '',
    ' To contribute a translation:',
    '   1. Click the pencil (✎) in GitHub\'s top-right to edit this file.',
    '   2. Change values, not keys, and keep `{placeholders}` intact.',
    '   3. Commit; GitHub will offer to open a pull request automatically.',
    '',
    ` GitHub's pull-request walkthrough: ${PR_DOCS}`,
    ' ─────────────────────────────────────────────────────────────────────────',
  ].join('\n');
}

const STRING_KEY_DESCRIPTIONS: Record<string, string> = {
  'app.title':                     'Page <title> + OpenGraph title used by the static shells.',
  'app.tagline':                   'OpenGraph description / fallback tagline.',
  'nav.home':                      'Sidebar nav — Home link label.',
  'nav.browse':                    'Sidebar nav — Browse link label.',
  'nav.search':                    'Sidebar nav — Search link label.',
  'nav.downloads':                 'Sidebar nav — Downloads link label.',
  'nav.settings':                  'Sidebar nav — Settings link label (between Downloads and About).',
  'nav.about':                     'Sidebar nav — About link label.',
  'section.recents':               'Sidebar section heading: recently played stations.',
  'section.favorites':             'Sidebar section heading: favorited stations.',
  'section.top_stations':          'Home section heading: most popular stations (legacy — replaced by worldwide / in_language).',
  'section.top_stations_worldwide': 'Home view: heading for the global Top Stations rail.',
  'section.top_stations_in_language': 'Home view: heading for the per-locale Top Stations rail. `{language}` is the locale\'s native name.',
  'section.popular_countries':     'Home/Browse heading: popular-countries grid.',
  'section.popular_tags':          'Home/Browse heading: popular-tags chip row.',
  'section.popular_languages':     'Home/Browse heading: popular-languages chip row.',
  'section.results':               'Search-results section heading.',
  'section.no_results':            'Empty-state heading when no results match.',
  'section.continue_listening':    'Home heading: pick-up-where-you-left-off rail.',
  'home.hero.title':               'Home hero headline.',
  'home.hero.lede':                'Home hero subtitle (under the headline).',
  'search.placeholder':            'Search input placeholder — compact top-bar input.',
  'search.placeholder.global':     'Search input placeholder — full Search view input.',
  'search.filter.country':         'Search filter label: country.',
  'search.filter.codec':           'Search filter label: codec (mp3 / aac / ogg …).',
  'search.filter.language':        'Search filter label: spoken language.',
  'search.filter.nature':          'Search filter label: editorial nature (public / community …).',
  'search.filter.online_only':     'Search filter label: only show stations the last health check says are up.',
  'search.clear':                  'Search filters: "Clear filters" button label.',
  'search.sort.label':             'Search sort dropdown label.',
  'search.sort.relevance':         'Search sort option — relevance (FTS5 rank).',
  'search.sort.popular':           'Search sort option — most clicks.',
  'search.sort.trending':          'Search sort option — recent vote velocity.',
  'search.sort.name':              'Search sort option — alphabetical.',
  'search.sort.bitrate':           'Search sort option — bitrate descending.',
  'search.sort.fresh':             'Search sort option — last-changed timestamp.',
  'search.sort.shuffle':           'Search sort option — randomised.',
  'search.empty':                  'Search view empty state (no query yet).',
  'search.syntax_hint':            'One-liner under the search box explaining supported syntax.',
  'search.count':                  'Result count, plural. Uses `{n}` (e.g. "{n} stations").',
  'search.count_one':              'Result count, singular form.',
  'station.play':                  'Station detail: Play button label.',
  'station.pause':                 'Station detail: Pause button label.',
  'station.favorite':              'Station detail: Add-to-favorites button label.',
  'station.unfavorite':            'Station detail: Remove-from-favorites button label.',
  'station.visit_homepage':        'Station detail: link to the station\'s own homepage.',
  'station.edit_on_github':        'Station detail: opens the YAML in GitHub\'s web editor.',
  'station.update_template':       'Station detail: link to the PR template for update requests.',
  'station.online':                'Station detail: status badge — last health check OK.',
  'station.offline':               'Station detail: status badge — last health check failed.',
  'station.stream_url':            'Station detail: label for the raw audio stream URL row.',
  'station.tags':                  'Station detail: heading for the tag-chip row.',
  'station.codec':                 'Station detail: codec metadata label.',
  'station.bitrate':               'Station detail: bitrate metadata label.',
  'station.bitrate_kbps':          'Station detail: bitrate unit suffix (kbps).',
  'station.country':               'Station detail: country metadata label.',
  'station.language':              'Station detail: language metadata label.',
  'station.votes':                 'Station detail: upstream vote count label.',
  'station.location':              'Station detail: city/region row label.',
  'station.background':            'Station detail: editorial background / history heading.',
  'station.nature':                'Station detail: nature (public / community / commercial …) label.',
  'station.operator':              'Station detail: operator / parent-org row label.',
  'station.affiliations':          'Station detail: network/affiliation chips row label.',
  'station.audience':              'Station detail: target audience row label.',
  'station.format':                'Station detail: programming format row label.',
  'station.notes':                 'Station detail: editorial notes row label.',
  'station.sources':               'Station detail: citation/source list heading.',
  'station.show_url':              'Station detail: toggle to reveal the raw stream URL.',
  'station.open_in_map':           'Station detail: open the station\'s lat/lon in a map app.',
  'browse.title':                  'Browse view: page title.',
  'browse.countries':              'Browse view: countries facet section heading.',
  'browse.tags':                   'Browse view: tags facet section heading.',
  'browse.languages':              'Browse view: languages facet section heading.',
  'player.now_playing':            'Sticky player bar: "Now playing" preamble.',
  'player.no_station':             'Sticky player bar: empty state (no station selected).',
  'player.connecting':             'Sticky player bar: status while a stream is loading.',
  'player.error':                  'Sticky player bar: stream error state.',
  'player.previous':               'Sticky player bar: previous-track button label.',
  'player.next':                   'Sticky player bar: next-track button label.',
  'player.volume':                 'Sticky player bar: volume slider aria-label.',
  'player.open_station':           'Sticky player bar: open the current station\'s detail page.',
  'player.minimize':               'Sticky player bar: collapse on mobile.',
  'player.expand':                 'Sticky player bar: expand from the minimised peek.',
  'downloads.title':               'Downloads view: page title.',
  'downloads.subtitle':            'Downloads view: page subtitle.',
  'downloads.size':                'Downloads view: column label for artifact size.',
  'downloads.sha256':              'Downloads view: column label for SHA-256 hash.',
  'downloads.sqlite.title':        'Downloads card title — full SQLite database.',
  'downloads.sqlite.subtitle':     'Downloads card subtitle — SQLite.',
  'downloads.sqlite.desc':         'Downloads card description — SQLite.',
  'downloads.zip.title':           'Downloads card title — YAML tarball.',
  'downloads.zip.subtitle':        'Downloads card subtitle — YAML tarball.',
  'downloads.zip.desc':            'Downloads card description — YAML tarball.',
  'downloads.jsongz.title':        'Downloads card title — compact JSON dump.',
  'downloads.jsongz.subtitle':     'Downloads card subtitle — compact JSON dump.',
  'downloads.jsongz.desc':         'Downloads card description — compact JSON dump.',
  'downloads.available_after_build': 'Placeholder when an artifact has not been built yet.',
  'downloads.released_separately': 'Footnote: artifacts attached to GitHub Releases, not Pages.',
  'about.title':                   'About view: page title (also reused as kicker).',
  'about.lede':                    'About view: lead paragraph.',
  'about.data.title':              'About section heading — where the data comes from.',
  'about.data.body':               'About body — where the data comes from. Supports markdown links `[label](https://…)` and backtick code spans; other HTML is escaped.',
  'about.license.title':           'About section heading — license.',
  'about.license.body':            'About body — license.',
  'about.privacy.title':           'About section heading — privacy.',
  'about.privacy.body':            'About body — privacy.',
  'about.contributing.title':      'About section heading — contributing.',
  'about.contributing.body':       'About body — contributing.',
  'about.improve_translation.title': 'About section heading — invite to improve this locale.',
  'about.improve_translation.body': 'About paragraph explaining where translations live.',
  'about.improve_translation.edit': 'Label inside the GitHub-edit CTA button on About (file path is appended in code).',
  'about.improve_translation.pr_docs': 'Anchor label for the GitHub PR-walkthrough docs link.',
  'about.add_language.title':       'About view: sub-heading for the "Adding a new language" blurb.',
  'about.add_language.body':        'About view: paragraph explaining the copy-and-rename flow for a brand-new locale. Wrap inline code (filenames, YAML keys, placeholders) in `backticks` — the renderer escapes all other HTML.',
  'settings.kicker':                'Settings page: kicker label above the title.',
  'settings.title':                 'Settings page: H1 title; also used as the topbar settings-cog aria-label.',
  'settings.lede':                  'Settings page: lead paragraph.',
  'settings.appearance.title':      'Settings page: heading for the appearance card (theme + skin).',
  'settings.appearance.body':       'Settings page: body for the appearance card.',
  'settings.recents.title':         'Settings page: heading for the recently-played card.',
  'settings.recents.body':          'Settings page: body for the recently-played card.',
  'settings.recents.max_label':     'Settings page: label for the number input that caps the recents list.',
  'settings.recents.count':         'Settings page: live count of stored recents. Uses `{n}` for the number.',
  'settings.recents.clear':         'Settings page: clear-recents button label.',
  'settings.recents.clear_confirm': 'Settings page: confirm() prompt before wiping the recents list.',
  'settings.export.title':          'Settings page: heading for the export card.',
  'settings.export.body':           'Settings page: body for the export card.',
  'settings.export.recents':        'Settings page: button label for the recents → .pls export.',
  'settings.export.favorites':      'Settings page: button label for the favorites → .pls export.',
  'install.button.label':          'Topbar mobile-only button: tooltip + aria-label for the Add-to-Home-Screen affordance.',
  'install.title':                 'Install modal: heading.',
  'install.body':                  'Install modal: explanatory body (no placeholders).',
  'install.ios.step1':             'Install modal — iOS step 1. `{shareIcon}` is replaced with an inline share-icon SVG.',
  'install.ios.step2':             'Install modal — iOS step 2 (HTML allowed; uses <strong> for the menu item name).',
  'install.ios.step3':             'Install modal — iOS step 3 (HTML allowed).',
  'install.android.step1':         'Install modal — Android-non-Chromium step 1. `{shareIcon}` becomes the browser menu icon.',
  'install.android.step2':         'Install modal — Android-non-Chromium step 2 (HTML allowed).',
  'install.android.step3':         'Install modal — Android-non-Chromium step 3 (HTML allowed).',
  'install.close':                 'Install modal: Close / Done button label (also the close-icon aria-label).',
  'loading.title':                 'Loading screen heading shown during first SQLite download.',
  'loading.subtitle':              'Loading screen subtitle / one-time-download note.',
  'loading.cached':                'Loading screen text on the warm path (DB from OPFS cache).',
  'error.title':                   'Generic error heading when a view fails to render.',
  'error.retry':                   'Generic Retry button label on error states.',
  'error.force_reload':            'Error panel button: wipe the cached database + redownload the latest from /data/stations.sqlite. Recovery path for schema-mismatch errors that plain reload can\'t fix.',
  'error.force_reload_help':       'Error panel: short explanation under the Refresh-database button so the user knows when to use it.',
  'footer.non_commercial':         'Footer: non-commercial / no-tracking statement.',
  'footer.public_domain':          'Footer: public-domain license notice.',
  'footer.source':                 'Footer: anchor label pointing at the source repo.',
  'footer.upstream':               'Footer: credit to radio-browser.info upstream.',
  'stats.station_count':           'Catalog stats line — total station count shown above the rails on Home and Browse. `{count}` is the locale-formatted integer.',
  'stats.last_updated':            'Catalog stats line — "Updated {date}" shown in the page footer next to the public-domain link. `{date}` is locale-formatted.',
  'theme.label':                   'Theme picker: aria/tooltip label for the picker button.',
  'theme.light':                   'Theme picker option — light.',
  'theme.system':                  'Theme picker option — follow OS preference.',
  'theme.dark':                    'Theme picker option — dark.',
  'theme.skin.label':              'Theme picker: heading for the visual-skin sub-section.',
  'theme.skin.title':              'Theme picker: alternate heading for the skin chooser.',
  'theme.skin.classic.name':       'Skin "Classic" — display name.',
  'theme.skin.classic.description':'Skin "Classic" — short description shown beneath the name.',
  'theme.skin.minimal.name':       'Skin "Minimal" — display name.',
  'theme.skin.minimal.description':'Skin "Minimal" — short description.',
  'theme.skin.solarpunk.name':     'Skin "Solarpunk" — display name.',
  'theme.skin.solarpunk.description':'Skin "Solarpunk" — short description.',
  'theme.skin.futurist.name':      'Skin "Futurist" — display name.',
  'theme.skin.futurist.description':'Skin "Futurist" — short description.',
  'theme.skin.applish.name':       'Skin "Applish" — display name.',
  'theme.skin.applish.description':'Skin "Applish" — short description.',
  'theme.skin.winamp.name':        'Skin "Winamp" — display name.',
  'theme.skin.winamp.description': 'Skin "Winamp" — short description.',
  'locale.label':                  'Aria/tooltip label for the locale picker button.',
  'locale.other_languages':        '"Other languages…" menu entry — routes to the About page.',
  'faq.station_text.title':        'Heading: per-station localized text.',
  'faq.station_text.body':         'Body paragraph for per-station localization. Wrap inline code (e.g. `localized:`) in backticks — the renderer escapes other HTML.',
  'faq.contact.title':             'Heading: how to get in touch.',
  'faq.contact.body':              'Body paragraph; the `{repo}` placeholder is replaced with the repo URL.',
};

function describeStringKey(k: string): string {
  return STRING_KEY_DESCRIPTIONS[k] ?? `UI string: ${k}`;
}

function commentLines(lines: string[]): string {
  return lines.map((l) => ' ' + l).join('\n');
}

export function buildLocaleYaml(
  locale: Locale,
  data: LocaleBundle,
  keyOrder: string[],
  english?: LocaleBundle,
): string {
  const doc = new Document();
  doc.commentBefore = header(locale);

  // Re-order strings to match the canonical English order; any keys that
  // somehow only exist in this locale are appended at the end so we never
  // silently drop translator work.
  const orderedStrings: Record<string, string> = {};
  for (const k of keyOrder) if (k in data.strings) orderedStrings[k] = data.strings[k];
  for (const k of Object.keys(data.strings)) {
    if (!(k in orderedStrings)) orderedStrings[k] = data.strings[k];
  }
  // Tags follow CANONICAL_TAGS order; same fallback rule for safety.
  const orderedTags: Record<string, string> = {};
  for (const t of CANONICAL_TAGS) if (t in data.tags) orderedTags[t] = data.tags[t];
  for (const t of Object.keys(data.tags)) {
    if (!(t in orderedTags)) orderedTags[t] = data.tags[t];
  }

  doc.contents = doc.createNode({ strings: orderedStrings, tags: orderedTags });
  const root = doc.contents as YAMLMap;
  const stringsNode = root.get('strings', true) as YAMLMap;
  const tagsNode    = root.get('tags',    true) as YAMLMap;

  stringsNode.commentBefore = commentLines([
    'UI strings. Translate the values; keep the keys and any {placeholders}.',
  ]);

  for (const pair of stringsNode.items as Pair[]) {
    const k = (pair.key as Scalar).value as string;
    const lines = [describeStringKey(k)];
    if (locale !== 'en' && english && k in english.strings) {
      lines.push(`English: ${english.strings[k]}`);
    }
    (pair.key as Scalar).commentBefore = commentLines(lines);
  }

  tagsNode.commentBefore = commentLines([
    'Genre / tag labels — shown on chips, filters, and station detail.',
    'These values are owned by scripts/build-tag-i18n.ts; edits here will',
    'be overwritten the next time `npm run build:tag-i18n` runs. Make',
    'permanent edits in TAG_TRANSLATIONS inside that script.',
  ]);

  for (const pair of tagsNode.items as Pair[]) {
    const slug = (pair.key as Scalar).value as string;
    const lines = [`Label for the "${slug}" tag.`];
    if (locale !== 'en' && english && slug in english.tags) {
      lines.push(`English: ${english.tags[slug]}`);
    }
    (pair.key as Scalar).commentBefore = commentLines(lines);
  }

  return doc.toString({ lineWidth: 0 });
}

export { SUPPORTED_LOCALES };
