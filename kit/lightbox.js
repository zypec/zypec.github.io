/*
 * A gallery's pictures opened over the page instead of on their own, the rest of the gallery a step away.
 *
 *   Lightbox.wire('.gallery figure');
 *
 * Every element the selector finds is one picture: a link opens what it points at, anything else the
 * image inside it, and the caption is its figure's <figcaption>. The arrows walk through the pictures in
 * page order, Escape or a click on the dark around the picture closes it. A link stays a link, so without
 * the script, or with a click meant for a new tab, the picture still opens on its own.
 *
 * A picture grows out of its place in the gallery and goes back there when closed. The gallery may show
 * it cut to a shape of its own (object-fit: cover), or cut off by a box around it (a phone running off the
 * foot of its card), so only the part it shows is opened up as it grows and folded back as it closes,
 * rather than the whole picture jumping in at the start or showing at the end. With reduced motion it
 * only fades.
 *
 * An element marked `data-live` is opened as itself instead of as a picture: a copy of it, drawn at its
 * own size and scaled up to fit, so something that moves (an animated demo) keeps moving, in step with the
 * one in the gallery. Its value is what a screen reader says it opens.
 *
 * The dialog is built here, so a page only says which elements are its pictures. It takes the focus
 * itself when it opens: the browser would hand it to the first button, which then looked pressed on
 * every picture.
 */
