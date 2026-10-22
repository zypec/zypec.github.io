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
 * The dialog is built here, so a page only says which elements are its pictures. It takes the focus
 * itself when it opens: the browser would hand it to the first button, which then looked pressed on
 * every picture.
 */
const Lightbox = (() => {
  let box = null, items = [], at = 0;

  function build() {
    box = document.createElement('dialog');
    box.className = 'lightbox';
    box.tabIndex = -1;
    box.setAttribute('aria-label', 'Picture');
    box.innerHTML = '<img alt=""><div class="bar"><p></p>'
      + '<button type="button" data-step="-1" aria-label="Previous picture">←</button>'
      + '<button type="button" data-step="1" aria-label="Next picture">→</button>'
      + '<button type="button" data-close aria-label="Close">✕</button></div>';
    document.body.appendChild(box);

    box.querySelectorAll('[data-step]').forEach(button => button.onclick = () => show(at + Number(button.dataset.step)));
    box.querySelector('[data-close]').onclick = () => box.close();
    box.addEventListener('click', event => { if (event.target === box) box.close(); });
    box.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') show(at - 1);
      if (event.key === 'ArrowRight') show(at + 1);
    });
  }

  function source(item) {
    if (item.href) return item.href;
    const image = item.querySelector('img');
    return image ? image.currentSrc || image.src : '';
  }

  function show(index) {
    at = (index + items.length) % items.length;
    const item = items[at];
    const image = item.querySelector('img');
    box.querySelector('img').src = source(item);
    box.querySelector('img').alt = image ? image.alt : '';
    box.querySelector('p').textContent = item.closest('figure')?.querySelector('figcaption')?.textContent || '';
    box.querySelectorAll('[data-step]').forEach(button => button.hidden = items.length < 2);
  }

  function wire(selector) {
    items = [...document.querySelectorAll(selector)].filter(item => source(item));
    if (!items.length || typeof HTMLDialogElement === 'undefined') return;
    if (!box) build();

    items.forEach((item, index) => item.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      show(index);
      box.showModal();
      box.focus();
    }));
  }

  return {wire};
})();
