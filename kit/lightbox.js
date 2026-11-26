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
 * it cut to a shape of its own (object-fit: cover), so the part it shows is opened up as it grows, rather
 * than the whole picture jumping in at the start. With reduced motion it only fades.
 *
 * The dialog is built here, so a page only says which elements are its pictures. It takes the focus
 * itself when it opens: the browser would hand it to the first button, which then looked pressed on
 * every picture.
 */
const Lightbox = (() => {
  let box = null, picture = null, items = [], at = 0, closing = false;

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
    box.innerHTML = '<img alt=""><div class="bar"><p></p>'
      + `<button type="button" class="glass" data-step="-1" aria-label="Previous picture">${PREVIOUS}</button>`
      + `<button type="button" class="glass" data-step="1" aria-label="Next picture">${NEXT}</button>`
      + `<button type="button" class="glass" data-close aria-label="Close">${CLOSE}</button></div>`;
    document.body.appendChild(box);
    picture = box.querySelector('img');

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

  function source(item) {
    if (item.href) return item.href;
    const image = item.querySelector('img');
    return image ? image.currentSrc || image.src : '';
  }

  /** What the gallery shows of a picture: its image, or the element itself. */
  const thumbnailOf = item => item.querySelector('img') || item;

  function fill(index) {
    at = (index + items.length) % items.length;
    const item = items[at];
    const image = item.querySelector('img');
    picture.src = source(item);
    picture.alt = image ? image.alt : '';
    box.querySelector('p').textContent = item.closest('figure')?.querySelector('figcaption')?.textContent || '';
    box.querySelectorAll('[data-step]').forEach(button => button.hidden = items.length < 2);
  }

  /** The picture loaded, so its place in the dialog is known; a broken one is shown as it is. */
  const ready = () => picture.complete ? Promise.resolve() : picture.decode().catch(() => {});

  /**
   * The keyframe that puts the dialog's picture exactly over its thumbnail: moved and scaled as the
   * thumbnail is drawn, and clipped to what the thumbnail shows of it. `null` when the thumbnail is out
   * of sight, so there is nothing to grow from.
   */
  function overThumbnail(item) {
    const thumb = thumbnailOf(item), from = thumb.getBoundingClientRect(), to = picture.getBoundingClientRect();
    if (!from.width || !to.width || from.bottom < 0 || from.top > innerHeight) return null;
    const style = getComputedStyle(thumb);
    const cover = style.objectFit === 'cover';
    const scale = cover ? Math.max(from.width / to.width, from.height / to.height) : from.width / to.width;
    // Where the cut sits, from object-position ("0% 0%" for left top, "50% 50%" centered).
    const [px, py] = style.objectPosition.split(' ').map(part => part.endsWith('%') ? parseFloat(part) / 100 : .5);
    const left = from.left - (to.width * scale - from.width) * (cover ? px : .5);
    const top = from.top - (to.height * scale - from.height) * (cover ? py : .5);
    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    const inset = [(from.top - top) / scale, to.width - (from.right - left) / scale, to.height - (from.bottom - top) / scale, (from.left - left) / scale];
    return {
      transform: `translate(${left - to.left}px, ${top - to.top}px) scale(${scale})`,
      clipPath: `inset(${inset.map(value => `${Math.max(0, value)}px`).join(' ')} round ${radius / scale}px)`,
    };
  }

  const settled = {transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 0px)'};

  async function open(index) {
    closing = false;
    fill(index);
    box.showModal();
    box.focus();
    await ready();
    box.classList.add('open');
    const start = still() ? null : overThumbnail(items[at]);
    picture.animate(start ? [start, settled] : [{opacity: 0}, {opacity: 1}],
      {duration: start ? 420 : 200, easing: EASE});
  }

  async function step(by) {
    fill(at + by);
    await ready();
    picture.animate([{opacity: 0, transform: `translateX(${by * 16}px)`}, {opacity: 1, transform: 'none'}],
      {duration: still() ? 1 : 220, easing: EASE});
  }

  async function close() {
    if (closing || !box.open) return;
    closing = true;
    box.classList.remove('open');
    const end = still() ? null : overThumbnail(items[at]);
    await picture.animate(end ? [settled, end] : [{opacity: 1}, {opacity: 0}],
      {duration: end ? 340 : 160, easing: EASE, fill: 'forwards'}).finished.catch(() => {});
    box.close();
    picture.getAnimations().forEach(animation => animation.cancel());
    closing = false;
  }

  function wire(selector) {
    items = [...document.querySelectorAll(selector)].filter(item => source(item));
    if (!items.length || typeof HTMLDialogElement === 'undefined') return;
    if (!box) build();

    items.forEach((item, index) => item.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      open(index);
    }));
  }

  return {wire};
})();
