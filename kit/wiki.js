/*
 * The wiki shell shared by every zypec project site.
 *
 * A page is one file: template.html with the site's document in <script id="data">. The document
 * holds `site` (what the shell needs to know about the project), `guides` (hand-written pages,
 * already HTML) and whatever else a project's extension reads. The shell draws the contents, the
 * search, the guides with their headings and the way on, the front page and the theme; a project
 * adds pages of its own with Wiki.register and then calls Wiki.start.
 *
 *   DATA.site = {
 *     title,            the name in the contents' foot and in a guide's crumb fallback
 *     order: [...],     the groups of the contents, in order; any other group comes after them
 *     foot,             HTML at the foot of the contents
 *     home: {           the front page, unless an extension draws its own
 *       kicker, title, lede, cta: [{href, label, primary}], tiles: [{id | href, title, said, wide}]
 *     }
 *   }
 *   DATA.guides = [{id, title, group, html, text}]   group 'hidden' is reachable but not listed,
 *                                                    '@<page>' is read on that page instead
 *   DATA.gallery = [{file, caption, video}]
 */
const Wiki = (() => {
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const SITE = Object.assign({title: '', order: ['Guides'], foot: '', home: null}, DATA.site || {});
  DATA.guides = DATA.guides || [];
  const HOME = 'home';

  const nav = document.getElementById('nav'), main = document.getElementById('main'), q = document.getElementById('q');
  const sheet = document.getElementById('sheet');
  const extensions = [];

  let current = HOME;
  let filter = '';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /**
   * Prose is written the way anybody writes prose in a text file: `backticks` around what is typed
   * into a configuration, **bold** for the sentence that matters, *emphasis* for a word. Escaped
   * first, so what comes back is the author's own words with their own marks turned into markup and
   * nothing else; code spans are taken first, so a * inside one stays a *.
   */
  function inline(text) {
    const spans = [];
    const kept = esc(text).replace(/`([^`]+)`/g, (all, code) => {
      spans.push(`<code>${code}</code>`);
      return `\u0000${spans.length - 1}\u0000`;
    });

    return kept
      .replace(/\*\*([^*]+)\*\*/g, (all, bold) => `<strong>${bold}</strong>`)
      .replace(/(^|[\s(])\*(\S|\S[^*]*?\S)\*(?=[\s.,;:)]|$)/g, (all, before, italic) => `${before}<em>${italic}</em>`)
      .replace(/\u0000(\d+)\u0000/g, (all, index) => spans[index]);
  }

  /** The page an address is on: `bugs/12` is on `bugs`, and the contents mark that entry for it. */
  const pageOf = id => String(id || '').split('/')[0];

  const guideMatches = (g, f) => !f || g.title.toLowerCase().includes(f) || g.text.includes(f);

  /** A guide filed under @page, which is read on that page rather than on one of its own. */
  const guideOf = page => DATA.guides.find(g => g.group === '@' + page);

  const listed = g => g.group !== 'hidden' && !String(g.group || '').startsWith('@');

  const rank = name => { const at = SITE.order.indexOf(name); return at < 0 ? SITE.order.length : at; };

  /**
   * Every entry of the contents for the search typed, guides first and then each extension's, as
   * {id, label, group, count, guide, sequence}. `guide` sets the entry in body type rather than
   * code; `sequence: false` keeps it out of the previous/next links.
   */
  function entries(f) {
    const all = DATA.guides.filter(g => listed(g) && guideMatches(g, f))
      .map(g => ({id: g.id, label: g.title, group: g.group || 'Guides', guide: true}));
    for (const extension of extensions) if (extension.entries) all.push(...extension.entries(f));
    return all;
  }

  function renderNav() {
    const shown = entries(filter);
    // Every guide the search matches is a page that can be on screen, listed or not: a hidden one
    // is still reached by a link.
    const ids = [HOME].concat(DATA.guides.filter(g => guideMatches(g, filter)).map(g => g.id),
      shown.filter(entry => !entry.guide || !DATA.guides.some(g => g.id === entry.id)).map(entry => entry.id));
    if (!ids.includes(pageOf(current)) && ids.length) current = filter && ids.length > 1 ? ids[1] : HOME;

    // Grouped before anything is written, so a group split across the sources is one heading rather
    // than two, and a guide may file itself beside the reference it is about.
    const groups = new Map();
    for (const entry of shown) {
      if (!groups.has(entry.group)) groups.set(entry.group, []);
      groups.get(entry.group).push(entry);
    }

    let html = filter ? '' : `<a href="#${HOME}" data-t="${HOME}" class="guide home-link${current === HOME ? ' on' : ''}"`
      + `${current === HOME ? ' aria-current="page"' : ''}><span>Home</span></a>`;
    for (const [group, list] of [...groups].sort((a, b) => rank(a[0]) - rank(b[0]))) {
      html += `<div class="grp">${esc(group)}</div>`;
      for (const entry of list) {
        const on = entry.id === pageOf(current);
        html += `<a href="#${esc(entry.id)}" data-t="${esc(entry.id)}" class="${entry.guide ? 'guide' : ''}${on ? ' on' : ''}"`
          + `${on ? ' aria-current="page"' : ''}><span>${esc(entry.label)}</span>`
          + (entry.count === undefined ? '' : `<span class="n">${entry.count}</span>`) + '</a>';
      }
    }

    nav.innerHTML = (html || '<div class="empty">No match.</div>') + (SITE.foot ? `<div class="navfoot">${SITE.foot}</div>` : '');
    nav.querySelectorAll('a[data-t]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.t); });
  }

  /**
   * The address bar follows what is on screen, so an entry can be linked to and the back button
   * walks where the reader has been.
   */
  function go(id) {
    current = id;
    closeNav();
    if (hashed() !== id) history.pushState(null, '', '#' + encodeURIComponent(id).replace(/%2F/g, '/'));
    render();
    window.scrollTo({top: 0});
  }

  const hashed = () => location.hash ? decodeURIComponent(location.hash.slice(1)) : null;

  /** Every link in an element that names a page with data-t, walked like the contents are. */
  function wire(within) {
    (within || main).querySelectorAll('[data-t]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.t); });
  }

  // --- code -------------------------------------------------------------------------------------

  /**
   * Built at start, so an extension can add the words its own language opens a line with.
   * One pass, first alternative wins at each position, everything between matches escaped as it is.
   */
  let CODE = null;
  const CODE_CLASSES = ['c-com', 'c-str', 'c-key', 'c-type', 'c-type', 'c-var', 'c-hex', 'c-arg', 'c-num'];

  function compileCode(names) {
    const words = [...new Set(names)].sort((a, b) => b.length - a.length).map(name => name.replace(/[-]/g, '\\-'));
    CODE = new RegExp([
      /(^[ \t]*#[^\n]*)/,                                   // a comment line, never a hex color
      /("(?:[^"\\\n]|\\.)*"|(?<!\w)'(?:[^'\\\n]|\\.)*')/,  // a quoted string, never an apostrophe
      /((?<=^[ \t]*(?:-[ \t]*)?)[A-Za-z_][\w.\-]*(?=:))/,   // a yaml key
      new RegExp(`((?<=^[ \\t]*(?:-[ \\t]*)?|\\?[ \\t]*|[ \\t]:[ \\t]*)(?:${words.join('|') || '(?!)'})(?=[ \\t\\[]|$))`),
      /((?<=^[ \t]*(?:-[ \t]*)?)[a-z][a-z\-]*(?=[ \t]*\[))/, // a word a line opens with before a bracket
      /(\{[A-Za-z_][\w\-]*\})/,                             // a variable
      /(#[0-9a-fA-F]{3,8}\b)/,                              // a hex color
      /([A-Za-z_][\w\-]*(?==))/,                            // an argument name
      /(\b(?:true|false)\b|(?<![\w.])-?\d+(?:\.\d+)?(?!\w))/ // a number or a flag, never digits inside a name
    ].map(part => part.source).join('|'), 'gm');
  }

  function highlight(code) {
    if (!CODE) compileCode([]);
    let out = '', last = 0;
    for (const match of code.matchAll(CODE)) {
      const index = match.findIndex((group, i) => i > 0 && group !== undefined);
      if (index < 1) continue;
      out += esc(code.slice(last, match.index)) + `<span class="${CODE_CLASSES[index - 1]}">${esc(match[0])}</span>`;
      last = match.index + match[0].length;
    }
    return out + esc(code.slice(last));
  }

  const codeBlock = (text, label) =>
    `<figure class="ex"><figcaption>${esc(label || 'Example')}</figcaption><pre>${highlight(text)}</pre></figure>`;

  /**
   * A block marked as console output is what a server prints, so it is shown the way a terminal
   * shows it rather than colored like a file. Every other block is highlighted.
   */
  function consoles() {
    main.querySelectorAll('pre').forEach(block => {
      if (block.closest('figure.ex')) return;
      if (!block.classList.contains('console')) {
        block.innerHTML = highlight(block.textContent);
        return;
      }
      const figure = document.createElement('figure');
      figure.className = 'console';
      figure.innerHTML = `<figcaption>${esc(block.dataset.title || 'Console')}</figcaption>`;
      block.replaceWith(figure);
      figure.appendChild(block);
    });
  }

  // --- the sheet --------------------------------------------------------------------------------

  /**
   * What a word means, opened over the page rather than navigated to, because the question is asked
   * in the middle of reading something else. Extensions fill EXPLAIN; a `.explain` button with
   * data-explain names its entry.
   */
  const EXPLAIN = new Map();

  function explain(key, example) {
    const entry = EXPLAIN.get(key);
    if (!entry) return;
    sheet.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="${esc(entry.title)}">`
      + '<button class="x" type="button" aria-label="Close">×</button>'
      + `<h3>${esc(entry.title)}</h3>`
      + (entry.summary ? `<p class="lede">${inline(entry.summary)}</p>` : '')
      + (entry.detail ? `<p>${inline(entry.detail)}</p>` : '')
      + (example ? codeBlock(example, 'Written as') : '')
      + '</div>';
    sheet.hidden = false;
    sheet.querySelector('.x').focus();
  }

  function closeSheet() {
    sheet.hidden = true;
    sheet.innerHTML = '';
  }

  // --- the front page ---------------------------------------------------------------------------

  function tile(id, title, said, extra, icon) {
    return `<a class="tile${extra || ''}" href="#${esc(id)}" data-t="${esc(id)}">${icon ? `<span class="icon">${icon}</span>` : ''}`
      + `<b>${esc(title)}</b><span>${esc(said)}</span></a>`;
  }

  function button(href, label, primary) {
    if (!href) return '';
    const page = href.startsWith('#') ? ` data-t="${esc(href.slice(1))}"` : /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
    return `<a class="btn${primary ? ' primary' : ''}" href="${esc(href)}"${page}>${esc(label)}</a>`;
  }

  /** The gallery, or a line saying it is on its way. */
  function gallery(heading, under) {
    const items = DATA.gallery || [];
    return `<h3 id="gallery">${esc(heading || 'Gallery')}</h3>${under ? `<p class="under">${esc(under)}</p>` : ''}<div class="gallery">`
      + (items.length ? items.map(item => `<figure>`
          + (item.video ? `<video src="${esc(item.file)}" autoplay muted loop playsinline></video>`
            : `<img src="${esc(item.file)}" alt="${esc(item.caption || '')}" loading="lazy">`)
          + (item.caption ? `<figcaption>${esc(item.caption)}</figcaption>` : '') + `</figure>`).join('')
        : `<div class="none">Screenshots are on their way.</div>`)
      + `</div>`;
  }

  function renderHome() {
    const home = SITE.home || {};
    const tiles = (home.tiles || []).map(t => t.href
      ? `<a class="tile${t.wide ? ' wide' : ''}" href="${esc(t.href)}"><b>${esc(t.title)}</b><span>${esc(t.said)}</span></a>`
      : tile(t.id, t.title, t.said, t.wide ? ' wide' : '')).join('');
    main.innerHTML = `<div class="home"><div class="bento">`
      + `<section class="tile hero"><div class="words">`
      + (home.kicker ? `<p class="kicker">${esc(home.kicker)}</p>` : '')
      + `<h2>${home.title || esc(SITE.title)}</h2>`
      + (home.lede ? `<p>${inline(home.lede)}</p>` : '')
      + `<div class="cta">${(home.cta || []).map(c => button(c.href, c.label, c.primary)).join('')}</div></div>`
      + (home.image ? `<figure><img src="${esc(home.image)}" alt=""></figure>` : '')
      + `</section>${tiles}</div>`
      + (DATA.gallery && DATA.gallery.length ? gallery(home.galleryTitle, home.galleryUnder) : '')
      + `</div>`;
    wire();
  }

  // --- a page -----------------------------------------------------------------------------------

  /**
   * The contents in reading order, as the sidebar lists them with nothing typed in the search.
   */
  function sequence() {
    return entries('').filter(entry => entry.sequence !== false)
      .map((entry, at) => ({entry, at}))
      .sort((a, b) => rank(a.entry.group) - rank(b.entry.group) || a.at - b.at)
      .map(pair => pair.entry);
  }

  /** The previous and next page, at the foot of a page. */
  function pager(id) {
    const all = sequence();
    const at = all.findIndex(entry => entry.id === id);
    if (at < 0) return '';

    const link = (entry, which) => entry
      ? `<a class="${which}" href="#${esc(entry.id)}" data-t="${esc(entry.id)}"><small>${which === 'prev' ? '← Previous' : 'Next →'}</small>`
        + `<b class="${entry.guide ? '' : 'mono'}">${esc(entry.label)}</b></a>`
      : '';
    const before = all[at - 1], after = all[at + 1];
    return before || after ? `<div class="pager" role="navigation" aria-label="More pages">${link(before, 'prev')}${link(after, 'next')}</div>` : '';
  }

  /**
   * The headings of a guide down the right of the page, the one being read marked as the reader
   * scrolls. A guide with fewer than three headings has nothing to gain.
   */
  let readingWatch = null;

  function contents(wrap) {
    if (readingWatch) { readingWatch.disconnect(); readingWatch = null; }
    const headings = [...wrap.querySelectorAll('article.guide h3')];
    if (headings.length < 3) return;

    const aside = document.createElement('aside');
    aside.className = 'toc';
    aside.innerHTML = '<p>On this page</p>' + headings
      .map((heading, at) => `<a href="#" data-at="${at}">${esc(heading.textContent)}</a>`).join('');
    wrap.appendChild(aside);

    const links = [...aside.querySelectorAll('a')];
    const mark = at => links.forEach((link, index) => link.classList.toggle('on', index === at));
    links.forEach(link => link.onclick = event => {
      event.preventDefault();
      headings[+link.dataset.at].scrollIntoView({behavior: 'smooth', block: 'start'});
    });

    const seen = new Set();
    readingWatch = new IntersectionObserver(found => {
      for (const entry of found) entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target);
      const first = headings.findIndex(heading => seen.has(heading));
      if (first >= 0) mark(first);
    }, {rootMargin: '-80px 0px -60% 0px'});
    headings.forEach(heading => readingWatch.observe(heading));
    mark(0);
  }

  function renderGuide(guide) {
    main.innerHTML = `<div class="guidewrap"><article class="guide">`
      + (listed(guide) && guide.group ? `<p class="crumb">${esc(guide.group)}</p>` : '')
      + `${guide.html}${pager(guide.id)}</article></div>`;
    consoles();
    contents(main.querySelector('.guidewrap'));
    wire();
  }

  function render() {
    renderNav();
    for (const extension of extensions) if (extension.leave) extension.leave();

    if (current === HOME) {
      const own = extensions.find(extension => extension.home);
      return own ? own.home() : renderHome();
    }

    const guide = DATA.guides.find(g => g.id === current);
    if (guide && String(guide.group || '').startsWith('@')) {
      current = guide.group.slice(1);
      history.replaceState(null, '', '#' + encodeURIComponent(current));
      return render();
    }

    for (const extension of extensions) if (extension.render && extension.render(current)) return;
    if (guide) return renderGuide(guide);
    main.innerHTML = '<div class="page"><div class="empty">Nothing to show.</div></div>';
  }

  // --- on a phone -------------------------------------------------------------------------------

  const navToggle = document.getElementById('navtoggle');
  const phone = matchMedia('(max-width:860px)');

  function openNav(open) {
    document.documentElement.style.setProperty('--head', document.querySelector('header').offsetHeight + 'px');
    nav.classList.toggle('open', open);
    document.body.classList.toggle('navopen', open && phone.matches);
    navToggle.setAttribute('aria-expanded', String(open));
  }
  const closeNav = () => openNav(false);

  // --- the theme --------------------------------------------------------------------------------

  /**
   * Three states, and the middle one is invisible: with no stamp the page follows the system, so a
   * naive cycle can step from "auto" to the theme the system was already showing and look dead.
   * Leaving auto therefore goes to the opposite of what is on screen, and the button says which of
   * the three it is in. One key for every zypec site, so the choice follows the reader between them.
   */
  const THEME_KEY = 'zypec-theme';
  const root = document.documentElement;
  const ICON = {auto: '◐', light: '○', dark: '●'};
  const NAME = {auto: 'Auto', light: 'Light', dark: 'Dark'};
  const system = () => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  /** The theme on screen, for anything that has to be drawn to match it. */
  function showing() {
    const now = themeState();
    return now !== 'auto' ? now : system();
  }

  function themeState() {
    const stamped = root.getAttribute('data-theme');
    return stamped === 'dark' || stamped === 'light' ? stamped : 'auto';
  }
  function themeOrder() {
    const stamped = root.getAttribute('data-theme');
    const own = system(), other = own === 'dark' ? 'light' : 'dark';
    return {cycle: ['auto', own, other], at: stamped === own ? 1 : stamped === other ? 2 : 0};
  }
  function paintTheme() {
    const now = themeState();
    const {cycle, at} = themeOrder();
    document.getElementById('themeicon').textContent = ICON[now];
    document.getElementById('themetext').textContent = NAME[now];
    document.getElementById('themed').title = (now === 'auto' ? 'Following the system (' + system() + ')' : 'Forced ' + now)
      + ', next: ' + NAME[cycle[(at + 1) % 3]];
  }
  function applyTheme(next) {
    if (next === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);
    try {
      if (next === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch (unavailable) {}
    paintTheme();
    dispatchEvent(new Event('themechange'));
  }
  /** The new theme is uncovered by a circle growing from the button, where the browser can draw it. */
  function turnTheme(next, from) {
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return applyTheme(next);
    const box = from.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => applyTheme(next)).ready.then(() => root.animate(
      {clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${far}px at ${x}px ${y}px)`]},
      {duration: 600, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)'})).catch(() => {});
  }

  // --- start ------------------------------------------------------------------------------------

  /**
   * An extension is {entries(filter), render(id) -> bool, home(), leave(), codeNames}. Each part is
   * optional: `entries` adds to the contents, `render` draws a page it recognizes and says so,
   * `home` replaces the front page, `leave` runs before any page is drawn (to stop an animation),
   * and `codeNames` are the words its examples open a line with.
   */
  function register(extension) {
    extensions.push(extension);
  }

  function start() {
    compileCode(extensions.flatMap(extension => extension.codeNames || []));

    sheet.onclick = event => {
      if (event.target === sheet || event.target.classList.contains('x')) closeSheet();
    };
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !sheet.hidden) closeSheet();
    });
    document.addEventListener('click', event => {
      const chip = event.target.closest('.explain');
      if (!chip) return;
      event.preventDefault();
      explain(chip.dataset.explain, chip.dataset.example);
    });

    navToggle.onclick = () => openNav(!nav.classList.contains('open'));
    // On a phone the results of a search are the contents, and the contents are shut until asked
    // for: typing opens them, or the search looked as if it did nothing.
    q.oninput = () => {
      filter = q.value.trim().toLowerCase();
      render();
      if (phone.matches) openNav(filter !== '' || nav.classList.contains('open'));
    };

    document.getElementById('themed').onclick = event => {
      const {cycle, at} = themeOrder();
      turnTheme(cycle[(at + 1) % 3], event.currentTarget);
    };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintTheme);
    paintTheme();

    addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
    });
    addEventListener('popstate', () => {
      current = hashed() || HOME;
      render();
    });
    // A link written into a guide is an ordinary anchor; it is walked like the contents are, so it
    // lands at the top of the page it names and the back button returns from it.
    main.addEventListener('click', event => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor || anchor.dataset.t || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      go(decodeURIComponent(anchor.getAttribute('href').slice(1)));
    });
    document.getElementById('brand').onclick = () => go(HOME);

    current = hashed() || HOME;
    render();
  }

  return {
    DATA, SITE, HOME, EXPLAIN,
    get current() { return current; },
    set current(id) { current = id; },
    get filter() { return filter; },
    main, nav, sheet,
    esc, inline, pageOf, guideOf, guideMatches,
    go, wire, render, highlight, codeBlock, consoles, contents, pager, sequence,
    explain, closeSheet, tile, button, gallery, renderGuide, closeNav, showing,
    register, start,
  };
})();
