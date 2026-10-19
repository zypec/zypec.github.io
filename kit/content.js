/*
 * A page's words from a text file, so changing what a page says never means writing HTML. The page names
 * its file on <main data-content="content.md">; this reads it and draws it there. The file is Markdown
 * with one addition, blocks:
 *
 *   ## Selected work                 a section; its heading is the section's name, its id the name in lowercase
 *   ## Watch it {#films}             the same, with the id given
 *
 *   A paragraph, with **bold**, *italic*, `code`, [a link](https://…) and a margin note^[said beside it].
 *   - a list item
 *   ![What it shows](path/to/picture.png "Its caption")
 *
 *   ::: project                      a block, of a kind the page knows how to draw
 *   name: Particles+                 its fields (lowercase names), one a line, up to the first empty line; a field given
 *   fact: Runs on | Spigot, Paper    twice is a list, and a | splits a value into its parts
 *
 *   What it says, in Markdown.       its body
 *   :::
 *
 * <!-- comments --> are left out. Nothing in the file is taken as HTML, so a < is always a <.
 *
 * The page teaches the kinds it draws before the file is read:
 *
 *   Content.kind('project', block => `…${block.one('name')}…${block.html}…`);
 *   Content.kind('card', block => `…`, 'cards');   blocks of this kind that follow one another share a
 *                                                   <div class="cards">, so a grid of them is one element
 *
 * (a kind is also handed Content itself and every block in the file, so a summary can be drawn from the rest)
 *
 * and after drawing, a 'contentready' event goes out on document, for whatever wants the drawn page.
 */
