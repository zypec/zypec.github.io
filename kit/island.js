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
    const growing = island.animate([{width: from.width + 'px', height: from.height + 'px'},
      {width: to.width + 'px', height: to.height + 'px'}], {duration: 600, easing: 'cubic-bezier(.2,.9,.2,1.12)'});
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
    const arrive = () => fonts().then(() => requestAnimationFrame(() => {
      island.style.width = island.style.height = '';
      island.classList.remove('morphing');
      morph(left);
    }));
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', arrive, {once: true});
    else arrive();
  }

  // Scrolled into the page, the island draws in a little; back at the top it is full size again.
  const scrolled = () => document.documentElement.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', scrolled, {passive: true});
  scrolled();

  return {measure, morph, around};
})();
