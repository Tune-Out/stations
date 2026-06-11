/**
 * Canonical tag + language taxonomy. Shared between the YAML normalizer and
 * the build-data step so the SQLite columns and the on-disk YAML agree.
 *
 * Goal: collapse 11,000+ raw tags into ≤100 canonical slugs. The mapping is
 *   1) an exact-alias table (mostly noise drops and decade/spanish folds)
 *   2) a rule-based fallback (regex/contains)
 *   3) drop-if-no-match (returns null)
 *
 * For languages: fold the 635 raw "language" entries (with typos like
 *   "engilsh" and locale tags like "español argentina") down to ISO 639-1
 *   codes. If we can't match, keep the raw lowercase string so we don't
 *   lose information.
 */

// ─────────────────────────────────────────────────────────────────────────
// Canonical tag set (the closed vocabulary). Stay below 100.
// ─────────────────────────────────────────────────────────────────────────
export const CANONICAL_TAGS = [
  // ── Music: broad genres ──
  'pop', 'rock', 'jazz', 'classical', 'blues', 'folk', 'country',
  'electronic', 'dance', 'house', 'techno', 'trance', 'edm',
  'ambient', 'lounge', 'chillout', 'downtempo', 'drum-and-bass', 'dubstep',
  'hip-hop', 'rap', 'r-and-b', 'soul', 'funk', 'disco',
  'reggae', 'reggaeton', 'ska',
  'metal', 'hardcore', 'punk', 'indie', 'alternative',
  // ── Rock subgenres ──
  'classic-rock', 'soft-rock', 'hard-rock', 'prog-rock', 'pop-rock',
  // ── Religious music ──
  'gospel', 'christian-music', 'opera',
  // ── Misc music character ──
  'instrumental', 'soundtrack', 'smooth-jazz', 'synthpop', 'new-wave',
  'oldies', 'hits', 'top-40', 'classic-hits', 'adult-contemporary',
  'ballad', 'romantic', 'retro',
  'experimental', 'lofi',
  // ── Regional / cultural music ──
  'latin', 'salsa', 'cumbia', 'merengue',
  'tropical', 'regional-mexican',
  'bollywood', 'k-pop', 'j-pop', 'anime',
  'arabic-music', 'world',
  // ── Decades ──
  '50s', '60s', '70s', '80s', '90s', '2000s', '2010s',
  // ── Non-music programming ──
  'news', 'news-talk', 'talk', 'sports', 'sports-talk', 'comedy',
  'public-radio', 'community-radio', 'local-news',
  'religious', 'catholic', 'islamic',
  'culture', 'education', 'politics',
  'business', 'lifestyle',
  'kids', 'podcast',
  // ── Format hints (programming style) ──
  'party', 'sleep',
] as const;

export type CanonicalTag = (typeof CANONICAL_TAGS)[number];

const CANONICAL_SET = new Set<string>(CANONICAL_TAGS);
export function isCanonicalTag(slug: string): slug is CanonicalTag {
  return CANONICAL_SET.has(slug);
}

// ─────────────────────────────────────────────────────────────────────────
// Tag normalization helpers
// ─────────────────────────────────────────────────────────────────────────

