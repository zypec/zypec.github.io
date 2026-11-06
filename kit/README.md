# kit

The shared theme and wiki shell for my project sites. Each project's build copies `kit/` into its own
site, so the sites don't depend on each other at runtime.

| File | Purpose |
|---|---|
| `template.html` | The wiki page. The generator fills in `__TITLE__`, `__DESCRIPTION__`, `__ICON__`, `__KIT__` (path to the kit), `__HEAD__`, `__BRAND__`, `__VERSION__`, `__SEARCH__`, `__SCRIPTS__` and `__DATA__`. |
| `wiki.js` | The wiki shell: table of contents, search, routing, guides, previous/next links, front page, theme. The comment at the top documents the data it reads and the extension API. |
| `wiki.css` | Styles for the wiki shell. |
| `front.css`, `theme.js` | Styles and theme switch for front pages, statistics pages and the portfolio. |
| `content.js` | Renders a page from Markdown: `<main data-content="content.md">`, with `::: kind` blocks that the page defines. The format is documented at the top of the file. |
| `island.js` | The top bar. It animates between pages and shrinks when the page is scrolled. Load it right after `</header>` on every page. |
| `lightbox.js` | Opens gallery images over the page with previous/next/close buttons, arrow keys and Escape: `Lightbox.wire('.gallery a')`. Styles are in `front.css`. |

## Colors

A site sets its own accent by redefining these after `wiki.css` or `front.css`:

```css
:root{--accent:#5458c8;--accent-ink:#4447b3;--accent-soft:#5458c812;--accent-line:#5458c840}
```

Redefine the same four under `@media (prefers-color-scheme:dark)` and `:root[data-theme=dark]`. Text on a
filled accent (a primary button) uses `--on-accent`: white in light mode, near black in dark mode. If that
doesn't work with your accent, redefine `--on-accent` too.

## The top bar

Every page uses the same bar so buttons don't move between pages.

1. **Left:** the site's logo, linking to the site's front page (the portfolio links to itself).
2. **Right, in this order**, only the ones the site has: **Docs · Gallery · Statistics · Feedback ·
   Portfolio**, then the **theme switch**, always last.
3. **Same links on every page of a site** (front page, statistics page, wiki), and every link points to
   the same place from every page (Gallery from the statistics page is `../#gallery`). The current page
   stays in the bar. It can have `class="on"` (`aria-current="page"` in the wiki) but looks like the other
   links. In the wiki, Docs is replaced by **Home** (the project's front page), and the wiki's name in the
   bar opens the wiki's home.
4. **Portfolio** is on every page except the portfolio, whose bar lists its sections: **Projects · Contact**.
5. **On phones** (640px and narrower) the links with `class="roomy"` are hidden: always **Gallery** and
   **Feedback**. Docs, Statistics and Portfolio stay. The theme switch has the same size and spacing on
   front pages and in the wiki. In the wiki the links move into the table of contents on phones.

Current bars:

| Site | Bar |
|---|---|
| Portfolio | Projects · Contact · theme |
| Particles+ | Docs · Gallery · Statistics · Feedback · Portfolio · theme |
| Izomap | Docs · Gallery · Portfolio · theme |
| MetroCrafter | Portfolio · theme |

Front and statistics pages write the bar as `<header><a class="home">…</a><nav>…links…<button id="theme">`.
The wiki builds its bar from `site.links` and links to the front page from `site.front` (see the top of
`wiki.js`). When you add a link, put it in the order above and add it to every page of that site at once.

## Extending the wiki

A wiki with pages of its own (like the Particles+ script reference) registers them before starting:

```js
Wiki.register({entries: filter => [...], render: id => drawn, home: () => {...}, leave: () => {...}});
Wiki.start();
```

A wiki with nothing extra just calls `Wiki.start()`.

## Other notes

- A front page meant to be edited without HTML keeps its text in a `content.md` next to it and renders it
  with `content.js`. Each `content.md` starts with a comment listing the blocks its page supports.
- The theme choice is saved in `localStorage` under `zypec-theme`, so it carries over between sites.
- When `kit/` changes, `.github/workflows/kit.yml` checks it and triggers a rebuild of the project sites.
