# zypec.github.io

My personal site, live at <https://zypec.github.io/>.

It has my portfolio and the pages of my projects:

- [Particles+](https://zypec.github.io/ParticlesPlus/), a particle effects plugin for Minecraft servers
- [Izomap](https://zypec.github.io/izomap/)
- [MetroCrafter](https://zypec.github.io/metrocrafter/)

## Layout

- `index.html` and `content.md`: the portfolio. The text lives in `content.md`, so I can edit it without touching HTML.
- `metrocrafter/`: the MetroCrafter page, set up the same way.
- `kit/`: the theme and wiki shell shared by my project sites. See [`kit/README.md`](kit/README.md).
- `maven/`: a Maven repository for the Particles+ API.

It's plain HTML, CSS and JavaScript with no framework and no build step. Pushing to `main` publishes it.
