/*
 * The theme button of the pages around a wiki (#theme), turned the way the wiki turns its own.
 * Three states, and the middle one is invisible: with no stamp the page follows the system, so
 * leaving auto goes to the opposite of what is on screen and the button says which of the three it
 * is in. Stored under the same key as the wiki's, so the choice follows the reader between sites.
 */
(() => {
  const root = document.documentElement;
  const button = document.getElementById('theme');
  if (!button) return;
  const ICON = {auto: '◐', light: '○', dark: '●'};
  const NAME = {auto: 'Auto', light: 'Light', dark: 'Dark'};
  const system = () => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  function state() {
    const stamped = root.getAttribute('data-theme');
    return stamped === 'dark' || stamped === 'light' ? stamped : 'auto';
  }

  function order() {
    const stamped = root.getAttribute('data-theme');
    const own = system(), other = own === 'dark' ? 'light' : 'dark';
    return {cycle: ['auto', own, other], at: stamped === own ? 1 : stamped === other ? 2 : 0};
  }

  function paint() {
    const now = state();
    const {cycle, at} = order();
    button.querySelector('.icon').textContent = ICON[now];
    button.querySelector('.text').textContent = NAME[now];
    button.title = (now === 'auto' ? 'Following the system (' + system() + ')' : 'Forced ' + now)
      + ', next: ' + NAME[cycle[(at + 1) % 3]];
  }

  function apply(next) {
    if (next === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);
    try {
      if (next === 'auto') localStorage.removeItem('zypec-theme');
      else localStorage.setItem('zypec-theme', next);
    } catch (unavailable) {}
    paint();
    dispatchEvent(new Event('themechange'));
  }

  /** The new theme is uncovered by a circle growing from the button, where the browser can draw it. */
  function turn(next) {
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply(next);
    const box = button.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => apply(next)).ready.then(() => root.animate(
      {clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${far}px at ${x}px ${y}px)`]},
      {duration: 600, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)'})).catch(() => {});
  }

  button.onclick = () => {
    const {cycle, at} = order();
    turn(cycle[(at + 1) % 3]);
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);
  paint();
})();