(() => {
  const kinds = {}, groups = {};
  let notes = 0;

  const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  /** A section's id from its name: "Selected work" is #selected-work. */
  const slug = text => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /** One line's worth of Markdown: escaped first, so only the marks below ever become tags. */
  function inline(text) {
    const codes = [];
    let out = escape(text).replace(/`([^`]+)`/g, (whole, code) => `\u0000${codes.push(code) - 1}\u0000`);
    out = out
      .replace(/\^\[([^\]]+)\]/g, (whole, said) => {
        notes++;
        return `<sup class="noteref">${notes}</sup><small class="sidenote" data-n="${notes}">${said}</small>`;
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, words, href) => {
        const away = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${href}"${away}>${words}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return out.replace(/\u0000(\d+)\u0000/g, (whole, i) => `<code>${codes[i]}</code>`);
  }

  /** Paragraphs, lists, pictures and quotes, from lines that are not headings or blocks. */
  function markdown(text) {
    const out = [];
    for (const chunk of text.split(/\n\s*\n/).map(one => one.trim()).filter(Boolean)) {
      const lines = chunk.split('\n').map(line => line.trim());
      const picture = chunk.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
      if (picture) {
        const [, alt, src, caption] = picture;
        out.push(`<figure class="picture"><img src="${escape(src)}" alt="${escape(alt)}" loading="lazy">`
          + (caption ? `<figcaption>${inline(caption)}</figcaption>` : '') + '</figure>');
      } else if (lines.every(line => /^[-*] /.test(line))) {
        out.push('<ul>' + lines.map(line => `<li>${inline(line.slice(2))}</li>`).join('') + '</ul>');
      } else if (lines.every(line => /^\d+\. /.test(line))) {
        out.push('<ol>' + lines.map(line => `<li>${inline(line.replace(/^\d+\. /, ''))}</li>`).join('') + '</ol>');
      } else if (lines.every(line => line.startsWith('>'))) {
        out.push(`<blockquote>${inline(lines.map(line => line.replace(/^>\s?/, '')).join(' '))}</blockquote>`);
      } else {
        out.push(`<p>${inline(lines.join(' '))}</p>`);
      }
    }
    return out.join('\n');
  }

  /** A block as its kind sees it: its fields, read one or all or split at |, and its body drawn. */
  function block(kind, head, body) {
    const fields = {};
    for (const line of head) {
      const at = line.indexOf(':');
      const key = line.slice(0, at).trim().toLowerCase();
      (fields[key] ||= []).push(line.slice(at + 1).trim());
    }
    return {
      kind, fields, body,
      html: markdown(body),
      one: key => (fields[key] || [])[0] || '',
      all: key => fields[key] || [],
      pairs: key => (fields[key] || []).map(value => value.split('|').map(part => part.trim())),
    };
  }

  /** The file, in order: sections, the Markdown between, and blocks. */
  function parse(text) {
    const lines = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '').split('\n');
    const items = [];
    let prose = [];
    const flush = () => { if (prose.join('').trim()) items.push({type: 'prose', text: prose.join('\n')}); prose = []; };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const opens = line.match(/^:::\s*([\w-]+)\s*$/);
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (opens) {
        flush();
        const head = [], body = [];
        let inHead = true;
        for (i++; i < lines.length && lines[i].trim() !== ':::'; i++) {
          // A field's name is one word in lowercase, so a body that opens with "Music: …" stays a body.
          if (inHead && /^[a-z][a-z0-9-]*:/.test(lines[i]) && !/^\w+:\/\//.test(lines[i])) head.push(lines[i]);
          else { inHead = false; body.push(lines[i]); }
        }
        items.push({type: 'block', block: block(opens[1].toLowerCase(), head, body.join('\n'))});
      } else if (heading) {
        flush();
        items.push({type: 'heading', level: heading[1].length, text: heading[2].trim()});
      } else {
        prose.push(line);
      }
    }
    flush();
    return items;
  }

  /** The page: each ## heading opens a <section> that runs to the next one. */
  function draw(items) {
    const blocks = items.filter(item => item.type === 'block').map(item => item.block);
    let out = '', open = false, number = 0, group = null;
    for (const item of items) {
      const wraps = item.type === 'block' ? groups[item.block.kind] || null : null;
      if (group && wraps !== group) { out += '</div>'; group = null; }
      if (wraps && !group) { out += `<div class="${escape(wraps)}">`; group = wraps; }
      if (item.type === 'heading' && item.level <= 2) {
        if (open) out += '</section>';
        number++;
        const named = item.text.match(/^(.*?)\s*\{#([\w-]+)\}$/);
        const text = named ? named[1] : item.text, id = named ? named[2] : slug(item.text);
        out += `<section id="${id}" data-n="${number}"><h${item.level}>${inline(text)}</h${item.level}>`;
        open = true;
      } else if (item.type === 'heading') {
        out += `<h3>${inline(item.text)}</h3>`;
      } else if (item.type === 'prose') {
        out += `<div class="prose">${markdown(item.text)}</div>`;
      } else {
        const draws = kinds[item.block.kind];
        out += draws ? draws(item.block, Content, blocks)
          : `<div class="block ${escape(item.block.kind)}">${item.block.html}</div>`;
      }
    }
    return out + (group ? '</div>' : '') + (open ? '</section>' : '');
  }

  async function render() {
    const main = document.querySelector('[data-content]');
    if (!main) return;
    try {
      const answer = await fetch(main.dataset.content, {cache: 'no-cache'});
      if (!answer.ok) throw new Error(answer.status + ' ' + answer.statusText);
      notes = 0;
      main.innerHTML = draw(parse(await answer.text()));
    } catch (failed) {
      main.innerHTML = `<p class="content-error">${escape(main.dataset.content)} could not be read (${escape(failed.message)}). `
        + 'A page drawn from a file has to be served, not opened from the disk.</p>';
    }
    document.dispatchEvent(new Event('contentready'));
  }

  const Content = {
    kind: (name, draws, wrap) => { kinds[name] = draws; if (wrap) groups[name] = wrap; },
    inline, markdown, escape, slug, items: parse, render,
  };
  window.Content = Content;
  // The page's own script, after this one, teaches its kinds before the page is done loading.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else queueMicrotask(render);
})();
