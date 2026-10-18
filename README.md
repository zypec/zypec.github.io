# zypec.github.io

The portfolio at <https://zypec.github.io/>, and the shared kit every project site is drawn with.

| Project | Site |
|---|---|
| Particles+ | <https://zypec.github.io/ParticlesPlus/> |
| Izomap | <https://zypec.github.io/izomap/> |

## The kit

`kit/` is the shell of a project wiki and the styles of the pages around it. A project's own build
copies it into its site, so a site never depends on another being up.

| File | What it is |
|---|---|
| `template.html` | The wiki page. A generator fills `__TITLE__`, `__DESCRIPTION__`, `__ICON__`, `__KIT__` (the path to the kit), `__HEAD__`, `__BRAND__`, `__VERSION__`, `__SEARCH__`, `__SCRIPTS__` and `__DATA__` |
| `wiki.js` | The shell: contents, search, routing, guides with their headings, previous and next, the front page, the theme. Its header documents the data it reads and the extension API |
| `wiki.css` | The shell's styles |
| `front.css`, `theme.js` | Front pages, statistics pages and this portfolio |

A site recolors the kit by redefining the accent tokens after `wiki.css` or `front.css`:

```css
:root{--accent:#5458c8;--accent-ink:#4447b3;--accent-soft:#5458c812;--accent-line:#5458c840}
```

with the same four under `@media (prefers-color-scheme:dark)` and `:root[data-theme=dark]`.

A wiki with pages of its own (Particles+'s script reference, say) registers them:

```js
Wiki.register({entries: filter => [...], render: id => drawn, home: () => {...}, leave: () => {...}});
Wiki.start();
```

A wiki with nothing to add calls `Wiki.start()` alone. The theme is stored under `zypec-theme`, so
the choice follows the reader from one site to the next.

When the kit changes, `.github/workflows/kit.yml` checks it and asks the project sites to rebuild.
