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
 * A capsule behind one of its links marks the page or the section being read, and slides from link to
 * link as the reader moves on (Mark, below). The site's name is never marked.
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

  /**
   * The parts of the island, its links taken one by one rather than as the row holding them. The mark
   * behind the page being read is not one: it is drawn behind them, not held by the island.
   */
  function parts(island) {
    return [...island.children].filter(part => !part.matches('.islandmark'))
      .flatMap(part => part.matches('nav, .links') ? [...part.children] : [part]);
  }

  /**
   * The island's size now, what it holds and which of it is marked as the page being read, to morph
   * from after something changes it.
   */
  function measure() {
    const island = bar();
    if (!island) return null;
    const box = island.getBoundingClientRect();
    const marked = current();
    return {width: box.width, height: box.height, held: parts(island).map(said), mark: marked ? said(marked) : null};
  }

  /**
   * Scrolled into the page, the island draws in a little; back at the top it is full size again. Set
   * before a morph measures where it is going, too: a page that opens at the top while the last one
   * was scrolled took the island's drawn-in height as its size, and grew again once the morph was over.
   */
  const scrolled = () => document.documentElement.classList.toggle('scrolled', scrollY > 24);

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
   * The morph under way, so one that starts before it is over takes over from it rather than running
   * under it: left to finish, the first took the morphing look off the island half way through the
   * second, and the size the second was going to had been measured with the first still pulling at
   * it, so the island jumped once both were done.
   */
  let morphs = 0, running = [];

  function stop(island) {
    for (const animation of running) animation.cancel();
    running = [];
    island.classList.remove('morphing');
  }

  /**
   * Grows or shrinks the island from the size it was to the size it is, and brings into focus the
   * parts it did not hold before. The size it goes to is measured with its own transitions off, as
   * it will stand once they are over.
   */
  function morph(from) {
    const island = bar();
    if (!island || !from || still()) return null;
    const turn = ++morphs;
    stop(island);
    island.style.transition = 'none';
    scrolled();
    const to = island.getBoundingClientRect();
    island.getBoundingClientRect();
    island.style.transition = '';
    const held = new Set(from.held || []);
    const all = parts(island);
    const fresh = new Set(all.filter(part => !held.has(said(part)) && part.textContent.trim()));
    for (const part of all) part.style.opacity = '';
    const dw = to.width - from.width, dh = to.height - from.height;
    if (Math.abs(dw) < 1 && Math.abs(dh) < 1) {
      for (const part of fresh)
        running.push(part.animate([{opacity: 0, filter: 'blur(5px)'}, {opacity: 1, filter: 'blur(0)'}],
          {duration: 420, delay: 120, easing: 'ease-out', fill: 'backwards'}));
      if (!island.style.width) for (const [part] of ends(island)) land(part);
      Mark.from(from.mark);
      return null;
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
    running.push(growing);
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
      running.push(riding);
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
          running.push(part.animate([{opacity: 0, filter: 'blur(5px)'}, {opacity: 1, filter: 'blur(0)'}],
            {duration: 420, delay: 120, easing: 'ease-out', fill: 'backwards'}));
        continue;
      }
      const at = part.getBoundingClientRect();
      const clear = reach ? reached(Math.max(2 * (middle - at.left + reach[0]), 2 * (at.right - middle + reach[1])), widths, offsets) : 0;
      const start = Math.min(0.9, Math.max(clear, fresh.has(part) ? 0.17 : 0));
      if (start <= 0) continue;
      const blur = fresh.has(part) ? 'blur(5px)' : 'blur(0)';
      running.push(part.animate([{offset: 0, opacity: 0, filter: blur}, {offset: start, opacity: 0, filter: blur},
        {offset: Math.min(1, start + (fresh.has(part) ? 0.35 : 0.14)), opacity: 1, filter: 'blur(0)'}], timing));
    }
    Mark.follow(growing, from.mark);
    growing.finished.then(() => {
      if (turn !== morphs) return;
      island.classList.remove('morphing');
      running = [];
    }, () => {});
    return growing;
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

  /**
   * How long the size the last page left stays worth morphing from. The wiki has a good deal to read
   * before it draws, and over a slow line it took longer than a few seconds, so its island opened at
   * its own size at once.
   */
  const FRESH = 12000;

  function leftBehind() {
    try {
      const left = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      sessionStorage.removeItem(KEY);
      return left && Date.now() - left.at < FRESH ? left : null;
    } catch (blocked) {
      return null;
    }
  }

  // A page the browser kept and brings back as it was (the back button) runs none of this again, so
  // its island stood at its own size at once, the one change of page that jumped. It morphs from the
  // size of the page it comes back from like any other.
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    const left = leftBehind();
    if (left) morph(left);
    else Mark.place(true);
  });

  /**
   * The page being read, marked by a soft capsule behind its link in the island: the link of the
   * section scrolled to, the link marked {@code on} on a page of its own, or what the page names with
   * {@link Island.mark} (the wiki, whose pages are not sections). Moving to another page or section it
   * slides from the link it was behind to the new one, and coming from another page it starts behind
   * the link that page had marked, if this island has it.
   *
   * The site's name, at the island's left end, is never marked: at the top of a front page, where no
   * section is being read yet, the capsule is not drawn at all. Marked, the name read as one more
   * link, and the capsule leapt the length of the island the moment the page was scrolled.
   */
  let named = undefined;

  /** The site's name, the island's first part. */
  const brand = island => parts(island)[0];

  const page = path => path.replace(/index\.html$/, '');

  function same(link) {
    const url = new URL(link.href, location.href);
    return url.origin === location.origin && page(url.pathname) === page(location.pathname) ? url : null;
  }

  function current() {
    const island = bar();
    if (!island) return null;
    if (named !== undefined) return named;
    const links = [...island.querySelectorAll('a[href]')].filter(link => link !== brand(island));
    const atFoot = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    let read = null, top = -Infinity;
    for (const link of links) {
      const url = same(link);
      if (!url || !url.hash) continue;
      const section = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!section) continue;
      const at = section.getBoundingClientRect().top;
      if ((at <= innerHeight * 0.35 || (atFoot && at < innerHeight)) && at > top) { read = link; top = at; }
    }
    if (read) return read;
    const on = island.querySelector('a.on, a[aria-current="page"]');
    if (on) return on;
    return links.find(link => { const url = same(link); return url && !url.hash; }) || null;
  }

  const Mark = (() => {
    let mark = null, shown = null, following = false, follows = 0;

    function element() {
      const island = bar();
      if (!island) return null;
      if (!mark || !mark.isConnected) {
        mark = document.createElement('span');
        mark.className = 'islandmark';
        mark.setAttribute('aria-hidden', 'true');
        island.prepend(mark);
      }
      return mark;
    }

    /**
     * The capsule a part is marked by, in the island's own frame: a link's own pill, the name widened to
     * one by no more than half the space between it and the next part, so the two never touch. Its
     * height is placed as a share of the island's, so it stays centered on the part while the island
     * draws in, and on its own row where a phone lays the island out in two.
     */
    function box(part) {
      const island = bar(), at = part.getBoundingClientRect(), frame = island.getBoundingClientRect();
      if (!at.width) return null;
      const sized = [...island.querySelectorAll('nav a, .links a, #theme, #themed')].find(one => one.getBoundingClientRect().height);
      const height = Math.max(at.height, sized ? sized.getBoundingClientRect().height : 40);
      const gap = parseFloat(getComputedStyle(island).columnGap) || 24;
      const pad = part.matches('nav a, .links a') ? 0 : Math.min(12, gap / 2);
      return {left: at.left - frame.left - pad, width: at.width + 2 * pad, height,
        middle: (at.top - frame.top + at.height / 2) / frame.height * 100};
    }

    /**
     * Draws the capsule behind {@code part}, or hides it with none. One that was hidden is set behind
     * its part before it fades in, rather than sliding there from wherever it was last seen.
     */
    function draw(part, instant) {
      const capsule = element();
      if (!capsule) return;
      const shape = part ? box(part) : null;
      const appearing = !instant && shape && capsule.style.opacity !== '1';
      if (instant || appearing) capsule.style.transition = 'none';
      if (shape) Object.assign(capsule.style, {width: shape.width + 'px', height: shape.height + 'px', top: shape.middle + '%',
        marginTop: -shape.height / 2 + 'px', transform: `translateX(${shape.left}px)`});
      if (appearing) { capsule.getBoundingClientRect(); capsule.style.transition = ''; }
      capsule.style.opacity = shape ? '1' : '0';
      if (instant) { capsule.getBoundingClientRect(); capsule.style.transition = ''; }
      shown = part;
    }

    /**
     * Puts the capsule where it belongs, sliding there unless {@code instant}. A part a phone hides (the
     * gallery's link) leaves it hidden.
     */
    function place(instant) {
      if (following) return;
      draw(shownFor(current()), instant);
    }

    const shownFor = part => part && part.getBoundingClientRect().width ? part : null;

    /** The part the last island had marked, in this one. */
    function byText(text) {
      const island = bar();
      return text && island ? parts(island).find(part => part !== brand(island) && said(part) === text && part.matches('a')) || null : null;
    }

    /**
     * Rides with the island while it changes size, behind the part the old island had marked, and slides
     * to the part this page marks once the island has settled.
     */
    function follow(growing, text) {
      const start = shownFor(byText(text) || current());
      const turn = ++follows;
      following = true;
      const step = () => {
        if (turn !== follows) return;
        draw(start, true);
        requestAnimationFrame(step);
      };
      step();
      // A frame after the island has settled, once its ends have landed and it has lost its morphing
      // look: measured the moment the morph was over, the name was still riding the edge and the
      // capsule was left beside it.
      growing.finished.then(() => requestAnimationFrame(() => {
        if (turn !== follows) return;
        follows++;
        following = false;
        place();
      }), () => {});
    }

    /** Slides from the part the island had marked before a change in place to the one marked now. */
    function from(text) {
      follows++;
      following = false;
      const start = byText(text);
      if (start && start !== shownFor(current())) {
        draw(start, true);
        requestAnimationFrame(() => place());
      } else place(true);
    }

    return {place, follow, from, get shown() { return shown; }};
  })();

  /**
   * Names the part of the island the page being read is, or with none (or the site's name) marks
   * nothing; with {@code undefined} it goes back to finding it by itself.
   */
  function markPart(part) {
    const island = bar();
    named = part === undefined ? undefined : part && island && part !== brand(island) ? part : null;
    Mark.place();
  }

  // Read right after the bar, before the page first draws: the island is held at the size the last
  // page left it, and morphs to its own once everything that fills it (the wiki's links) is in.
  const left = leftBehind();
  const island = bar();
  if (island && left && !still()) {
    island.classList.add('morphing');
    island.style.width = left.width + 'px';
    island.style.height = left.height + 'px';
    // What the last island did not hold waits unseen, or the page's first frame showed it before it
    // faded in.
    const held = new Set(left.held || []);
    for (const part of parts(island)) if (!held.has(said(part))) part.style.opacity = '0';
    for (const [part, side] of ends(island)) ride(part, side, 0, 0);
    // Pinned again whenever what the island holds changes, before that change is drawn: pinned only
    // once a frame, a page's name the wiki wrote in showed for a frame before it was hidden to come
    // into focus, so it seemed to arrive twice.
    const watch = new MutationObserver(() => { if (island.style.width) pin(island, held); });
    watch.observe(island, {childList: true, subtree: true, characterData: true});
    const holding = () => {
      if (!island.style.width) { watch.disconnect(); return; }
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
      if (!morph(left)) Mark.place(true);
      island.getBoundingClientRect();
      island.style.transition = '';
    }));
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', arrive, {once: true});
    else arrive();
  } else {
    const first = () => fonts().then(() => requestAnimationFrame(() => Mark.place(true)));
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', first, {once: true});
    else first();
  }

  // The mark follows the section being read as the page scrolls, once a frame at most.
  let queued = false;
  addEventListener('scroll', () => {
    scrolled();
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      Mark.place();
    });
  }, {passive: true});
  addEventListener('resize', () => Mark.place(true));
  addEventListener('load', () => Mark.place(true));
  scrolled();

  // Links too many for a narrow island scroll inside it; the fade at the end says there are more,
  // and goes once the last of them is in view.
  const links = document.querySelector('header nav');
  const overflows = () => {
    if (!links) return;
    links.classList.toggle('overflows', links.scrollWidth - links.clientWidth - links.scrollLeft > 2);
  };
  if (links) {
    links.addEventListener('scroll', () => Mark.place(true), {passive: true});
    links.addEventListener('scroll', overflows, {passive: true});
    addEventListener('resize', overflows);
    addEventListener('load', overflows);
    overflows();
  }

  return {measure, morph, around, mark: markPart};
})();
