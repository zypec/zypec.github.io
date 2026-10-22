<!--
  Everything the portfolio says. Change it here, save, and reload the page; nothing else needs touching.

  ## A heading             starts a numbered section, in the order they come
  ## A heading {#id}       the same, with the id links use (#projects)
  ### A heading            a subsection inside it, numbered under it (1.1)
  A paragraph             with **bold**, *italic*, [a link](https://…) and a note in the margin^[like this]
  - an item               a list
  ![What it shows](picture.png "Its caption")

  A block starts with "::: kind" and ends with ":::". Its fields come first, one a line, up to the first
  empty line; a field's name is one lowercase word. After the fields is what the block says. A field can
  be given more than once, and a | splits it in parts. The kinds this page knows:

  title      name, role, fact: Label | Value (any number), link: Words | address (any number; an e-mail
             address as mailto:… gets the envelope)
  about      the opening words, under "About me" (label: gives it another)
  project    name, link, status, color, image, caption, fact: Label | Value, line: Name | color (drawn when
             there is no image), open: the words of its button; then what it is
  projects   a table of the projects of one group: group, caption, columns: the facts it shows by their labels,
             empty: said while the group has none (projects then need group:)
  colophon   the small print at the bottom

  A block or a section moved up or down here moves on the page.
-->

::: title
name: Emre Kaya
role: Statistician and software developer
fact: Field | Statistics and software
fact: Studied | Statistics, Mimar Sinan Fine Arts University, with High Honors
fact: Works in | Java, Python, R
fact: Aiming at | Data analysis and artificial intelligence
link: E-mail | mailto:emrek4958@gmail.com
link: LinkedIn | https://www.linkedin.com/in/emrekkkaya/
link: GitHub | https://github.com/zypec
:::

::: about
I have a deep interest in software, one that began when I learned Java in middle school, and I have
[open-source projects written in Java](https://github.com/zypec) on GitHub. I graduated with High Honors
from the Statistics department at Mimar Sinan Fine Arts University 🦉, and I plan to shape my career by
blending my interest in software with statistics. By bringing what I know of statistics together with my
software skills, I aim to specialize in data analysis and, above all, artificial
intelligence.^[I also drink a lot of coffee, and brew most of it myself. I call it a hobby; the sample size suggests otherwise.]
:::

## My Projects {#projects}

### Minecraft projects

::: project
name: Particles+
link: ParticlesPlus/
status: Available
color: #e08a3c
image: ParticlesPlus/gallery/angel-wings.png
caption: Angel wings, one of the effects that ships with it, drawn on a player.
fact: What it is | A particle effects plugin with a web editor
fact: Runs on | Spigot, Paper and Folia, Minecraft 1.16 to 26.3
fact: Built with | Java, and a browser editor that previews every effect

Fully customizable particle effects: wings, rituals, trails, 3D models from Blockbench and whole little
scenes, written in a few lines of YAML or built in a web editor that shows the effect as you go.
:::

::: project
name: Izomap
link: izomap/
status: Coming soon
color: #cf9c06
image: izomap/gallery/fog.png
caption: A cathedral and a town at dusk, the land behind fading into the sky, photographed in game and printed onto
maps.
fact: What it is | Isometric photography printed onto maps
fact: Runs on | Paper 26.3
fact: License | Free and open source

Put a camera in the world, aim it with a live preview, and print what it sees onto maps, from a single map
to a 16x9 wall. Shadows, skies, depth of field, fog, and no resource pack.
:::

::: project
name: MetroCrafter
link: metrocrafter/
status: In development
color: #1f4fa3
line: Metrobüs | #e2231a
line: M2 Metro | #00a650
line: Marmaray | #1c5aa8
caption: The three lines it runs currently. It has no pictures yet; it is still being built.
fact: What it is | A Minecraft server of its own
fact: Runs on | Its own server, built from the ground up

İstanbul's Metrobüs, the M2 metro and Marmaray, rebuilt in Minecraft and run by the people who ride them.
Not a plugin but a whole server, where a city's daily commute becomes the game.
:::

### Statistics and data

*In preparation. The sample is still being collected (n = 0), and we do not publish an estimate whose
confidence interval runs from −∞ to +∞.*

## Toolkit

- **Java** for most of what I ship: server software and the tools around it.
- **Python** for data, and for the questions I want answered quickly.
- **R** for statistics, where it all started.

## Contact

The easiest way to reach me is by e-mail.

- E-mail: [emrek4958@gmail.com](mailto:emrek4958@gmail.com)
- LinkedIn: [linkedin.com/in/emrekkkaya](https://www.linkedin.com/in/emrekkkaya/)
- GitHub: [github.com/zypec](https://github.com/zypec)

::: colophon
yes, this is another vibecoded Claude website 👉👈
:::
