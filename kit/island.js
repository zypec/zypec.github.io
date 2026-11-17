/*
 * The bar at the top of every page is an island, and an island changes size by growing or shrinking,
 * never by jumping. Leaving a page it says how big it was; the next page of the same site, the
 * front page, the statistics or the wiki, opens its own island at that size and springs to its
 * own. Only what the new island holds that the old one did not comes into focus as it does: the
 * links and the theme switch that are the same on both stay where the eye left them. The wiki does
 * the same between its pages, where only the page's name in the island is written again.
 *
 * The size it springs to is taken once the page's fonts are in: measured before, the brand's own
 * letters (a web font) widened it once the morph was over, a jump at the end.
 *
 * A view transition would do this in some browsers and not others, and one across pages was dropped
 * by Chrome whenever the new page had work to do before it first drew, which the wiki always has.
 * This is the same everywhere, and with reduced motion it does nothing.
 */
const Island = (() => {
  const KEY = 'zypec-island';
  const bar = () => document.querySelector('body > header');
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * What one part of the island says, to tell a part that changed from one that did not. The theme
   * switch is the same part on every page whatever it says: its words are written by a script at the
   * end of the page, so read before that it looked new, waited unseen and then appeared at once.
   */
  const said = part => part.matches('#theme, #themed') ? '#theme' : part.textContent.trim().replace(/\s+/g, ' ');

  /** The parts of the island, its links taken one by one rather than as the row holding them. */
  function parts(island) {
    return [...island.children].flatMap(part => part.matches('nav, .links') ? [...part.children] : [part]);
  }

  /** The island's size now, and what it holds, to morph from after something changes it. */
  function measure() {
    const island = bar();
    if (!island) return null;
    const box = island.getBoundingClientRect();
    return {width: box.width, height: box.height, held: parts(island).map(said)};
  }

  /**
   * The island's two ends, the brand and the theme switch, which ride its edges while it changes size.
   */
  function ends(island) {
    const all = parts(island);
    return all.length > 1 ? [[all[0], 1], [all[all.length - 1], -1]] : [];
  }

  /** Sets an end at the island's edge while the island is {@code width} wide and what it holds {@code natural}. */
  function ride(part, side, natural, width) {
    part.classList.add('riding');
    Object.assign(part.style, {position: 'relative', left: side * (natural - width) / 2 + 'px'});
  }

  /**
   * Holds the two ends against the island's edges while it is held at the last page's size, worked out
   * from where they are rather than from how wide what the island holds is: the wiki fills its links
   * and the page's name in while it is held, and an end placed for what it held before was left off
   * the edge until the morph began. What an end is drawn over meanwhile is not shown.
   */
  function pin(island, held) {
    const box = island.getBoundingClientRect(), style = getComputedStyle(island);
    const both = ends(island);
    for (const [part, side] of both) {
      const now = parseFloat(part.style.left) || 0, at = part.getBoundingClientRect();
      const edge = side > 0 ? box.left + parseFloat(style.paddingLeft) - (at.left - now)
        : box.right - parseFloat(style.paddingRight) - (at.right - now);
      part.style.left = edge + 'px';
    }
    if (both.length < 2) return;
    const inner = [both[0][0].getBoundingClientRect().right, both[1][0].getBoundingClientRect().left];
    for (const part of parts(island)) {
      if (part === both[0][0] || part === both[1][0]) continue;
      const at = part.getBoundingClientRect();
      part.style.opacity = !held.has(said(part)) || at.left < inner[0] || at.right > inner[1] ? '0' : '';
    }
  }

  /** The ride each end is on now, so one that a later morph took over does not land it. */
  const rides = new WeakMap();

  function land(part) {
    part.classList.remove('riding');
    Object.assign(part.style, {position: '', left: ''});
  }

  /**
   * How far through a morph (on the keyframes' own scale) the island first reaches {@code width}, or 0
   * where it is that wide from the start.
   */
  function reached(width, widths, offsets) {
    if (width <= widths[0]) return 0;
    for (let at = 1; at < widths.length; at++)
      if (width <= widths[at])
        return offsets[at - 1] + (width - widths[at - 1]) / (widths[at] - widths[at - 1]) * (offsets[at] - offsets[at - 1]);
    return 1;
  }

  /**
   * Grows or shrinks the island from the size it was to the size it is, and brings into focus the
   * parts it did not hold before.
   */
  function morph(from) {
    const island = bar();
    if (!island || !from || still()) return;
    const to = island.getBoundingClientRect();
    const held = new Set(from.held || []);
    const all = parts(island);
    const fresh = new Set(all.filter(part => !held.has(said(part)) && part.textContent.trim()));
    for (const part of all) part.style.opacity = '';
    const dw = to.width - from.width, dh = to.height - from.height;
    if (Math.abs(dw) < 1 && Math.abs(dh) < 1) {
      for (const part of fresh)
        part.animate([{opacity: 0, filter: 'blur(5px)'}, {opacity: 1, filter: 'blur(0)'}],
          {duration: 420, delay: 120, easing: 'ease-out', fill: 'backwards'});
      if (!island.style.width) for (const [part] of ends(island)) land(part);
      return;
    }
    // Where each end comes to rest, against where morphing lays it out at the island's final size:
    // morphing, the links are laid out whole, while at rest they scroll inside a narrow island and
    // the theme button sticks to its visible edge. The ride ends where it rests, or it rode to the end
    // of the links, past the edge, and jumped back once the morph was over.
    const shifts = new Map();
    for (const [part, side] of ends(island)) {
      land(part);
      const rest = part.getBoundingClientRect().left;
      island.classList.add('morphing');
      ride(part, side, to.width, to.width);
      shifts.set(part, rest - part.getBoundingClientRect().left);
      island.classList.remove('morphing');
      land(part);
    }
    island.classList.add('morphing');
    // It moves as a drop of liquid does: drawn thin while it stretches, past its size for a moment,
    // then settled. The squeeze and the overshoot scale with how far it goes, so a page's name
    // changing in the wiki barely ripples while a jump between sites swells.
    const squeeze = Math.min(6, Math.abs(dw) * 0.04), swell = Math.min(10, Math.abs(dw) * 0.05);
    const sign = dw >= 0 ? 1 : -1;
    const widths = [from.width, from.width + dw * 0.72, to.width + sign * swell, to.width];
    const heights = [from.height, Math.min(from.height, to.height) - squeeze + dh * 0.5, to.height + squeeze * 0.4, to.height];
    const offsets = [0, 0.42, 0.74, 1];
    const timing = {duration: 720, easing: 'cubic-bezier(.33,.8,.3,1)'};
    const growing = island.animate(offsets.map((offset, at) => ({offset, width: widths[at] + 'px', height: heights[at] + 'px'})), timing);
    // What the island holds stays where it ends while the island grows round it, from the middle;
    // the brand and the theme button, its two ends, ride its edges instead, so neither is cut off by
    // an edge on the way and both are where the eye expects them. They are moved by layout, as the
    // island's own size is, so both are worked out in the same frame: moved on the compositor, an end
    // ran ahead of the edge or fell behind it whenever the page had work to do.
    const both = Math.abs(dw) >= 1 ? ends(island) : [];
    if (!both.length) for (const [part] of ends(island)) land(part);
    for (const [part, side] of both) {
      const shift = shifts.get(part) || 0;
      ride(part, side, to.width, from.width);
      part.style.left = parseFloat(part.style.left) + shift + 'px';
      const riding = part.animate(offsets.map((offset, at) => ({offset, left: shift + side * (to.width - widths[at]) / 2 + 'px'})), timing);
      rides.set(part, riding);
      riding.finished.finally(() => { if (rides.get(part) === riding) land(part); });
    }
    // An end rides over whatever lies between it and the edge while the island grows, and the glass
    // cannot blur what is inside the island itself. So nothing is drawn under an end: each part waits
    // unseen until the island is wide enough for the ends to have passed it, worked out on the same
    // keyframes as the island's width, and comes in then. What the island did not hold before comes
    // into focus as it does.
    const style = getComputedStyle(island), middle = to.left + to.width / 2;
    const reach = both.length < 2 || dw <= 0 ? null : [
      parseFloat(style.paddingLeft) + both[0][0].getBoundingClientRect().width,
      parseFloat(style.paddingRight) + both[1][0].getBoundingClientRect().width];
    for (const part of all) {
      if (both.some(([end]) => end === part)) {
        if (fresh.has(part))
          part.animate([{opacity: 0, filter: 'blur(5px)'}, {opacity: 1, filter: 'blur(0)'}],
            {duration: 420, delay: 120, easing: 'ease-out', fill: 'backwards'});
        continue;
      }
      const at = part.getBoundingClientRect();
      const clear = reach ? reached(Math.max(2 * (middle - at.left + reach[0]), 2 * (at.right - middle + reach[1])), widths, offsets) : 0;
      const start = Math.min(0.9, Math.max(clear, fresh.has(part) ? 0.17 : 0));
      if (start <= 0) continue;
      const blur = fresh.has(part) ? 'blur(5px)' : 'blur(0)';
      part.animate([{offset: 0, opacity: 0, filter: blur}, {offset: start, opacity: 0, filter: blur},
        {offset: Math.min(1, start + (fresh.has(part) ? 0.35 : 0.14)), opacity: 1, filter: 'blur(0)'}], timing);
    }
    growing.finished.finally(() => island.classList.remove('morphing'));
  }

  /** A change of the page drawn as the island morphing to fit whatever the change put in it. */
  function around(change) {
    const from = measure();
    change();
    morph(from);
  }

  /** The page's fonts, waited for no longer than a moment. */
  const fonts = () => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(done => setTimeout(done, 500))]);

  addEventListener('pagehide', () => {
    const size = measure();
    try { if (size) sessionStorage.setItem(KEY, JSON.stringify(Object.assign(size, {at: Date.now()}))); } catch (blocked) {}
  });

  // Read right after the bar, before the page first draws: the island is held at the size the last
  // page left it, and morphs to its own once everything that fills it (the wiki's links) is in.
  let left = null;
  try {
    left = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    sessionStorage.removeItem(KEY);
  } catch (blocked) {}
  const island = bar();
  if (island && left && Date.now() - left.at < 4000 && !still()) {
    island.classList.add('morphing');
    island.style.width = left.width + 'px';
    island.style.height = left.height + 'px';
    // What the last island did not hold waits unseen, or the page's first frame showed it before it
    // faded in.
    const held = new Set(left.held || []);
    for (const part of parts(island)) if (!held.has(said(part))) part.style.opacity = '0';
    for (const [part, side] of ends(island)) ride(part, side, 0, 0);
    const holding = () => {
      if (!island.style.width) return;
      pin(island, held);
      requestAnimationFrame(holding);
    };
    holding();
    // The size it is held at is let go of with its transitions off, so what it is measured at is the
    // size it settles at: let go of with them on, the height was caught half way, and the rest of
    // its transition showed as a jump once the morph was over.
    const arrive = () => fonts().then(() => requestAnimationFrame(() => {
      island.style.transition = 'none';
      island.style.width = island.style.height = '';
      island.classList.remove('morphing');
      morph(left);
      island.getBoundingClientRect();
      island.style.transition = '';
    }));
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', arrive, {once: true});
    else arrive();
  }

  // Scrolled into the page, the island draws in a little; back at the top it is full size again.
  const scrolled = () => document.documentElement.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', scrolled, {passive: true});
  scrolled();

  // Links too many for a narrow island scroll inside it; the fade at the end says there are more,
  // and goes once the last of them is in view.
  const links = document.querySelector('header nav');
  const overflows = () => {
    if (!links) return;
    links.classList.toggle('overflows', links.scrollWidth - links.clientWidth - links.scrollLeft > 2);
  };
  if (links) {
    links.addEventListener('scroll', overflows, {passive: true});
    addEventListener('resize', overflows);
    addEventListener('load', overflows);
    overflows();
  }

  /**
   * The liquid in the glass, three ways. Where the browser draws an SVG filter behind an element
   * (Chromium), the island bends what lies under its rim as a lens of water does, over a light blur that keeps it
   * seen rather than the frosted one that hid it: a map drawn at the
   * island's own size pushes each point of a band along the rim outward, so the page beyond the edge
   * is drawn in it, pressed together. Elsewhere the frosted glass stays as it is. Its sheen follows
   * the pointer over it, and a press squeezes it, as a drop gives under a finger.
   */
  (() => {
    const island = bar();
    if (!island || still()) return;

    const brands = navigator.userAgentData && navigator.userAgentData.brands || [];
    if (brands.some(one => /Chromium/.test(one.brand))) {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.position = 'absolute';
      svg.innerHTML = '<filter id="kit-liquid" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
        + '<feImage x="0" y="0" preserveAspectRatio="none" result="map"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="map" scale="44" xChannelSelector="R" yChannelSelector="G"/></filter>';
      document.body.appendChild(svg);
      const image = svg.querySelector('feImage');

      /**
       * The map for a capsule this size: neutral inside, along the rim a push outward that grows to the
       * edge. Drawn as soon as the page opens, whatever the island is doing, so the lens is on from the
       * first frame rather than turned on at the end of a morph; again once a morph or a resize is
       * over. The lens waits for a map: a filter with no image is no filter, and the browser then drops
       * the whole backdrop, the glass with it.
       */
      const draw = (w, h) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const pen = canvas.getContext('2d');
        const pixels = pen.createImageData(w, h);
        const r = h / 2, band = Math.min(18, r);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const cx = Math.min(Math.max(x + 0.5, r), w - r);
          let dx = x + 0.5 - cx, dy = y + 0.5 - r;
          const reach = Math.hypot(dx, dy), inside = r - reach;
          let push = 0;
          if (reach > 0 && inside < band) {
            const t = 1 - Math.max(0, inside) / band;
            push = t * t;
            dx /= reach;
            dy /= reach;
          }
          const at = (y * w + x) * 4;
          pixels.data[at] = 128 + dx * push * 127;
          pixels.data[at + 1] = 128 + dy * push * 127;
          pixels.data[at + 2] = 128;
          pixels.data[at + 3] = 255;
        }
        pen.putImageData(pixels, 0, 0);
        image.setAttribute('width', w);
        image.setAttribute('height', h);
        image.setAttribute('href', canvas.toDataURL());
      };
      let drawn = '';
      const fit = () => {
        if (drawn && island.classList.contains('morphing')) return;
        const box = island.getBoundingClientRect(), w = Math.round(box.width), h = Math.round(box.height);
        if (!w || !h || drawn === w + 'x' + h) return;
        drawn = w + 'x' + h;
        draw(w, h);
        document.documentElement.classList.add('refracts');
      };
      fit();
      new ResizeObserver(() => requestAnimationFrame(fit)).observe(island);
      new MutationObserver(() => requestAnimationFrame(fit)).observe(island, {attributes: true, attributeFilter: ['class', 'style']});
    }

    island.addEventListener('pointermove', event => {
      const box = island.getBoundingClientRect();
      island.style.setProperty('--lx', (event.clientX - box.left) + 'px');
      island.style.setProperty('--ly', (event.clientY - box.top) + 'px');
    }, {passive: true});

    island.addEventListener('pointerdown', () => island.animate([
      {transform: 'scale(1, 1)'}, {transform: 'scale(1.018, .93)', offset: .3},
      {transform: 'scale(.994, 1.025)', offset: .65}, {transform: 'scale(1, 1)'}],
      {duration: 560, easing: 'cubic-bezier(.2,.9,.2,1)', composite: 'add'}), {passive: true});
  })();

  return {measure, morph, around};
})();
