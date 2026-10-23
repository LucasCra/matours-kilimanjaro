import { clamp01 } from './camera';
import { CHAPTERS, DAY_TICKS, FINALE, HERO, STARS_FADE, SUMMITS, photoUrl, type Chapter } from './content';
import { formatMetres } from './map';

const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// Neighbouring chapter cards sit on opposite sides, so they cross-fade: the next card fades in
// before the boundary, both stay together briefly, then the previous one fades out.
// Sized for the 3600vh track: 0.007 of progress ≈ 270 px of scroll.
const CARD_IN = 0.007;
const CARD_TOGETHER = 0.004;
const CARD_OUT = 0.007;

// Photos run on a two-slot strip: each new photo fills the next slot; once both are taken,
// the strip moves up one slot, the oldest photo fades out at the top and the new one enters below.
const PHOTO_IN = 0.01;
const PHOTO_SLOTS = 2;
const PHOTO_FRAME = 234; // 200px image + caption strip, matches .photo in styles.css
const PHOTO_GAP = 12;
const PHOTO_STEP = PHOTO_FRAME + PHOTO_GAP;
const PHOTO_RISE = 24;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function show(node: HTMLElement, opacity: number, transform = '') {
  node.style.opacity = String(opacity);
  node.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
  if (transform) node.style.transform = transform;
}

interface CardView {
  node: HTMLElement;
  fadeIn: [number, number];
  fadeOut: [number, number];
  strip: HTMLElement | null;
  photos: { node: HTMLElement; at: number }[];
}

function buildCard(c: Chapter, index: number): CardView {
  const node = el('article', `card card-${c.side}${c.wide ? ' card-wide' : ''}`);
  node.append(el('p', 'eyebrow', c.eyebrow), el('h2', 'card-title', c.title));
  if (c.stats) node.append(el('p', 'stats', c.stats));
  node.append(el('p', 'body', c.body));

  if (c.zones) {
    const ul = el('ul', 'zones');
    for (const z of c.zones) ul.append(el('li', '', z));
    node.append(ul);
  }
  if (c.facts) {
    const wrap = el('div', 'facts');
    for (const f of c.facts) wrap.append(el('p', 'fact', f));
    node.append(wrap);
  }
  if (c.details) {
    const dl = el('dl', 'details');
    for (const [k, v] of c.details) dl.append(el('dt', '', k), el('dd', '', v));
    node.append(dl);
  }

  let strip: HTMLElement | null = null;
  const photos: CardView['photos'] = [];
  if (c.photos?.length) {
    const slots = Math.min(PHOTO_SLOTS, c.photos.length);
    const deck = el('div', 'deck');
    deck.style.height = `${slots * PHOTO_STEP - PHOTO_GAP}px`;
    strip = el('div', 'strip');
    c.photos.forEach((ph, i) => {
      const fig = el('figure', 'photo');
      fig.style.top = `${i * PHOTO_STEP}px`;
      const img = el('img');
      img.src = photoUrl(ph.seed);
      img.alt = ph.caption;
      img.loading = 'eager';
      img.width = 300;
      img.height = 200;
      fig.append(img, el('figcaption', '', ph.caption));
      strip!.append(fig);
      photos.push({ node: fig, at: ph.at });
    });
    deck.append(strip);
    node.append(deck);
  }

  // The first card follows the hero and the last one precedes the centred summit moment,
  // so those two edges stay inside the chapter window instead of overlapping a neighbour.
  const first = index === 0;
  const last = index === CHAPTERS.length - 1;
  const fadeIn: [number, number] = first ? [c.from, c.from + CARD_IN] : [c.from - CARD_IN, c.from];
  const fadeOut: [number, number] = last
    ? [c.to - CARD_OUT, c.to]
    : [c.to + CARD_TOGETHER, c.to + CARD_TOGETHER + CARD_OUT];
  return { node, fadeIn, fadeOut, strip, photos };
}

