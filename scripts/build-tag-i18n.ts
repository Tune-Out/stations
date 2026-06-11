#!/usr/bin/env tsx
/**
 * Generate src/spa/i18n/tags/{en,fr,ar,de,it,es,pt,hi,ja,zh,ko,id,ru}.json
 * with localized labels for every canonical tag.
 *
 * Single source of truth: TAG_TRANSLATIONS below. Each row maps a canonical
 * tag slug to one label per supported locale. Adding a new locale = adding
 * a column. Adding a new tag = adding a row.
 *
 * Run with `npm run build:tag-i18n`. Outputs are deterministic so the diff
 * is easy to review in PRs.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CANONICAL_TAGS, type CanonicalTag } from './lib/canonical.js';
import { SUPPORTED_LOCALES, type Locale } from './lib/schema.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const OUT_DIR = join(ROOT, 'src', 'spa', 'i18n', 'tags');

type Row = Record<Locale, string>;

// Most genre tags use the original English term in most languages — that's
// idiomatic for "rock", "pop", "jazz" almost everywhere. Where a locale has
// a real native equivalent we use it. Decade tags follow each locale's
// conventional form ("anni '80", "Années 80", "80-е", etc.).
const TAG_TRANSLATIONS: Record<CanonicalTag, Row> = {
  // ── Pop family ─────────────────────────────────────────────────────────
  pop:                  { en:'Pop',                fr:'Pop',                  ar:'بوب',                de:'Pop',                  it:'Pop',                  es:'Pop',                  pt:'Pop',                  hi:'पॉप',                  ja:'ポップ',              zh:'流行',         ko:'팝',                  id:'Pop',                  ru:'Поп' },
  hits:                 { en:'Hits',               fr:'Tubes',                ar:'الأكثر شعبية',       de:'Hits',                 it:'Successi',             es:'Éxitos',               pt:'Sucessos',             hi:'हिट्स',                ja:'ヒッツ',              zh:'热门',         ko:'히트',                id:'Hits',                 ru:'Хиты' },
  'top-40':             { en:'Top 40',             fr:'Top 40',               ar:'أفضل 40',            de:'Top 40',               it:'Top 40',               es:'Top 40',               pt:'Top 40',               hi:'टॉप 40',               ja:'トップ 40',           zh:'排行榜前 40',  ko:'톱 40',               id:'Top 40',               ru:'Топ-40' },
  'classic-hits':       { en:'Classic Hits',       fr:'Tubes classiques',     ar:'كلاسيكيات شعبية',    de:'Klassische Hits',      it:'Successi classici',    es:'Éxitos clásicos',      pt:'Clássicos pop',        hi:'क्लासिक हिट्स',         ja:'クラシック・ヒッツ',  zh:'经典金曲',     ko:'클래식 히트',          id:'Hits klasik',          ru:'Классические хиты' },
  'adult-contemporary': { en:'Adult Contemporary', fr:'Adulte contemporain',  ar:'البالغين المعاصرة',  de:'Adult Contemporary',   it:'Adult contemporary',   es:'Adulto contemporáneo', pt:'Adulto contemporâneo', hi:'एडल्ट कंटेम्पररी',     ja:'アダルトコンテンポラリー', zh:'成人当代',     ko:'어덜트 컨템포러리',     id:'Adult contemporary',   ru:'Взрослая современная' },
  'pop-rock':           { en:'Pop Rock',           fr:'Pop rock',             ar:'بوب روك',            de:'Pop-Rock',             it:'Pop rock',             es:'Pop rock',             pt:'Pop rock',             hi:'पॉप रॉक',              ja:'ポップロック',        zh:'流行摇滚',     ko:'팝 록',                id:'Pop rock',             ru:'Поп-рок' },
  romantic:             { en:'Romantic',           fr:'Romantique',           ar:'رومانسي',            de:'Romantisch',           it:'Romantica',            es:'Romántica',            pt:'Romântica',            hi:'रोमांटिक',              ja:'ロマンティック',      zh:'浪漫',         ko:'로맨틱',               id:'Romantis',             ru:'Романтика' },
  ballad:               { en:'Ballads',            fr:'Ballades',             ar:'الأغاني العاطفية',   de:'Balladen',             it:'Ballate',              es:'Baladas',              pt:'Baladas',              hi:'गाथागीत',              ja:'バラード',            zh:'抒情曲',       ko:'발라드',               id:'Balada',               ru:'Баллады' },

  // ── Rock family ────────────────────────────────────────────────────────
  rock:                 { en:'Rock',               fr:'Rock',                 ar:'روك',                de:'Rock',                 it:'Rock',                 es:'Rock',                 pt:'Rock',                 hi:'रॉक',                  ja:'ロック',              zh:'摇滚',         ko:'록',                  id:'Rock',                 ru:'Рок' },
  'classic-rock':       { en:'Classic Rock',       fr:'Rock classique',       ar:'روك كلاسيكي',        de:'Klassischer Rock',     it:'Rock classico',        es:'Rock clásico',         pt:'Rock clássico',        hi:'क्लासिक रॉक',           ja:'クラシック・ロック',  zh:'经典摇滚',     ko:'클래식 록',            id:'Rock klasik',          ru:'Классический рок' },
  'hard-rock':          { en:'Hard Rock',          fr:'Hard rock',            ar:'هارد روك',           de:'Hard Rock',            it:'Hard rock',            es:'Hard rock',            pt:'Hard rock',            hi:'हार्ड रॉक',             ja:'ハードロック',        zh:'硬式摇滚',     ko:'하드 록',              id:'Hard rock',            ru:'Хард-рок' },
  'soft-rock':          { en:'Soft Rock',          fr:'Soft rock',            ar:'سوفت روك',           de:'Soft Rock',            it:'Soft rock',            es:'Soft rock',            pt:'Soft rock',            hi:'सॉफ्ट रॉक',             ja:'ソフトロック',        zh:'软摇滚',       ko:'소프트 록',            id:'Soft rock',            ru:'Софт-рок' },
  'prog-rock':          { en:'Prog Rock',          fr:'Rock progressif',      ar:'روك تقدمي',          de:'Progressive Rock',     it:'Rock progressivo',     es:'Rock progresivo',      pt:'Rock progressivo',     hi:'प्रोग रॉक',             ja:'プログレッシヴ・ロック', zh:'前卫摇滚',     ko:'프로그레시브 록',      id:'Rock progresif',       ru:'Прог-рок' },
  metal:                { en:'Metal',              fr:'Metal',                ar:'ميتال',              de:'Metal',                it:'Metal',                es:'Metal',                pt:'Metal',                hi:'मेटल',                 ja:'メタル',              zh:'金属',         ko:'메탈',                id:'Metal',                ru:'Метал' },
  hardcore:             { en:'Hardcore',           fr:'Hardcore',             ar:'هاردكور',            de:'Hardcore',             it:'Hardcore',             es:'Hardcore',             pt:'Hardcore',             hi:'हार्डकोर',              ja:'ハードコア',          zh:'硬核',         ko:'하드코어',             id:'Hardcore',             ru:'Хардкор' },
  punk:                 { en:'Punk',               fr:'Punk',                 ar:'بانك',               de:'Punk',                 it:'Punk',                 es:'Punk',                 pt:'Punk',                 hi:'पंक',                  ja:'パンク',              zh:'朋克',         ko:'펑크',                id:'Punk',                 ru:'Панк' },
  indie:                { en:'Indie',              fr:'Indé',                 ar:'مستقل',              de:'Indie',                it:'Indie',                es:'Indie',                pt:'Indie',                hi:'इंडी',                  ja:'インディー',          zh:'独立',         ko:'인디',                id:'Indie',                ru:'Инди' },
  alternative:          { en:'Alternative',        fr:'Alternatif',           ar:'بديل',               de:'Alternativ',           it:'Alternativa',          es:'Alternativa',          pt:'Alternativa',          hi:'वैकल्पिक',              ja:'オルタナティヴ',      zh:'另类',         ko:'얼터너티브',           id:'Alternatif',           ru:'Альтернатива' },

  // ── Country / Folk ─────────────────────────────────────────────────────
  country:              { en:'Country',            fr:'Country',              ar:'كانتري',             de:'Country',              it:'Country',              es:'Country',              pt:'Country',              hi:'कंट्री',                ja:'カントリー',          zh:'乡村',         ko:'컨트리',               id:'Country',              ru:'Кантри' },
  folk:                 { en:'Folk',               fr:'Folk',                 ar:'فولك',               de:'Folk',                 it:'Folk',                 es:'Folk',                 pt:'Folk',                 hi:'लोक',                  ja:'フォーク',            zh:'民谣',         ko:'포크',                id:'Folk',                 ru:'Фолк' },

  // ── Latin family ───────────────────────────────────────────────────────
  latin:                { en:'Latin',              fr:'Latino',               ar:'لاتيني',             de:'Latin',                it:'Latina',               es:'Latina',               pt:'Latina',               hi:'लैटिन',                 ja:'ラテン',              zh:'拉丁',         ko:'라틴',                id:'Latin',                ru:'Латинская' },
  salsa:                { en:'Salsa',              fr:'Salsa',                ar:'سالسا',              de:'Salsa',                it:'Salsa',                es:'Salsa',                pt:'Salsa',                hi:'सालसा',                 ja:'サルサ',              zh:'萨尔萨',       ko:'살사',                id:'Salsa',                ru:'Сальса' },
  cumbia:               { en:'Cumbia',             fr:'Cumbia',               ar:'كومبيا',             de:'Cumbia',               it:'Cumbia',               es:'Cumbia',               pt:'Cumbia',               hi:'कुम्बिया',              ja:'クンビア',            zh:'昆比亚',       ko:'쿰비아',              id:'Cumbia',               ru:'Кумбия' },
  merengue:             { en:'Merengue',           fr:'Merengue',             ar:'مارينغي',            de:'Merengue',             it:'Merengue',             es:'Merengue',             pt:'Merengue',             hi:'मेरेंगे',                ja:'メレンゲ',            zh:'梅伦格',       ko:'메렝게',              id:'Merengue',             ru:'Меренге' },
  tropical:             { en:'Tropical',           fr:'Tropical',             ar:'استوائي',            de:'Tropical',             it:'Tropicale',            es:'Tropical',             pt:'Tropical',             hi:'उष्णकटिबंधीय',          ja:'トロピカル',          zh:'热带',         ko:'트로피컬',             id:'Tropis',               ru:'Тропическая' },
  'regional-mexican':   { en:'Regional Mexican',   fr:'Régional mexicain',    ar:'مكسيكي إقليمي',      de:'Regional-Mexikanisch', it:'Regionale messicana',  es:'Regional mexicana',    pt:'Regional mexicana',    hi:'रीजनल मैक्सिकन',         ja:'リージョナル・メキシカン', zh:'墨西哥地区',   ko:'리저널 멕시칸',        id:'Regional Meksiko',     ru:'Региональная мексиканская' },

  // ── World / Asian Pop ──────────────────────────────────────────────────
  world:                { en:'World',              fr:'Musique du monde',     ar:'موسيقى العالم',      de:'Weltmusik',            it:'Musica del mondo',     es:'Música del mundo',     pt:'Música do mundo',      hi:'विश्व संगीत',           ja:'ワールド',            zh:'世界音乐',     ko:'월드',                id:'Musik dunia',          ru:'Музыка мира' },
  bollywood:            { en:'Bollywood',          fr:'Bollywood',            ar:'بوليوود',            de:'Bollywood',            it:'Bollywood',            es:'Bollywood',            pt:'Bollywood',            hi:'बॉलीवुड',                ja:'ボリウッド',          zh:'宝莱坞',       ko:'발리우드',             id:'Bollywood',            ru:'Болливуд' },
  'arabic-music':       { en:'Arabic',             fr:'Arabe',                ar:'عربي',               de:'Arabisch',             it:'Araba',                es:'Árabe',                pt:'Árabe',                hi:'अरबी',                  ja:'アラビック',          zh:'阿拉伯',       ko:'아랍',                id:'Arab',                 ru:'Арабская' },
  anime:                { en:'Anime',              fr:'Anime',                ar:'أنمي',               de:'Anime',                it:'Anime',                es:'Anime',                pt:'Anime',                hi:'एनिमे',                 ja:'アニメ',              zh:'动漫',         ko:'애니메이션',           id:'Anime',                ru:'Аниме' },
  'k-pop':              { en:'K-Pop',              fr:'K-Pop',                ar:'كي-بوب',             de:'K-Pop',                it:'K-Pop',                es:'K-Pop',                pt:'K-Pop',                hi:'के-पॉप',                ja:'K-POP',               zh:'韩流',         ko:'K-팝',                id:'K-Pop',                ru:'K-Pop' },
  'j-pop':              { en:'J-Pop',              fr:'J-Pop',                ar:'جي-بوب',             de:'J-Pop',                it:'J-Pop',                es:'J-Pop',                pt:'J-Pop',                hi:'जे-पॉप',                ja:'J-POP',               zh:'日流',         ko:'J-팝',                id:'J-Pop',                ru:'J-Pop' },

  // ── Hip-Hop / R&B / Soul ───────────────────────────────────────────────
  'hip-hop':            { en:'Hip-Hop',            fr:'Hip-Hop',              ar:'هيب هوب',            de:'Hip-Hop',              it:'Hip-Hop',              es:'Hip-Hop',              pt:'Hip-Hop',              hi:'हिप-हॉप',               ja:'ヒップホップ',        zh:'嘻哈',         ko:'힙합',                id:'Hip-Hop',              ru:'Хип-хоп' },
  rap:                  { en:'Rap',                fr:'Rap',                  ar:'راب',                de:'Rap',                  it:'Rap',                  es:'Rap',                  pt:'Rap',                  hi:'रैप',                  ja:'ラップ',              zh:'说唱',         ko:'랩',                  id:'Rap',                  ru:'Рэп' },
  'r-and-b':            { en:'R&B',                fr:'R&B',                  ar:'آر آند بي',          de:'R&B',                  it:'R&B',                  es:'R&B',                  pt:'R&B',                  hi:'आर एंड बी',             ja:'R&B',                 zh:'节奏蓝调',     ko:'R&B',                 id:'R&B',                  ru:'R&B' },
  soul:                 { en:'Soul',               fr:'Soul',                 ar:'سول',                de:'Soul',                 it:'Soul',                 es:'Soul',                 pt:'Soul',                 hi:'सोल',                  ja:'ソウル',              zh:'灵魂乐',       ko:'소울',                id:'Soul',                 ru:'Соул' },
  funk:                 { en:'Funk',               fr:'Funk',                 ar:'فانك',               de:'Funk',                 it:'Funk',                 es:'Funk',                 pt:'Funk',                 hi:'फ़ंक',                  ja:'ファンク',            zh:'放克',         ko:'펑크 (Funk)',          id:'Funk',                 ru:'Фанк' },
  disco:                { en:'Disco',              fr:'Disco',                ar:'ديسكو',              de:'Disco',                it:'Disco',                es:'Disco',                pt:'Disco',                hi:'डिस्को',                ja:'ディスコ',            zh:'迪斯科',       ko:'디스코',              id:'Disco',                ru:'Диско' },

  // ── Reggae family ──────────────────────────────────────────────────────
  reggae:               { en:'Reggae',             fr:'Reggae',               ar:'ريغي',               de:'Reggae',               it:'Reggae',               es:'Reggae',               pt:'Reggae',               hi:'रेगे',                  ja:'レゲエ',              zh:'雷鬼',         ko:'레게',                id:'Reggae',               ru:'Регги' },
  reggaeton:            { en:'Reggaeton',          fr:'Reggaeton',            ar:'ريغيتون',            de:'Reggaeton',            it:'Reggaeton',            es:'Reggaeton',            pt:'Reggaeton',            hi:'रेगेटन',                ja:'レゲトン',            zh:'雷鬼动',       ko:'레게톤',              id:'Reggaeton',            ru:'Реггетон' },
  ska:                  { en:'Ska',                fr:'Ska',                  ar:'سكا',                de:'Ska',                  it:'Ska',                  es:'Ska',                  pt:'Ska',                  hi:'स्का',                  ja:'スカ',                zh:'斯卡',         ko:'스카',                id:'Ska',                  ru:'Ска' },

  // ── Electronic family ──────────────────────────────────────────────────
  electronic:           { en:'Electronic',         fr:'Électronique',         ar:'إلكترونيك',          de:'Elektronisch',         it:'Elettronica',          es:'Electrónica',          pt:'Eletrônica',           hi:'इलेक्ट्रॉनिक',          ja:'エレクトロニック',    zh:'电子',         ko:'일렉트로닉',           id:'Elektronik',           ru:'Электронная' },
  dance:                { en:'Dance',              fr:'Dance',                ar:'دانس',               de:'Dance',                it:'Dance',                es:'Dance',                pt:'Dance',                hi:'डांस',                  ja:'ダンス',              zh:'舞曲',         ko:'댄스',                id:'Dance',                ru:'Танцевальная' },
  house:                { en:'House',              fr:'House',                ar:'هاوس',               de:'House',                it:'House',                es:'House',                pt:'House',                hi:'हाउस',                  ja:'ハウス',              zh:'浩室',         ko:'하우스',              id:'House',                ru:'Хаус' },
  techno:               { en:'Techno',             fr:'Techno',               ar:'تكنو',               de:'Techno',               it:'Techno',               es:'Techno',               pt:'Techno',               hi:'टेक्नो',                ja:'テクノ',              zh:'科技舞曲',     ko:'테크노',              id:'Techno',               ru:'Техно' },
  trance:               { en:'Trance',             fr:'Trance',               ar:'ترانس',              de:'Trance',               it:'Trance',               es:'Trance',               pt:'Trance',               hi:'ट्रांस',                ja:'トランス',            zh:'迷幻',         ko:'트랜스',              id:'Trance',               ru:'Транс' },
  edm:                  { en:'EDM',                fr:'EDM',                  ar:'إي دي إم',           de:'EDM',                  it:'EDM',                  es:'EDM',                  pt:'EDM',                  hi:'ईडीएम',                 ja:'EDM',                 zh:'电子舞曲',     ko:'EDM',                 id:'EDM',                  ru:'EDM' },
  dubstep:              { en:'Dubstep',            fr:'Dubstep',              ar:'دب ستيب',            de:'Dubstep',              it:'Dubstep',              es:'Dubstep',              pt:'Dubstep',              hi:'डबस्टेप',                ja:'ダブステップ',        zh:'回响贝斯',     ko:'덥스텝',              id:'Dubstep',              ru:'Дабстеп' },
  'drum-and-bass':      { en:'Drum & Bass',        fr:'Drum & Bass',          ar:'درم آند بيس',        de:'Drum & Bass',          it:'Drum & Bass',          es:'Drum & Bass',          pt:'Drum & Bass',          hi:'ड्रम एंड बेस',          ja:'ドラムンベース',      zh:'鼓打贝斯',     ko:'드럼 앤 베이스',       id:'Drum & Bass',          ru:'Драм-н-бейс' },
  synthpop:             { en:'Synthpop',           fr:'Synthpop',             ar:'سينث-بوب',           de:'Synthpop',             it:'Synthpop',             es:'Synthpop',             pt:'Synthpop',             hi:'सिंथपॉप',                ja:'シンセポップ',        zh:'电气流行',     ko:'신스팝',              id:'Synthpop',             ru:'Синти-поп' },
  'new-wave':           { en:'New Wave',           fr:'New Wave',             ar:'الموجة الجديدة',     de:'New Wave',             it:'New Wave',             es:'New Wave',             pt:'New Wave',             hi:'न्यू वेव',              ja:'ニューウェイヴ',      zh:'新浪潮',       ko:'뉴 웨이브',            id:'New Wave',             ru:'Нью-вейв' },

  // ── Chillout / Ambient ─────────────────────────────────────────────────
  ambient:              { en:'Ambient',            fr:'Ambient',              ar:'محيطي',              de:'Ambient',              it:'Ambient',              es:'Ambient',              pt:'Ambient',              hi:'एम्बिएंट',              ja:'アンビエント',        zh:'氛围',         ko:'앰비언트',             id:'Ambient',              ru:'Эмбиент' },
  lounge:               { en:'Lounge',             fr:'Lounge',               ar:'لاونج',              de:'Lounge',               it:'Lounge',               es:'Lounge',               pt:'Lounge',               hi:'लाउंज',                 ja:'ラウンジ',            zh:'酒廊',         ko:'라운지',              id:'Lounge',               ru:'Лаунж' },
  chillout:             { en:'Chillout',           fr:'Chillout',             ar:'استرخاء',            de:'Chillout',             it:'Chillout',             es:'Chillout',             pt:'Chillout',             hi:'चिलआउट',                ja:'チルアウト',          zh:'放松',         ko:'칠아웃',              id:'Chillout',             ru:'Чилаут' },
  downtempo:            { en:'Downtempo',          fr:'Downtempo',            ar:'إيقاع بطيء',         de:'Downtempo',            it:'Downtempo',            es:'Downtempo',            pt:'Downtempo',            hi:'डाउनटेम्पो',             ja:'ダウンテンポ',        zh:'慢节奏',       ko:'다운템포',             id:'Downtempo',            ru:'Даунтемпо' },
  lofi:                 { en:'Lo-Fi',              fr:'Lo-Fi',                ar:'لو-فاي',             de:'Lo-Fi',                it:'Lo-Fi',                es:'Lo-Fi',                pt:'Lo-Fi',                hi:'लो-फाई',                ja:'ローファイ',          zh:'低保真',       ko:'로파이',              id:'Lo-Fi',                ru:'Лоу-фай' },

  // ── Jazz / Blues ────────────────────────────────────────────────────────
  jazz:                 { en:'Jazz',               fr:'Jazz',                 ar:'جاز',                de:'Jazz',                 it:'Jazz',                 es:'Jazz',                 pt:'Jazz',                 hi:'जैज़',                  ja:'ジャズ',              zh:'爵士',         ko:'재즈',                id:'Jazz',                 ru:'Джаз' },
  blues:                { en:'Blues',              fr:'Blues',                ar:'بلوز',               de:'Blues',                it:'Blues',                es:'Blues',                pt:'Blues',                hi:'ब्लूज़',                ja:'ブルース',            zh:'蓝调',         ko:'블루스',              id:'Blues',                ru:'Блюз' },
  'smooth-jazz':        { en:'Smooth Jazz',        fr:'Smooth Jazz',          ar:'جاز ناعم',           de:'Smooth Jazz',          it:'Smooth Jazz',          es:'Smooth Jazz',          pt:'Smooth Jazz',          hi:'स्मूथ जैज़',             ja:'スムースジャズ',      zh:'轻爵士',       ko:'스무스 재즈',          id:'Smooth Jazz',          ru:'Смуз-джаз' },
  instrumental:         { en:'Instrumental',       fr:'Instrumental',         ar:'موسيقى آلية',        de:'Instrumental',         it:'Strumentale',          es:'Instrumental',         pt:'Instrumental',         hi:'वाद्य',                 ja:'インストゥルメンタル', zh:'器乐',         ko:'연주곡',              id:'Instrumental',         ru:'Инструментальная' },
  soundtrack:           { en:'Soundtrack',         fr:'Bande originale',      ar:'موسيقى تصويرية',     de:'Soundtrack',           it:'Colonna sonora',       es:'Banda sonora',         pt:'Trilha sonora',        hi:'साउंडट्रैक',           ja:'サウンドトラック',    zh:'原声带',       ko:'사운드트랙',           id:'Soundtrack',           ru:'Саундтрек' },

  // ── Classical / Opera ──────────────────────────────────────────────────
  classical:            { en:'Classical',          fr:'Classique',            ar:'كلاسيكي',            de:'Klassik',              it:'Classica',             es:'Clásica',              pt:'Clássica',             hi:'शास्त्रीय',             ja:'クラシック',          zh:'古典',         ko:'클래식',              id:'Klasik',               ru:'Классика' },
  opera:                { en:'Opera',              fr:'Opéra',                ar:'أوبرا',              de:'Oper',                 it:'Opera',                es:'Ópera',                pt:'Ópera',                hi:'ओपेरा',                 ja:'オペラ',              zh:'歌剧',         ko:'오페라',              id:'Opera',                ru:'Опера' },

  // ── Religious family ────────────────────────────────────────────────────
  religious:            { en:'Religious',          fr:'Religieux',            ar:'ديني',               de:'Religiös',             it:'Religiosa',            es:'Religiosa',            pt:'Religiosa',            hi:'धार्मिक',                ja:'宗教',                zh:'宗教',         ko:'종교',                id:'Religi',               ru:'Религия' },
  catholic:             { en:'Catholic',           fr:'Catholique',           ar:'كاثوليكي',           de:'Katholisch',           it:'Cattolica',            es:'Católica',             pt:'Católica',             hi:'कैथोलिक',                ja:'カトリック',          zh:'天主教',       ko:'가톨릭',              id:'Katolik',              ru:'Католическая' },
  islamic:              { en:'Islamic',            fr:'Islamique',            ar:'إسلامي',             de:'Islamisch',            it:'Islamica',             es:'Islámica',             pt:'Islâmica',             hi:'इस्लामी',                ja:'イスラム',            zh:'伊斯兰',       ko:'이슬람',              id:'Islami',               ru:'Исламская' },
  gospel:               { en:'Gospel',             fr:'Gospel',               ar:'إنجيلي',             de:'Gospel',               it:'Gospel',               es:'Gospel',               pt:'Gospel',               hi:'गॉस्पेल',                ja:'ゴスペル',            zh:'福音',         ko:'가스펠',              id:'Gospel',               ru:'Госпел' },
  'christian-music':    { en:'Christian',          fr:'Chrétien',             ar:'مسيحي',              de:'Christlich',           it:'Cristiana',            es:'Cristiana',            pt:'Cristã',               hi:'क्रिश्चियन',             ja:'クリスチャン',        zh:'基督教',       ko:'기독교',              id:'Kristen',              ru:'Христианская' },

  // ── News / Talk family ──────────────────────────────────────────────────
  news:                 { en:'News',               fr:'Actualités',           ar:'أخبار',              de:'Nachrichten',          it:'Notizie',              es:'Noticias',             pt:'Notícias',             hi:'समाचार',                 ja:'ニュース',            zh:'新闻',         ko:'뉴스',                id:'Berita',               ru:'Новости' },
  'news-talk':          { en:'News & Talk',        fr:'Actu et débats',       ar:'أخبار وحوار',        de:'Nachrichten & Talk',   it:'News e talk',          es:'Noticias y diálogo',   pt:'Notícias e debate',    hi:'समाचार और चर्चा',         ja:'ニュース＆トーク',    zh:'新闻与谈话',   ko:'뉴스 토크',            id:'Berita & Talk',        ru:'Новости и разговоры' },
  talk:                 { en:'Talk',               fr:'Parlé',                ar:'حوار',               de:'Talk',                 it:'Parlato',              es:'Hablada',              pt:'Falada',               hi:'टॉक',                  ja:'トーク',              zh:'谈话',         ko:'토크',                id:'Bicara',               ru:'Разговор' },
  'local-news':         { en:'Local News',         fr:'Actualités locales',   ar:'أخبار محلية',        de:'Lokale Nachrichten',   it:'Notizie locali',       es:'Noticias locales',     pt:'Notícias locais',      hi:'स्थानीय समाचार',          ja:'ローカル・ニュース',  zh:'本地新闻',     ko:'지역 뉴스',            id:'Berita lokal',         ru:'Местные новости' },
  'sports-talk':        { en:'Sports Talk',        fr:'Débats sportifs',      ar:'حوار رياضي',         de:'Sport-Talk',           it:'Sport talk',           es:'Tertulia deportiva',   pt:'Debate esportivo',     hi:'खेल चर्चा',              ja:'スポーツ・トーク',    zh:'体育谈话',     ko:'스포츠 토크',          id:'Bincang olahraga',     ru:'Спортивные разговоры' },
  politics:             { en:'Politics',           fr:'Politique',            ar:'سياسة',              de:'Politik',              it:'Politica',             es:'Política',             pt:'Política',             hi:'राजनीति',                ja:'政治',                zh:'政治',         ko:'정치',                id:'Politik',              ru:'Политика' },
  business:             { en:'Business',           fr:'Affaires',             ar:'أعمال',              de:'Wirtschaft',           it:'Economia',             es:'Negocios',             pt:'Negócios',             hi:'व्यवसाय',                ja:'ビジネス',            zh:'商业',         ko:'비즈니스',             id:'Bisnis',               ru:'Бизнес' },

  // ── Sports ──────────────────────────────────────────────────────────────
  sports:               { en:'Sports',             fr:'Sports',               ar:'رياضة',              de:'Sport',                it:'Sport',                es:'Deportes',             pt:'Esportes',             hi:'खेल',                   ja:'スポーツ',            zh:'体育',         ko:'스포츠',              id:'Olahraga',             ru:'Спорт' },

  // ── Public service / Community ────────────────────────────────────────
  'public-radio':       { en:'Public Radio',       fr:'Radio publique',       ar:'إذاعة عامة',         de:'Öffentlicher Rundfunk',it:'Radio pubblica',       es:'Radio pública',        pt:'Rádio pública',        hi:'सार्वजनिक रेडियो',      ja:'公共ラジオ',          zh:'公共广播',     ko:'공영 라디오',          id:'Radio publik',         ru:'Общественное радио' },
  'community-radio':    { en:'Community Radio',    fr:'Radio communautaire',  ar:'إذاعة مجتمعية',      de:'Bürgerfunk',           it:'Radio comunitaria',    es:'Radio comunitaria',    pt:'Rádio comunitária',    hi:'सामुदायिक रेडियो',       ja:'コミュニティ・ラジオ', zh:'社区电台',     ko:'커뮤니티 라디오',      id:'Radio komunitas',      ru:'Общинное радио' },
  culture:              { en:'Culture',            fr:'Culture',              ar:'ثقافة',              de:'Kultur',               it:'Cultura',              es:'Cultura',              pt:'Cultura',              hi:'संस्कृति',               ja:'文化',                zh:'文化',         ko:'문화',                id:'Budaya',               ru:'Культура' },
  education:            { en:'Education',          fr:'Éducation',            ar:'تعليم',              de:'Bildung',              it:'Istruzione',           es:'Educación',            pt:'Educação',             hi:'शिक्षा',                ja:'教育',                zh:'教育',         ko:'교육',                id:'Pendidikan',           ru:'Образование' },
  podcast:              { en:'Podcast',            fr:'Podcast',              ar:'بودكاست',            de:'Podcast',              it:'Podcast',              es:'Podcast',              pt:'Podcast',              hi:'पॉडकास्ट',              ja:'ポッドキャスト',      zh:'播客',         ko:'팟캐스트',             id:'Podcast',              ru:'Подкаст' },

  // ── Comedy / Kids / Lifestyle ──────────────────────────────────────────
  comedy:               { en:'Comedy',             fr:'Humour',               ar:'كوميديا',            de:'Comedy',               it:'Commedia',             es:'Comedia',              pt:'Comédia',              hi:'कॉमेडी',                ja:'コメディ',            zh:'喜剧',         ko:'코미디',              id:'Komedi',               ru:'Комедия' },
  kids:                 { en:'Kids',               fr:'Enfants',              ar:'أطفال',              de:'Kinder',               it:'Bambini',              es:'Niños',                pt:'Infantil',             hi:'बच्चे',                  ja:'キッズ',              zh:'儿童',         ko:'어린이',              id:'Anak',                 ru:'Детское' },
  lifestyle:            { en:'Lifestyle',          fr:'Art de vivre',         ar:'نمط الحياة',         de:'Lifestyle',            it:'Lifestyle',            es:'Estilo de vida',       pt:'Estilo de vida',       hi:'जीवनशैली',              ja:'ライフスタイル',      zh:'生活方式',     ko:'라이프스타일',         id:'Gaya hidup',           ru:'Образ жизни' },

  // ── Misc ────────────────────────────────────────────────────────────────
  oldies:               { en:'Oldies',             fr:'Vieux tubes',          ar:'كلاسيكيات',          de:'Oldies',               it:'Vecchi successi',      es:'Clásicos',             pt:'Clássicos',            hi:'पुराने गाने',            ja:'オールディーズ',      zh:'怀旧金曲',     ko:'올디스',              id:'Lagu lawas',           ru:'Старые хиты' },
  retro:                { en:'Retro',              fr:'Rétro',                ar:'ريترو',              de:'Retro',                it:'Retrò',                es:'Retro',                pt:'Retrô',                hi:'रेट्रो',                ja:'レトロ',              zh:'复古',         ko:'레트로',              id:'Retro',                ru:'Ретро' },
  experimental:         { en:'Experimental',       fr:'Expérimental',         ar:'تجريبي',             de:'Experimentell',        it:'Sperimentale',         es:'Experimental',         pt:'Experimental',         hi:'प्रायोगिक',              ja:'実験的',              zh:'实验',         ko:'실험적',              id:'Eksperimental',        ru:'Экспериментальная' },
  party:                { en:'Party',              fr:'Soirée',               ar:'حفلة',               de:'Party',                it:'Festa',                es:'Fiesta',               pt:'Festa',                hi:'पार्टी',                ja:'パーティー',          zh:'派对',         ko:'파티',                id:'Pesta',                ru:'Вечеринка' },
  sleep:                { en:'Sleep',              fr:'Sommeil',              ar:'نوم',                de:'Schlaf',               it:'Sonno',                es:'Sueño',                pt:'Sono',                 hi:'नींद',                  ja:'スリープ',            zh:'睡眠',         ko:'수면',                id:'Tidur',                ru:'Сон' },

  // ── Decades ─────────────────────────────────────────────────────────────
  '50s':                { en:'50s',                fr:'Années 50',            ar:'الخمسينيات',         de:'50er',                 it:"Anni '50",             es:'Años 50',              pt:'Anos 50',              hi:'50 का दशक',             ja:'50年代',              zh:'50年代',       ko:'50년대',              id:'Era 50-an',            ru:'50-е' },
  '60s':                { en:'60s',                fr:'Années 60',            ar:'الستينيات',          de:'60er',                 it:"Anni '60",             es:'Años 60',              pt:'Anos 60',              hi:'60 का दशक',             ja:'60年代',              zh:'60年代',       ko:'60년대',              id:'Era 60-an',            ru:'60-е' },
  '70s':                { en:'70s',                fr:'Années 70',            ar:'السبعينيات',         de:'70er',                 it:"Anni '70",             es:'Años 70',              pt:'Anos 70',              hi:'70 का दशक',             ja:'70年代',              zh:'70年代',       ko:'70년대',              id:'Era 70-an',            ru:'70-е' },
  '80s':                { en:'80s',                fr:'Années 80',            ar:'الثمانينيات',        de:'80er',                 it:"Anni '80",             es:'Años 80',              pt:'Anos 80',              hi:'80 का दशक',             ja:'80年代',              zh:'80年代',       ko:'80년대',              id:'Era 80-an',            ru:'80-е' },
  '90s':                { en:'90s',                fr:'Années 90',            ar:'التسعينيات',         de:'90er',                 it:"Anni '90",             es:'Años 90',              pt:'Anos 90',              hi:'90 का दशक',             ja:'90年代',              zh:'90年代',       ko:'90년대',              id:'Era 90-an',            ru:'90-е' },
  '2000s':              { en:'2000s',              fr:'Années 2000',          ar:'الألفينات',          de:'2000er',               it:'Anni 2000',            es:'Años 2000',            pt:'Anos 2000',            hi:'2000 का दशक',           ja:'2000年代',            zh:'2000年代',     ko:'2000년대',            id:'Era 2000-an',          ru:'2000-е' },
  '2010s':              { en:'2010s',              fr:'Années 2010',          ar:'العقد الثاني',       de:'2010er',               it:'Anni 2010',            es:'Años 2010',            pt:'Anos 2010',            hi:'2010 का दशक',           ja:'2010年代',            zh:'2010年代',     ko:'2010년대',            id:'Era 2010-an',          ru:'2010-е' },
};

// ─────────────────────────────────────────────────────────────────────────
function main(): void {
  // Sanity: every canonical tag must have a row.
  const missing = CANONICAL_TAGS.filter((t) => !(t in TAG_TRANSLATIONS));
  if (missing.length) {
    console.error('[tag-i18n] missing translations for:', missing);
    process.exit(2);
  }
  const extra = Object.keys(TAG_TRANSLATIONS).filter((t) => !(CANONICAL_TAGS as readonly string[]).includes(t));
  if (extra.length) {
    console.error('[tag-i18n] unknown tags in TAG_TRANSLATIONS:', extra);
    process.exit(2);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const loc of SUPPORTED_LOCALES) {
    // Pivot: one row per locale, one entry per canonical tag.
    const out: Record<string, string> = {};
    for (const tag of CANONICAL_TAGS) {
      const row = TAG_TRANSLATIONS[tag];
      out[tag] = row[loc] ?? row.en;
    }
    const path = join(OUT_DIR, `${loc}.json`);
    writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
    console.log(`  ✓ ${loc}.json (${Object.keys(out).length} tags)`);
  }
}

main();
