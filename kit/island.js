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

  /** What one part of the island says, to tell a part that changed from one that did not. */
  const said = part => part.textContent.trim().replace(/\s+/g, ' ');

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
   * Grows or shrinks the island from the size it was to the size it is, and brings into focus the
   * parts it did not hold before.
   */
  function morph(from) {
    const island = bar();
    if (!island || !from || still()) return;
    const to = island.getBoundingClientRect();
    const held = new Set(from.held || []);
    const fresh = parts(island).filter(part => !held.has(said(part)) && part.textContent.trim());
    for (const part of parts(island)) part.style.opacity = '';
    for (const part of fresh)
      part.animate([{opacity: 0, filter: 'blur(5px)'}, {opacity: 1, filter: 'blur(0)'}],
        {duration: 420, delay: 120, easing: 'ease-out', fill: 'backwards'});
    if (Math.abs(to.width - from.width) < 1 && Math.abs(to.height - from.height) < 1) return;
    island.classList.add('morphing');
    // It moves as a drop of liquid does: drawn thin while it stretches, past its size for a moment,
    // then settled. The squeeze and the overshoot scale with how far it goes, so a page's name
    // changing in the wiki barely ripples while a jump between sites swells.
    const dw = to.width - from.width, dh = to.height - from.height;
    const squeeze = Math.min(6, Math.abs(dw) * 0.04), swell = Math.min(10, Math.abs(dw) * 0.05);
    const sign = dw >= 0 ? 1 : -1;
    const widths = [from.width, from.width + dw * 0.72, to.width + sign * swell, to.width];
    const heights = [from.height, Math.min(from.height, to.height) - squeeze + dh * 0.5, to.height + squeeze * 0.4, to.height];
    const offsets = [0, 0.42, 0.74, 1];
    const timing = {duration: 720, easing: 'cubic-bezier(.33,.8,.3,1)'};
    const growing = island.animate(offsets.map((offset, at) => ({offset, width: widths[at] + 'px', height: heights[at] + 'px'})), timing);
    // What the island holds stays where it ends while the island grows round it, from the middle;
    // the brand and the theme button, its two ends, ride its edges instead, frame for frame, so
    // neither is cut off by an edge on the way and both are where the eye expects them.
    const all = parts(island);
    const ends = [[all[0], 1], [all[all.length - 1], -1]];
    for (const [part, side] of ends) if (part && all.length > 1 && Math.abs(dw) >= 1) {
      part.classList.add('riding');
      part.animate(offsets.map((offset, at) => ({offset, transform: `translateX(${side * (to.width - widths[at]) / 2}px)`})), timing)
        .finished.finally(() => part.classList.remove('riding'));
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

  return {measure, morph, around};
})();