function stripDiacritics(s: string): string {
  // NFD + strip combining marks. Skip when the string contains Cyrillic —
  // letters like Й (U+0419) decompose into И + combining breve, and we'd
  // lose the breve and end up with the wrong letter.
  if (/[Ѐ-ӿ]/.test(s)) return s;
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalize(raw: string): string {
  return stripDiacritics(raw)
    .toLowerCase()
    .replace(/[''`’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Tags we drop entirely (callsigns, geography, advertising, frequencies, etc.).
// Matched after normalization (lowercase, no diacritics).
const NOISE_PATTERNS: RegExp[] = [
  // Frequencies and callsigns
  /^\d+(\.\d+)?\s*(fm|am|khz|mhz|hz)?$/,
  /^[kwx][a-z]{2,4}(-?[a-z]{0,3})?$/,
  // Generic broadcasting noise
  /^(fm|am|hd|stereo|mono|aac|mp3|ogg|flac|wma|hls)$/,
  /^(radio|station|estacion|estación|emisora|broadcast|broadcasting)$/,
  /^(online|internet|web|streaming|stream|live|on air|on-air)$/,
  /^(online (?:only|radio|station))$/,
  /^(internet (?:radio|station))$/,
  /^(radio (?:online|station|en linea|en línea|live))$/,
  /^(general|misc|miscellaneous|various|other|otros|uncategorized)$/,
  /^(spanish contemporary hits|exa|exa fm|los40)$/,
  /^(ponte exa|la estacion exacta|la estación exacta|la estacion naranja|la estación naranja|la estación juvenil)$/,
  /^(w radio|grupo .*|grupo radiofonico zer|grupo zer|radcap|combo)$/,
  /^(ntr medios de comunicacion|grupo audiorama comunicaciones|mediaset|tv)$/,
  /^(mvs noticias|noticias y deportes|noticias y musica|noticias cortas)$/,
  /^(apm|acir|radiorama|moi merino)$/,
  /^(radio caprice.*|exclusively.*|sunshine live.*|club charts.*)$/,
  /^(non[- ]?stop( music)?|24[\/ ]?7|24h|24 hours|24\/7 music)$/,
  /^(playlist|mix|mixed|discography|crossover)$/,
  /^(local programming|local information|local|public|informativa)$/,
  /^(decades|nostalgia|flashback)$/,  // 'nostalgia'/'retro' folded by exact alias
  /^(juvenil|youth)$/,
];

// Hard-coded exact-aliases for the top long-tail raw tags. Each maps a raw
// (already normalized) slug to a canonical slug or null (to drop).
const EXACT_ALIASES: Record<string, CanonicalTag | null> = {
  // Decades
  "60's": '60s', "70's": '70s', "80's": '80s', "90's": '90s', "00's": '2000s',
  '60s': '60s', '70s': '70s', '80s': '80s', '90s': '90s',
  '1950s': '50s', '1960s': '60s', '1970s': '70s', '1980s': '80s', '1990s': '90s',
  '2000s': '2000s', '2010s': '2010s', '2020s': '2010s',  // group 2020s with 2010s for now
  '60er': '60s', '70er': '70s', '80er': '80s', '90er': '90s',
  'oldies 50\'s/60\'s': 'oldies',

  // Spanish music genre → English canonical
  'musica': 'pop',                  // generic — only when standalone; cover via rules too
  'musica pop': 'pop',
  'pop music': 'pop',
  'pop songs': 'pop',
  'musica en espanol': 'pop',
  'musica latina': 'latin',
  'musica latinoamericana': 'latin',
  'musica mexicana': 'regional-mexican',
  'musica regional': 'regional-mexican',
  'musica regional mexicana': 'regional-mexican',
  'musica popular mexicana': 'regional-mexican',
  'musica tradicional mexicana': 'regional-mexican',
  'mexican music': 'regional-mexican',
  'regional mexican': 'regional-mexican',
  'regional mexicana': 'regional-mexican',
  'regional music': 'regional-mexican',
  'regional radio': 'regional-mexican',
  'regional': 'regional-mexican',
  'banda': 'regional-mexican',
  'banda norteña': 'regional-mexican',
  'banda nortena': 'regional-mexican',
  'norteño': 'regional-mexican',
  'norteno': 'regional-mexican',
  'norteña': 'regional-mexican',
  'grupera': 'regional-mexican',
  'mariachi': 'regional-mexican',
  'ranchera': 'regional-mexican',
  'rancheras': 'regional-mexican',
  'corridos': 'regional-mexican',
  'romantica': 'romantic',
  'romanticas': 'romantic',
  'musica romantica': 'romantic',
  'balada': 'ballad',
  'baladas': 'ballad',
  'balada romantica': 'ballad',
  'balada en espanol': 'ballad',
  'amor solo musica romantica': 'romantic',
  'solo musica romantica': 'romantic',
  'romance': 'romantic',
  'noticias': 'news',
  'noticias y musica': 'news',
  'informacion': 'news',
  'informativa': 'news',
  'information': 'news',
  'international news': 'news',
  'sports news': 'sports',
  'live sports': 'sports',
  'deportes': 'sports',
  'cumbias': 'cumbia',
  'cristiana': 'religious',
  'tropical music': 'tropical',
  'musica tropical': 'tropical',
  'pop clasico': 'classic-hits',
  'clasicos en espanol': 'classic-hits',
  'clasicos en ingles': 'classic-hits',
  'clasicos en espanol e ingles': 'classic-hits',
  'classics': 'classic-hits',
  'classical music': 'classical',
  'greek pop': 'pop',
  'greek music': 'world',
  'latin music': 'latin',
  'italian pop': 'pop',
  'australian music': 'world',

  // Common consolidations
  'top40': 'top-40',
  'top 40': 'top-40',
  'top 40 hits': 'top-40',
  'top 100': 'hits',
  'top': 'hits',
  'pop rock': 'pop-rock',
  'pop-rock': 'pop-rock',
  'soft rock': 'soft-rock',
  'hard rock': 'hard-rock',
  'classic rock': 'classic-rock',
  'rock classics': 'classic-rock',
  'classic hits': 'classic-hits',
  'progressive rock': 'prog-rock',
  'progressive': 'prog-rock',
  'alternative rock': 'alternative',
  'indie rock': 'indie',
  'electronic dance music': 'edm',
  'dance music': 'dance',
  'club dance': 'dance',
  'club dance electronic house trance': 'dance',
  'club house': 'house',
  'soulful house': 'house',
  'tech house': 'house',
  'club': 'dance',
  'drum and bass': 'drum-and-bass',
  "drum 'n bass": 'drum-and-bass',
  'd&b': 'drum-and-bass',
  'hip hop': 'hip-hop',
  'hiphop': 'hip-hop',
  'hip-hop/rap': 'hip-hop',
  'rap hiphop rnb': 'hip-hop',
  'r&b': 'r-and-b',
  'rnb': 'r-and-b',
  'r and b': 'r-and-b',
  'rhythm and blues': 'r-and-b',
  'community radio': 'community-radio',
  'community': 'community-radio',
  'radio comunitaria': 'community-radio',
  'college radio': 'community-radio',
  'public radio': 'public-radio',
  'radio publica': 'public-radio',
  'local radio': 'local-news',
  'local news': 'local-news',
  'local talk': 'local-news',
  'news talk': 'news-talk',
  'news talk music': 'news-talk',
  'talk radio': 'talk',
  'sports talk': 'sports-talk',
  'adult contemporary': 'adult-contemporary',
  'old time radio': 'oldies',
  'urban': 'r-and-b',
  'urban hits': 'r-and-b',
  'world middle east': 'arabic-music',
  'arabic': 'arabic-music',
  'middle east': 'arabic-music',
  'middle eastern': 'arabic-music',
  'world music': 'world',
  'world fusion': 'world',
  'folklore': 'folk',
  'folk music': 'folk',
  'christian music': 'christian-music',
  'christian contemporary': 'christian-music',
  'christian-gospel': 'gospel',
  'worship': 'christian-music',
  'praise': 'christian-music',
  'praise and worship': 'christian-music',
  'bible': 'religious',
  'catolica': 'catholic',
  'iglesia': 'catholic',
  'cristiano': 'religious',
  'jesus': 'religious',
  'love songs': 'romantic',
  'children': 'kids',
  'kids music': 'kids',
  'family radio': 'kids',
  'cultural': 'culture',
  'culture programming': 'culture',
  'literature': 'culture',
  'art': 'culture',
  'lofi': 'lofi',
  'lo-fi': 'lofi',
  'lo fi': 'lofi',
  'synthpop': 'synthpop',
  'synth-pop': 'synthpop',
  'synthwave': 'synthpop',
  'new wave': 'new-wave',
  'new music': 'hits',
  'eurodance': 'dance',
  'jungle': 'drum-and-bass',
  'gothic': 'alternative',
  'remixes': 'dance',
  'piano': 'instrumental',
  'guitar': 'instrumental',
  'orchestral': 'classical',
  'symphony': 'classical',
  'symphonic': 'classical',
  'opera music': 'opera',
  'lullaby': 'kids',
  'fairy tale': 'kids',
  'fairytale': 'kids',
  'storytime': 'kids',
  'audiobook': 'podcast',
  'audiobooks': 'podcast',
  'podcasts': 'podcast',
  'underground': 'experimental',
  'avant garde': 'experimental',
  'avant-garde': 'experimental',
  'noise': 'experimental',
  'trap': 'hip-hop',
  'drill': 'hip-hop',
  'grime': 'hip-hop',
  'soulful': 'soul',
  'motown': 'soul',
  'doo wop': 'oldies',
  'doo-wop': 'oldies',
  'big band': 'jazz',
  'swing': 'jazz',
  'bossa nova': 'jazz',
  'bossa-nova': 'jazz',
  'fusion': 'jazz',
  'smooth': 'smooth-jazz',
  'smooth jazz': 'smooth-jazz',
  'cool jazz': 'jazz',
  'free jazz': 'jazz',
  'latin jazz': 'jazz',
  'classical jazz': 'jazz',
  'vallenato': 'tropical',
  'merengue': 'merengue',
  'salsa': 'salsa',
  'reggaeton': 'reggaeton',
  'dancehall': 'reggae',
  'reggae roots': 'reggae',
  'reggae fusion': 'reggae',
  'world middle eastern': 'arabic-music',

  // Russian / Cyrillic
  'поп-музыка': 'pop',
  'рок': 'rock',
  'джаз': 'jazz',
  'классика': 'classical',
  'танцевальная': 'dance',
  'новости': 'news',
  'хиты': 'hits',
  'ретро': 'retro',
  'релакс': 'chillout',

  // Greek
  'ελληνικη μουσικη': 'world',
  'λαικα': 'world',

  // Common non-music
  'comedy': 'comedy',
  'humor': 'comedy',
  'standup': 'comedy',
  'stand up': 'comedy',
  'stand-up': 'comedy',
  'business news': 'business',
  'financial': 'business',
  'finance news': 'business',
  'science news': 'culture',
  'history podcast': 'culture',
  'health and wellness': 'lifestyle',
  'meditation': 'sleep',
  'sleep music': 'sleep',
  'gym': 'lifestyle',
  'study': 'lofi',
  'productivity': 'lofi',
  'traffic': 'local-news',
  'weather report': 'news',
  'political talk': 'politics',
  'public': 'public-radio',
  'public broadcasting': 'public-radio',
  'state radio': 'public-radio',
  'non-commercial': 'community-radio',
  'noncommercial': 'community-radio',
  'religion': 'religious',
  'religious programming': 'religious',
  'islamic radio': 'islamic',
  'islamic music': 'islamic',
  'quran': 'islamic',
  'hindu': 'religious',
  'hindu devotional': 'religious',
  'bhajan': 'religious',
  'kirtan': 'religious',
  'catholic radio': 'catholic',

  // ── Sparse-tag folds (kept canonical-set under 100) ──
  'choir': 'classical', 'chorus': 'classical', 'choral': 'classical',
  'hymn': 'classical', 'hymns': 'classical', 'gregorian': 'classical',
  'history': 'culture', 'historical': 'culture',
  'science': 'culture', 'tech': 'culture',
  'finance': 'business', 'markets': 'business',
  'health': 'lifestyle', 'wellness': 'lifestyle', 'fitness': 'lifestyle',
  'workout': 'lifestyle', 'yoga': 'lifestyle',
  'family': 'kids',
  'weather': 'news',
  'samba': 'world', 'celtic': 'world', 'c-pop': 'world',
  'bachata': 'tropical',
};

// Patterns applied in order after exact-alias miss. First match wins.
// Returns canonical slug or null (drop).
type Rule = (t: string) => CanonicalTag | null | undefined;
const RULES: Rule[] = [
  // Decades — catch like "1980s" "80er" already done as exact, but allow generic
  (t) => /^(50|60|70|80|90)('?s| s)?$/.test(t) ? (t.slice(0, 2) + 's') as CanonicalTag : undefined,
  (t) => /^(50|60|70|80|90)er$/.test(t) ? (t.slice(0, 2) + 's') as CanonicalTag : undefined,
  // Regional Mexican family
  (t) => /\b(regional mex|mexican|banda|grupera|mariachi|ranchera|corrid|nort[eñ]+o|tejano|cumbia rancher)/i.test(t) ? 'regional-mexican' : undefined,
  // Latin & sub-genres
  (t) => /\bsalsa\b/.test(t) ? 'salsa' : undefined,
  (t) => /\bbachata\b/.test(t) ? 'tropical' : undefined,
  (t) => /\bmerengue\b/.test(t) ? 'merengue' : undefined,
  (t) => /\bsamba\b/.test(t) ? 'world' : undefined,
  (t) => /\breggaeton\b/.test(t) ? 'reggaeton' : undefined,
  (t) => /\b(cumbia)\b/.test(t) ? 'cumbia' : undefined,
  (t) => /\b(tropical|caribbean)\b/.test(t) ? 'tropical' : undefined,
  (t) => /\bvallenato\b/.test(t) ? 'tropical' : undefined,
  (t) => /\b(latin|latino|latina|latinoamerican)/.test(t) ? 'latin' : undefined,
  // Rock subgenres before generic "rock"
  (t) => /\bclassic ?rock\b/.test(t) ? 'classic-rock' : undefined,
  (t) => /\bsoft ?rock\b/.test(t) ? 'soft-rock' : undefined,
  (t) => /\bhard ?rock\b/.test(t) ? 'hard-rock' : undefined,
  (t) => /\b(prog(ressive)? ?rock|prog)\b/.test(t) ? 'prog-rock' : undefined,
  (t) => /\bpop ?rock\b/.test(t) ? 'pop-rock' : undefined,
  (t) => /\bindie\b/.test(t) ? 'indie' : undefined,
  (t) => /\balternative\b/.test(t) ? 'alternative' : undefined,
  (t) => /\bpunk\b/.test(t) ? 'punk' : undefined,
  (t) => /\bhardcore\b/.test(t) ? 'hardcore' : undefined,
  (t) => /\bmetal\b/.test(t) ? 'metal' : undefined,
  // Electronic family
  (t) => /\b(edm|electronic dance)\b/.test(t) ? 'edm' : undefined,
  (t) => /\b(house music|tech house|deep house|club house|soulful house)\b/.test(t) ? 'house' : undefined,
  (t) => /\bhouse\b/.test(t) ? 'house' : undefined,
  (t) => /\btechno\b/.test(t) ? 'techno' : undefined,
  (t) => /\btrance\b/.test(t) ? 'trance' : undefined,
  (t) => /\b(drum.?n.?bass|d&b|dnb)\b/.test(t) ? 'drum-and-bass' : undefined,
  (t) => /\bdubstep\b/.test(t) ? 'dubstep' : undefined,
  (t) => /\bambient\b/.test(t) ? 'ambient' : undefined,
  (t) => /\blounge\b/.test(t) ? 'lounge' : undefined,
  (t) => /\b(chill|chillout|chill out|relax)\b/.test(t) ? 'chillout' : undefined,
  (t) => /\bdowntempo\b/.test(t) ? 'downtempo' : undefined,
  (t) => /\b(electronica?|electronic music)\b/.test(t) ? 'electronic' : undefined,
  (t) => /\bdance\b/.test(t) ? 'dance' : undefined,
  // Hip-hop / urban
  (t) => /\b(hip.?hop|hiphop)\b/.test(t) ? 'hip-hop' : undefined,
  (t) => /\b(rap|trap|drill|grime)\b/.test(t) ? 'rap' : undefined,
  (t) => /\b(r ?& ?b|rhythm and blues|rnb|r and b)\b/.test(t) ? 'r-and-b' : undefined,
  (t) => /\b(urban contemporary|urban hits)\b/.test(t) ? 'r-and-b' : undefined,
  (t) => /\bsoul\b/.test(t) ? 'soul' : undefined,
  (t) => /\bfunk\b/.test(t) ? 'funk' : undefined,
  (t) => /\bdisco\b/.test(t) ? 'disco' : undefined,
  (t) => /\bska\b/.test(t) ? 'ska' : undefined,
  (t) => /\b(reggae|dub|dancehall)\b/.test(t) ? 'reggae' : undefined,
  // Country/folk/blues/jazz
  (t) => /\b(country music|country hits|country radio|country)\b/.test(t) ? 'country' : undefined,
  (t) => /\b(folk|folklore|americana|bluegrass)\b/.test(t) ? 'folk' : undefined,
  (t) => /\bblues\b/.test(t) ? 'blues' : undefined,
  (t) => /\bsmooth ?jazz\b/.test(t) ? 'smooth-jazz' : undefined,
  (t) => /\b(jazz|swing|big band|bossa)\b/.test(t) ? 'jazz' : undefined,
  // Classical/instrumental
  (t) => /\b(classical|orchestr|symphon|baroque|chamber music)\b/.test(t) ? 'classical' : undefined,
  (t) => /\bopera\b/.test(t) ? 'opera' : undefined,
  (t) => /\b(choir|chorus|choral|hymns?|gregorian)\b/.test(t) ? 'classical' : undefined,
  (t) => /\b(soundtrack|score|film music|movie music)\b/.test(t) ? 'soundtrack' : undefined,
  (t) => /\b(instrumental|piano|guitar)\b/.test(t) ? 'instrumental' : undefined,
  // Religious music & talk
  (t) => /\bgospel\b/.test(t) ? 'gospel' : undefined,
  (t) => /\b(christian (music|contemporary|rock)|worship|praise)\b/.test(t) ? 'christian-music' : undefined,
  (t) => /\b(christian|cristian|cristiana|cristianismo|crist[aã]o)\b/.test(t) ? 'religious' : undefined,
  (t) => /\b(catholic|cat[oó]lic[ao])\b/.test(t) ? 'catholic' : undefined,
  (t) => /\b(islam|muslim|quran|qur'an|nasheed)/.test(t) ? 'islamic' : undefined,
  (t) => /\b(buddhist|buddhism|hindu|bhajan|kirtan|sikh|jewish|judaic|torah|gurbani)/.test(t) ? 'religious' : undefined,
  (t) => /\b(religion|religious|spiritual|faith|bible)/.test(t) ? 'religious' : undefined,
  // K/J/C-pop & anime
  (t) => /\b(k[-_ ]?pop|korean pop)\b/.test(t) ? 'k-pop' : undefined,
  (t) => /\b(j[-_ ]?pop|japanese pop)\b/.test(t) ? 'j-pop' : undefined,
  (t) => /\b(c[-_ ]?pop|chinese pop|mandopop|cantopop)\b/.test(t) ? 'world' : undefined,
  (t) => /\banime\b/.test(t) ? 'anime' : undefined,
  (t) => /\bbollywood\b/.test(t) ? 'bollywood' : undefined,
  (t) => /\bcelt(ic|y)\b/.test(t) ? 'world' : undefined,
  (t) => /\b(arabic|arab)\b/.test(t) ? 'arabic-music' : undefined,
  (t) => /\b(world music|world fusion|ethno|ethnic|tribal)/.test(t) ? 'world' : undefined,
  // Pop & general hits
  (t) => /\b(top ?40|top40)\b/.test(t) ? 'top-40' : undefined,
  (t) => /\b(adult contemporary|ac radio)\b/.test(t) ? 'adult-contemporary' : undefined,
  (t) => /\b(classic hits|classics)\b/.test(t) ? 'classic-hits' : undefined,
  (t) => /\b(oldies|nostalgia|flashback|retro)\b/.test(t) ? 'oldies' : undefined,
  (t) => /\b(synth ?pop|synthwave|new ?wave)\b/.test(t) ? 'synthpop' : undefined,
  (t) => /\b(love songs?|romance|romantic|romantica|baladas?)\b/.test(t) ? 'romantic' : undefined,
  (t) => /\b(pop music|pop hits|pop songs|musica pop|musique pop)\b/.test(t) ? 'pop' : undefined,
  (t) => /\bpop\b/.test(t) ? 'pop' : undefined,
  (t) => /\brock\b/.test(t) ? 'rock' : undefined,
  // News / talk / sports family
  (t) => /\b(news ?talk|noticias y deportes)\b/.test(t) ? 'news-talk' : undefined,
  (t) => /\b(noticias|news|local news|local radio|information|informativa|informacion)\b/.test(t) ? 'news' : undefined,
  (t) => /\b(sports? ?talk|tertulia deportiva)\b/.test(t) ? 'sports-talk' : undefined,
  (t) => /\b(sports?|deportes|football|soccer|baseball|basketball|hockey|nfl|nba|mlb)\b/.test(t) ? 'sports' : undefined,
  (t) => /\b(public radio|state radio|estatal|public broadcaster)\b/.test(t) ? 'public-radio' : undefined,
  (t) => /\b(community radio|comunitaria|non[- ]commercial)\b/.test(t) ? 'community-radio' : undefined,
  (t) => /\b(culture|cultural|literature|book|art)/.test(t) ? 'culture' : undefined,
  (t) => /\b(education|educational|learning|school|university|college)/.test(t) ? 'education' : undefined,
  (t) => /\b(science|tech radio|technology|history|historical)/.test(t) ? 'culture' : undefined,
  (t) => /\b(politics|political)/.test(t) ? 'politics' : undefined,
  (t) => /\b(business|economy|economic|finance|financial|markets|stocks?)/.test(t) ? 'business' : undefined,
  (t) => /\b(weather|wx|meteo)/.test(t) ? 'news' : undefined,
  (t) => /\b(health|wellness|fitness|yoga|lifestyle|style|fashion)/.test(t) ? 'lifestyle' : undefined,
  (t) => /\b(kids|children|nursery|lullaby|fairy ?tale|family)/.test(t) ? 'kids' : undefined,
  (t) => /\b(podcast|audiobook|spoken word)/.test(t) ? 'podcast' : undefined,
  (t) => /\b(party|fiesta|club party)/.test(t) ? 'party' : undefined,
  (t) => /\b(workout|gym|cardio)/.test(t) ? 'lifestyle' : undefined,
  (t) => /\b(sleep|meditation)/.test(t) ? 'sleep' : undefined,
  (t) => /\b(comedy|humor|standup|stand[- ]up)/.test(t) ? 'comedy' : undefined,
  (t) => /\b(experimental|underground|avant[- ]?garde|noise)/.test(t) ? 'experimental' : undefined,
  (t) => /\blo[- ]?fi\b/.test(t) ? 'lofi' : undefined,
  // Decade-ish fallbacks
  (t) => /^00s$/.test(t) ? '2000s' : undefined,
  (t) => /^10s$/.test(t) ? '2010s' : undefined,
];

export function canonicalizeTag(raw: string): CanonicalTag | null {
  if (!raw) return null;
  const t = normalize(raw);
  if (!t) return null;

  // Drop noise first
  for (const p of NOISE_PATTERNS) if (p.test(t)) return null;

  // Exact alias
  if (t in EXACT_ALIASES) return EXACT_ALIASES[t] as CanonicalTag | null;

  // Pre-existing canonical wins
  if (CANONICAL_SET.has(t)) return t as CanonicalTag;

  // Rule-based fallback
  for (const r of RULES) {
    const v = r(t);
    if (v != null && CANONICAL_SET.has(v)) return v;
  }

  return null;
}

/**
 * Map a station's raw tag list to a deduped canonical tag list, preserving
 * the order of first occurrence so the YAML diff stays minimal.
 */
export function canonicalizeTags(raws: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    const c = canonicalizeTag(raw);
    if (!c) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Language canonicalization
// Output: ISO 639-1 two-letter code where possible, else the cleaned slug.
// ─────────────────────────────────────────────────────────────────────────

const LANGUAGE_ALIASES: Record<string, string> = {
  english: 'en', 'american english': 'en', 'british english': 'en',
  'english uk': 'en', 'english us': 'en', engilsh: 'en',
  spanish: 'es', espanol: 'es', 'espanish': 'es',
  'castellano': 'es', 'castellano. espanol': 'es',
  'espanol mexico': 'es', 'espanol argentina': 'es',
  'espanol internacional': 'es', 'espanol latinoamerica': 'es',
  'espanol latino': 'es', 'espanol - latinoamerica': 'es',
  french: 'fr', francais: 'fr', 'francais canadien': 'fr',
  arabic: 'ar', 'al arabiya': 'ar',
  german: 'de', deutsch: 'de', 'deutsch frankisch': 'de', 'deutsch fraenkisch': 'de',
  italian: 'it', italiano: 'it',
  portuguese: 'pt', portugues: 'pt', 'portugues brasil': 'pt',
  'portugues (brasil)': 'pt', 'portugues do brasil': 'pt',
  'brazilian portuguese': 'pt', 'portugues brasileiro': 'pt',
  hindi: 'hi',
  japanese: 'ja', 'nihongo': 'ja',
  chinese: 'zh', 'simplified chinese': 'zh', 'traditional chinese': 'zh',
  mandarin: 'zh', cantonese: 'zh',
  korean: 'ko', hangul: 'ko',
  indonesian: 'id', 'bahasa indonesia': 'id', 'bahasa': 'id',
  russian: 'ru', 'russkiy': 'ru', 'russkii': 'ru',
  greek: 'el', ellinika: 'el', romanian: 'ro', romana: 'ro', romania: 'ro',
  polish: 'pl', polski: 'pl', dutch: 'nl', nederlands: 'nl', vlaams: 'nl',
  serbian: 'sr', srpski: 'sr', croatian: 'hr', hrvatski: 'hr',
  turkish: 'tr', turkce: 'tr', hungarian: 'hu', magyar: 'hu',
  czech: 'cs', cestina: 'cs', slovak: 'sk', slovencina: 'sk',
  bulgarian: 'bg', bulgarski: 'bg', ukrainian: 'uk', ukrainska: 'uk',
  swedish: 'sv', svenska: 'sv', danish: 'da', dansk: 'da',
  norwegian: 'no', norsk: 'no', bokmal: 'no', norvegian: 'no',
  finnish: 'fi', suomi: 'fi', slovenian: 'sl', slovenscina: 'sl',
  hebrew: 'he', ivrit: 'he', filipino: 'tl', tagalog: 'tl', pilipino: 'tl',
  tamil: 'ta', malayalam: 'ml', telugu: 'te', kannada: 'kn',
  punjabi: 'pa', urdu: 'ur', bengali: 'bn', bangla: 'bn',
  bosnian: 'bs', albanian: 'sq', shqip: 'sq', macedonian: 'mk',
  georgian: 'ka', kartuli: 'ka', armenian: 'hy', hayeren: 'hy',
  azerbaijani: 'az', azerice: 'az', kazakh: 'kk', uzbek: 'uz', kyrgyz: 'ky',
  mongolian: 'mn', amharic: 'am', somali: 'so', swahili: 'sw',
  luganda: 'lg', akan: 'ak', yoruba: 'yo', hausa: 'ha', zulu: 'zu', xhosa: 'xh',
  afrikaans: 'af', persian: 'fa', farsi: 'fa', dari: 'fa', pashto: 'ps',
  thai: 'th', vietnamese: 'vi', tieng_viet: 'vi', khmer: 'km',
  burmese: 'my', lao: 'lo', malay: 'ms', sundanese: 'su', javanese: 'jv',
  catalan: 'ca', galician: 'gl', basque: 'eu', euskara: 'eu',
  welsh: 'cy', irish: 'ga', gaeilge: 'ga', 'scottish gaelic': 'gd',
  latvian: 'lv', lithuanian: 'lt', estonian: 'et',
  // Russian-script (incl. the variant our prior bad migration left on disk
  // when stripDiacritics() ate the breve off Й in 'русский')
  'язык: русский': 'ru', 'язык: русскии': 'ru', 'русский': 'ru', 'русскии': 'ru',
  // Catch-alls — generic "world" / "various" → drop by returning empty
  various: '', other: '', international: '',
};

export function canonicalizeLanguage(raw: string): string | null {
  if (!raw) return null;
  let t = normalize(raw);
  if (!t) return null;
  // Drop URL-shaped junk that leaked into the language field via upstream
  // import bugs ("frenchhttps:", "stream-uk1.radioparadise.com:80").
  if (/^https?:|^[a-z]+https?:/.test(t)) return null;
  if (/\.[a-z]{2,4}(:\d+)?$/i.test(t)) return null;
  // Strip leading "language:" / "язык:" wrapper if present.
  t = t.replace(/^(?:язык|language|lang|idioma|langue)\s*:\s*/i, '').trim();
  // Strip trailing backslash typos.
  t = t.replace(/\\+$/, '');
  // Already ISO 639-1
  if (/^[a-z]{2}$/.test(t)) return t;
  if (t in LANGUAGE_ALIASES) {
    const v = LANGUAGE_ALIASES[t];
    return v || null;
  }
  // Strip parenthetical and try again ("portugues (brasil)" → "portugues")
  const noparen = t.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
  if (noparen !== t && noparen in LANGUAGE_ALIASES) {
    return LANGUAGE_ALIASES[noparen] || null;
  }
  // First word — last-resort lookup
  const head = t.split(/\s+/)[0]!;
  if (head in LANGUAGE_ALIASES) return LANGUAGE_ALIASES[head] || null;
  // Unknown — keep cleaned slug so we don't lose info
  return t;
}

export function canonicalizeLanguages(raws: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    // Source data sometimes packs multiple languages into one slug with
    // slash/comma/semicolon separators ("ingles/portugues/espanol"). Split
    // them and canonicalize each piece independently.
    for (const piece of String(raw).split(/[/,;|]/)) {
      const c = canonicalizeLanguage(piece);
      if (!c) continue;
      if (seen.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Station name normalization
// ─────────────────────────────────────────────────────────────────────────

/**
 * Canonicalize the editorial "nature" string into a small closed set so the
 * search filter and the panel chip stay clean. Heuristic — operates on the
 * normalized lowercase value. Falls back to the cleaned input when nothing
 * matches so we never lose information.
 */
export function canonicalizeNature(raw: string): string {
  if (!raw) return '';
  const t = normalize(raw);
  if (!t) return '';
  if (/\bstate (media|broadcast|radio|tv)\b|state-?(media|run|owned)|government-?(run|owned|controlled)/.test(t)) {
    return 'state media';
  }
  if (/\bpublic (broadcaster|radio|service)|public-?broadcaster|pbs|npr|bbc|abc public/.test(t)) {
    return 'public broadcaster';
  }
  if (/\b(community|low-power|lpfm|college|campus|student|non-?profit|nonprofit)\b/.test(t)) {
    return 'community';
  }
  if (/\b(religious|christian|catholic|islamic|hindu|buddhist|jewish|church)\b/.test(t)) {
    return 'religious';
  }
  if (/\b(pirate|unlicensed|illegal)\b/.test(t)) return 'pirate';
  if (/\b(internet[- ]only|web[- ]only|online[- ]only|webcaster)\b/.test(t)) return 'online-only';
  if (/\bnon[- ]?commercial\b/.test(t)) return 'non-commercial';
  if (/\bcommercial\b/.test(t)) return 'commercial';
  if (/\bunknown\b/.test(t)) return 'unknown';
  return t;
}

/**
 * - Trim whitespace, collapse internal runs of whitespace
 * - Strip leading/trailing decorative dashes/dots
 * - Convert ALL-CAPS station names (≥ 6 letters all uppercase) to Title Case
 *   only when there are NO lowercase letters at all — otherwise the mix is
 *   intentional (e.g., "WOXR 90.9").
 * - Replace bizarre whitespace (NBSP, zero-width, etc.) with regular space
 */
export function normalizeStationName(raw: string): string {
  if (!raw) return '';
  let s = raw;
  // Normalize unicode spaces
  s = s.replace(/[  -​  　]/g, ' ');
  // Strip control characters
  s = s.replace(/[ -]/g, '');
  // Collapse spaces
  s = s.replace(/\s+/g, ' ').trim();
  // Strip leading "- " or "· " or "• " patterns
  s = s.replace(/^[-–—·•.,]+\s*/, '').replace(/\s*[-–—·•.,]+$/, '').trim();
  // ALL-CAPS → Title Case (only when ≥3 letters and no lowercase exists in the
  // alphabetic portion — protects callsigns like "WOXR" and acronyms)
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length >= 6 && letters === letters.toUpperCase()) {
    s = titleCase(s);
  }
  return s;
}

function titleCase(s: string): string {
  // Words to keep lowercase mid-string (English)
  const SMALL = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to',
    'by', 'of', 'in', 'with', 'as', 'is', 'fm', 'am', 'tv',
  ]);
  // Tokens that should stay all-caps (callsigns + 2–4 letter acronyms).
  // We DON'T preserve generic 5-letter words ("RADIO", "MUSIC") as acronyms —
  // that would defeat the purpose of un-shouting an ALL-CAPS station name.
  const ACRONYM = /^([KWX][A-Z0-9]{2,5}|[A-Z]{2,4})$/;
  return s.toLowerCase().split(' ').map((tok, i) => {
    const stripped = tok.replace(/[^A-Za-z]/g, '');
    if (stripped.length === 0) return tok;
    if (i > 0 && SMALL.has(tok)) return tok;
    if (ACRONYM.test(stripped.toUpperCase()) && stripped.length <= 4) return tok.toUpperCase();
    return tok.charAt(0).toUpperCase() + tok.slice(1);
  }).join(' ');
}