function drawStars(canvas: HTMLCanvasElement) {
  const dpr = devicePixelRatio || 1;
  const w = screen.width;
  const h = screen.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 400; i++) {
    ctx.globalAlpha = 0.4 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface UI {
  update(p: number): void;
  setAltitude(metres: number | null): void;
}

export function buildUI(root: HTMLElement, stars: HTMLElement): UI {
  const starCanvas = stars.querySelector('canvas')!;
  drawStars(starCanvas);

  // Hero
  const hero = el('section', 'hero');
  hero.append(el('p', 'eyebrow', HERO.eyebrow), el('h1', 'hero-title', HERO.title), el('p', 'hero-sub', HERO.subtitle));
  const hint = el('div', 'scroll-hint');
  hint.append(el('span', '', HERO.hint), el('span', 'chevron'));
  hero.append(hint);

  // Chapter cards
  const cards = CHAPTERS.map(buildCard);

  // Summit moments
  const vignette = el('div', 'vignette');
  const summits = SUMMITS.map((s) => {
    const node = el('section', 'summit');
    node.append(el('h2', 'summit-title', s.title), el('p', 'summit-sub', s.sub));
    return { node, s };
  });

  // Finale + CTA
  const day6 = el('section', 'day6');
  const cta = el('a', 'cta', FINALE.cta);
  cta.href = FINALE.href;
  day6.append(
    el('p', 'eyebrow', FINALE.eyebrow),
    el('h2', 'card-title', FINALE.title),
    el('p', 'body', FINALE.body),
    cta,
    el('p', 'footer', FINALE.footer),
  );

  // Progress bar, day ticks, altitude
  const bar = el('div', 'progress');
  const fill = el('div', 'progress-fill');
  bar.append(fill);
  for (const [at, label] of DAY_TICKS) {
    const tick = el('div', 'tick');
    tick.style.left = `${at * 100}%`;
    tick.append(el('span', '', label));
    bar.append(tick);
  }
  const altitude = el('div', 'altitude');

  root.append(vignette, hero, ...cards.map((c) => c.node), ...summits.map((x) => x.node), day6, altitude, bar);

  let lastAltitude = '';

  return {
    update(p) {
      show(starCanvas, 1 - ramp(p, STARS_FADE[0], STARS_FADE[1]));
      show(hero, 1 - ramp(p, HERO.fadeOut[0], HERO.fadeOut[1]));

      // Summit headlines sit in the middle of the screen; side cards step aside while they show.
      let flash = 0;
      let summitOn = 0;
      for (const { node, s } of summits) {
        const sIn = ramp(p, s.fadeIn[0], s.fadeIn[1]);
        const o = Math.min(sIn, 1 - ramp(p, s.fadeOut[0], s.fadeOut[1]));
        show(node, o);
        summitOn = Math.max(summitOn, o);
        flash = Math.max(flash, Math.sin(Math.PI * sIn));
      }
      show(vignette, flash);

      for (const { node, fadeIn, fadeOut, strip, photos } of cards) {
        const fi = ramp(p, fadeIn[0], fadeIn[1]);
        const o = Math.min(fi, 1 - ramp(p, fadeOut[0], fadeOut[1])) * (1 - summitOn);
        show(node, o, `translateY(calc(-50% + ${(24 * (1 - fi)).toFixed(2)}px))`);
        if (!strip) continue;
        const enter = photos.map((ph) => ramp(p, ph.at, ph.at + PHOTO_IN));
        let shift = 0;
        for (let j = PHOTO_SLOTS; j < enter.length; j++) shift += enter[j];
        strip.style.transform = `translateY(${(-shift * PHOTO_STEP).toFixed(2)}px)`;
        photos.forEach((ph, j) => {
          const leave = enter[j + PHOTO_SLOTS] ?? 0;
          show(ph.node, enter[j] * (1 - leave), `translateY(${(PHOTO_RISE * (1 - enter[j])).toFixed(2)}px)`);
        });
      }

      const d6 = ramp(p, FINALE.fadeIn[0], FINALE.fadeIn[1]);
      show(day6, d6, `translate(-50%, calc(-50% + ${(24 * (1 - d6)).toFixed(2)}px))`);
      cta.style.pointerEvents = d6 > 0.5 ? 'auto' : 'none';

      fill.style.transform = `scaleX(${p})`;
    },
    setAltitude(metres) {
      const text = metres == null ? '' : formatMetres(Math.round(metres / 10) * 10);
      if (text !== lastAltitude) {
        altitude.textContent = lastAltitude = text;
        show(altitude, text ? 1 : 0);
      }
    },
  };
}