const Lightbox = (() => {
  let box = null, picture = null, live = null, shown = null, items = [], at = 0, closing = false;

  const ICON = path => `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const PREVIOUS = ICON('<path d="M12.5 4.5 7 10l5.5 5.5"/>');
  const NEXT = ICON('<path d="M7.5 4.5 13 10l-5.5 5.5"/>');
  const CLOSE = ICON('<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>');
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.9,.25,1)';

  function build() {
    box = document.createElement('dialog');
    box.className = 'lightbox';
    box.tabIndex = -1;
    box.setAttribute('aria-label', 'Picture');
    box.innerHTML = '<img alt=""><div class="live" hidden></div><div class="bar"><p></p>'
      + `<button type="button" class="glass" data-step="-1" aria-label="Previous picture">${PREVIOUS}</button>`
      + `<button type="button" class="glass" data-step="1" aria-label="Next picture">${NEXT}</button>`
      + `<button type="button" class="glass" data-close aria-label="Close">${CLOSE}</button></div>`;
    document.body.appendChild(box);
    picture = box.querySelector('img');
    live = box.querySelector('.live');

    box.querySelectorAll('[data-step]').forEach(button => button.onclick = () => step(Number(button.dataset.step)));
    box.querySelector('[data-close]').onclick = close;
    box.addEventListener('click', event => { if (event.target === box) close(); });
    // Escape closes through the same way back as the button does.
    box.addEventListener('cancel', event => { event.preventDefault(); close(); });
    box.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    });
  }

  const isLive = item => item.hasAttribute('data-live');

  function source(item) {
    if (isLive(item)) return 'live';
    if (item.href) return item.href;
    const image = item.querySelector('img');
    return image ? image.currentSrc || image.src : '';
  }

  /** What the gallery shows of a picture: its image, or the element itself. */
  const thumbnailOf = item => (!isLive(item) && item.querySelector('img')) || item;

  /**
   * A copy of a live element, at the size it has in the gallery and scaled to fill the room the dialog has
   * for a picture, so its words and drawing grow together. Its moving parts are set to where the gallery's
   * are, so nothing restarts when it opens or jumps when it goes back.
   */
  function showLive(item) {
    const {width, height} = item.getBoundingClientRect();
    const copy = item.cloneNode(true);
    for (const element of [copy, ...copy.querySelectorAll('[id]')]) element.removeAttribute('id');
    copy.removeAttribute('tabindex');
    copy.removeAttribute('role');
    copy.removeAttribute('aria-label');
    const scale = Math.min(Math.min(innerWidth * .96, 1600) / width, innerHeight * .84 / height);
    Object.assign(copy.style, {width: `${width}px`, height: `${height}px`, margin: '0', transform: `scale(${scale})`, transformOrigin: '0 0'});
    Object.assign(live.style, {width: `${width * scale}px`, height: `${height * scale}px`});
    live.replaceChildren(copy);
    const theirs = item.getAnimations({subtree: true});
    copy.getAnimations({subtree: true}).forEach((animation, i) => {
      if (theirs[i] && theirs[i].currentTime !== null) animation.currentTime = theirs[i].currentTime;
    });
  }

  function fill(index) {
    at = (index + items.length) % items.length;
    const item = items[at];
    const image = item.querySelector('img');
    const asItself = isLive(item);
    picture.hidden = asItself;
    live.hidden = !asItself;
    shown = asItself ? live : picture;
    if (asItself) picture.removeAttribute('src');
    else {
      live.replaceChildren();
      picture.src = source(item);
      picture.alt = image ? image.alt : '';
    }
    box.querySelector('p').textContent = item.closest('figure')?.querySelector('figcaption')?.textContent || '';
    box.querySelectorAll('[data-step]').forEach(button => button.hidden = items.length < 2);
  }

  /** The picture loaded, so its place in the dialog is known; a broken one is shown as it is. */
  const ready = () => shown !== picture || picture.complete ? Promise.resolve() : picture.decode().catch(() => {});

  /**
   * What is in sight of an element: its box, cut by every box around it that hides what overflows it
   * (a card the picture runs off, a row that scrolls sideways), each side noted as cut or not.
   */
  function inSight(element) {
    const box = element.getBoundingClientRect();
    const sight = {left: box.left, top: box.top, right: box.right, bottom: box.bottom, cut: {}};
    for (let around = element.parentElement; around && around !== document.body; around = around.parentElement) {
      const style = getComputedStyle(around);
      const across = style.overflowX !== 'visible', down = style.overflowY !== 'visible';
      if (!across && !down) continue;
      const edge = around.getBoundingClientRect();
      const narrow = (side, value, wins) => { if (wins(value, sight[side])) { sight[side] = value; sight.cut[side] = true; } };
      if (across) { narrow('left', edge.left, (a, b) => a > b); narrow('right', edge.right, (a, b) => a < b); }
      if (down) { narrow('top', edge.top, (a, b) => a > b); narrow('bottom', edge.bottom, (a, b) => a < b); }
    }
    return sight;
  }

  /**
   * The keyframe that puts the dialog's picture exactly over its thumbnail: moved and scaled as the
   * thumbnail is drawn, and clipped to what the thumbnail shows of it. `null` when the thumbnail is out
   * of sight, so there is nothing to grow from.
   */
  function overThumbnail(item) {
    const thumb = thumbnailOf(item), from = thumb.getBoundingClientRect(), to = shown.getBoundingClientRect();
    const sight = inSight(thumb);
    if (!from.width || !to.width || sight.right <= sight.left || sight.bottom <= sight.top
      || sight.bottom < 0 || sight.top > innerHeight) return null;
    const style = getComputedStyle(thumb);
    const cover = style.objectFit === 'cover';
    const scale = cover ? Math.max(from.width / to.width, from.height / to.height) : from.width / to.width;
    // Where the cut sits, from object-position ("0% 0%" for left top, "50% 50%" centered).
    const [px, py] = style.objectPosition.split(' ').map(part => part.endsWith('%') ? parseFloat(part) / 100 : .5);
    const left = from.left - (to.width * scale - from.width) * (cover ? px : .5);
    const top = from.top - (to.height * scale - from.height) * (cover ? py : .5);
    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    // A live element's edge may be drawn outside its box (a phone's bezel as a shadow), so where nothing
    // around it cuts it, the clip leaves that much room.
    const bleed = side => shown === live && !sight.cut[side] ? BLEED / scale : 0;
    const inset = [(sight.top - top) / scale - bleed('top'), to.width - (sight.right - left) / scale - bleed('right'),
      to.height - (sight.bottom - top) / scale - bleed('bottom'), (sight.left - left) / scale - bleed('left')];
    return {
      transform: `translate(${left - to.left}px, ${top - to.top}px) scale(${scale})`,
      clipPath: `inset(${inset.map(value => `${shown === live ? value : Math.max(0, value)}px`).join(' ')} round ${radius / scale}px)`,
    };
  }

  /** How far, in the gallery's pixels, a live element may draw outside its box. */
  const BLEED = 8;
  const settled = () => {
    const room = shown === live ? -BLEED * live.getBoundingClientRect().width / thumbnailOf(items[at]).getBoundingClientRect().width : 0;
    return {transform: 'none', clipPath: `inset(${room}px ${room}px ${room}px ${room}px round 0px)`};
  };

  async function open(index) {
    closing = false;
    fill(index);
    box.showModal();
    box.focus();
    if (shown === live) showLive(items[at]);
    await ready();
    box.classList.add('open');
    const start = still() ? null : overThumbnail(items[at]);
    shown.animate(start ? [start, settled()] : [{opacity: 0}, {opacity: 1}],
      {duration: start ? 420 : 200, easing: EASE});
  }

  async function step(by) {
    fill(at + by);
    if (shown === live) showLive(items[at]);
    await ready();
    shown.animate([{opacity: 0, transform: `translateX(${by * 16}px)`}, {opacity: 1, transform: 'none'}],
      {duration: still() ? 1 : 220, easing: EASE});
  }

  async function close() {
    if (closing || !box.open) return;
    closing = true;
    box.classList.remove('open');
    const end = still() ? null : overThumbnail(items[at]);
    await shown.animate(end ? [settled(), end] : [{opacity: 1}, {opacity: 0}],
      {duration: end ? 340 : 160, easing: EASE, fill: 'forwards'}).finished.catch(() => {});
    box.close();
    shown.getAnimations().forEach(animation => animation.cancel());
    live.replaceChildren();
    closing = false;
  }

  function wire(selector) {
    items = [...document.querySelectorAll(selector)].filter(item => source(item));
    if (!items.length || typeof HTMLDialogElement === 'undefined') return;
    if (!box) build();

    items.forEach((item, index) => {
      item.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        open(index);
      });
      // A live element is no link, so it is made one to reach from the keyboard.
      if (isLive(item) && !item.matches('a[href], button')) {
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        if (item.dataset.live) item.setAttribute('aria-label', item.dataset.live);
        item.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          open(index);
        });
      }
    });
  }

  return {wire};
})();
