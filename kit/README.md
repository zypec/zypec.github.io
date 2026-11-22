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
| `island.js` | The top bar. It animates between pages, shrinks when the page is scrolled and marks the page or section being read. Load it right after `</header>` on every page. |
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
2. **Right, in this order**, only the ones the site has: **Gallery, Docs, Statistics, Feedback,
   Portfolio**, then the **theme switch**, always last. Gallery, a section of the front page, comes first
   so the capsule scrolling down to it from the top does not leap over Docs.
3. **Same links on every page of a site** (front page, statistics page, wiki), and every link points to
   the same place from every page (Gallery from the statistics page is `../#gallery`). The current page
   stays in the bar, marked by `class="on"` (`aria-current="page"` in the wiki). `island.js` draws a soft
   capsule behind the link of the bar the reader is on and slides it as they move: the link of the section
   scrolled to (`#gallery`, `#projects`), the `on` link on a page of its own, and in the wiki whatever
   `Island.mark(part)` names (Home, or Feedback on the feedback page). The site's name on the left is never
   marked: at the top of a front page, before any section is reached, there is no capsule. Coming from
   another page it starts behind the link that page had marked. In the wiki, Docs is replaced by **Home**
   (the project's front page), and the wiki's name in the bar opens the wiki's home.
4. **Portfolio** is on every page except the portfolio, whose bar lists its sections: **Projects, Contact**.
5. **On phones** (640px and narrower) the links with `class="roomy"` are hidden: always **Gallery** and
   **Feedback**. Docs, Statistics and Portfolio stay. The theme switch has the same size and spacing on
   front pages and in the wiki. In the wiki the links move into the table of contents on phones.

Current bars:

| Site | Bar |
|---|---|
| Portfolio | Projects, Contact, theme |
| Particles+ | Gallery, Docs, Statistics, Feedback, Portfolio, theme |
| Izomap | Gallery, Docs, Portfolio, theme |
| MetroCrafter | Portfolio, theme |

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

## Writing a wiki page

A reader comes to a wiki with one question and leaves when it is answered, so a page is laid out to be
scanned before it is read, and each kind of content has one shape, the same on every site:

- **Anything looked up is a list of rows** (`.args`, each `.arg` a row): settings, arguments, commands,
  permissions, fields, files. A row names the thing (`.k`, in the code face, or `.k.w` for words), says
  what it is in one line (`.s`), carries its tags at the end (`.meta`: required, a type, `.tag.def` for the
  default) and opens on the rest when there is a rest (`details.arg`; `.arg.flat` does not open). A
  `.head` row above the first names the columns, and `.args.names` gives long names a third of the row.
- **A table only to compare**: values read across three or more columns. Two columns is a list of rows.
- **A tile only to go somewhere**, never a list of facts.
- **The answer first**: the lede says what the page is for, a row's line is the answer and its inside the
  details, and bold marks the one word a reader scans for, never a sentence.
- Every page has its group's crumb (`.crumb`) above a title in the display face, and starts at the same
  distance from the contents. `#page/heading` opens a guide at a heading, and `#page/<id>` at the row with
  that id, opened and outlined for a moment.

## To do

- **Izomap's wiki** is not on the rule above yet. Its config reference is already rows, but its guides hold
  19 Markdown tables: the two-column ones (a key and what it does, a slot and what it holds) become rows,
  drawn by its generator the way `.args` expects, and a table stays only where values are compared.
  Nothing in the kit has to change for it.

## Other notes

- A front page meant to be edited without HTML keeps its text in a `content.md` next to it and renders it
  with `content.js`. Each `content.md` starts with a comment listing the blocks its page supports.
- The theme choice is saved in `localStorage` under `zypec-theme`, so it carries over between sites.
- When `kit/` changes, `.github/workflows/kit.yml` checks it and triggers a rebuild of the project sites.
