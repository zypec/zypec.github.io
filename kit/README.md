# The kit

`kit/` is the shell of a project wiki and the styles of the pages around it. A project's own build
copies it into its site, so a site never depends on another being up.

| File | What it is |
|---|---|
| `template.html` | The wiki page. A generator fills `__TITLE__`, `__DESCRIPTION__`, `__ICON__`, `__KIT__` (the path to the kit), `__HEAD__`, `__BRAND__`, `__VERSION__`, `__SEARCH__`, `__SCRIPTS__` and `__DATA__` |
| `wiki.js` | The shell: contents, search, routing, guides with their headings, previous and next, the front page, the theme. Its header documents the data it reads and the extension API |
| `wiki.css` | The shell's styles |
| `front.css`, `theme.js` | Front pages, statistics pages and this portfolio |
| `content.js` | A page's words from a text file: `<main data-content="content.md">` is drawn from Markdown with `::: kind` blocks, whose drawing the page teaches it. Its header documents the format |
| `lightbox.js` | A gallery's pictures opened over the page, with previous, next and close, the arrow keys and Escape: `Lightbox.wire('.gallery a')`. Its styles are in `front.css` |

A site recolors the kit by redefining the accent tokens after `wiki.css` or `front.css`:

```css
:root{--accent:#5458c8;--accent-ink:#4447b3;--accent-soft:#5458c812;--accent-line:#5458c840}
```

with the same four under `@media (prefers-color-scheme:dark)` and `:root[data-theme=dark]`. The words on a filled
accent (a primary button) are `--on-accent`: white in light, near black in dark, where accents are pale.
A site whose accent breaks that redefines it beside the other four.

## The top bar

Every page of every site wears the same bar, so walking from one page to the next never moves a button:

1. **Left:** the site's mark, which opens that site's front page (on the portfolio, the portfolio).
2. **Right, in this order**, each only if the site has it: **Docs · Gallery · Statistics · Feedback ·
   Portfolio**, then the **theme switch**, always last.
3. **A site shows the same links on all its pages**: the front page, the statistics page and the wiki. The page
   the reader is on stays in the bar and is never left out. It may carry `class="on"` (`aria-current="page"` on
   the wiki), but it is drawn like every other link: the wiki's feedback and bug pages are pages of the docs,
   and a bar that marked Docs there said the wrong thing. Every link points at the same place from every page: Gallery from the statistics page is
   `../#gallery`.
4. **Portfolio** is on every page but the portfolio's own, whose bar is its sections: **Projects · Contact**.
5. **On a phone** (640px and under) the bar drops the links marked `class="roomy"`, and those are always
   **Gallery** and **Feedback**: the reader can scroll to the first and reaches the second from the wiki.
   The theme switch is the same size on a front page as in the wiki and as far from the last link, so the
   links never move between the two. Docs,
   Statistics and Portfolio never drop. The wiki has no room at all on a phone, so its links move into the
   contents.

Today's bars:

| Site | Bar |
|---|---|
| Portfolio | Projects · Contact · theme |
| Particles+ | Docs · Gallery · Statistics · Feedback · Portfolio · theme |
| Izomap | Docs · Gallery · Portfolio · theme |
| MetroCrafter | Portfolio · theme |

A front or statistics page writes its bar as `<header><a class="home">…</a><nav>…links…<button id="theme">`. The
wiki draws its own from `site.links` (and opens the front page from `site.front`), see the top of `wiki.js`. A new
link takes its place in the order above and is added to every page of its site in the same change.

A wiki with pages of its own (Particles+'s script reference, say) registers them:

```js
Wiki.register({entries: filter => [...], render: id => drawn, home: () => {...}, leave: () => {...}});
Wiki.start();
```

A front page that should be changed without writing HTML keeps its words in a `content.md` beside it
and draws them with `content.js`; each `content.md` starts with a comment listing the blocks its page
knows.

A wiki with nothing to add calls `Wiki.start()` alone. The theme is stored under `zypec-theme`, so
the choice follows the reader from one site to the next.

When the kit changes, `.github/workflows/kit.yml` checks it and asks the project sites to rebuild.
