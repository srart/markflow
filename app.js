/**
 * MarkFlow — app.js  v2.0
 * A free, fully-featured original Markdown editor.
 * MIT License — original work.
 */

/* ===================== SERVICE WORKER ===================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ===================== MERMAID INIT ===================== */
mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });

/* ===================== MARKED EXTENSIONS ===================== */

// --- Highlight ==text== ---
const highlightExt = {
  name: 'highlight',
  level: 'inline',
  start(src) { return src.indexOf('=='); },
  tokenizer(src) {
    const match = /^==([^=]+)==/.exec(src);
    if (match) return { type: 'highlight', raw: match[0], text: match[1] };
  },
  renderer(token) { return `<mark>${token.text}</mark>`; }
};

// --- Underline ++text++ ---
const underlineExt = {
  name: 'underline',
  level: 'inline',
  start(src) { return src.indexOf('++'); },
  tokenizer(src) {
    const match = /^\+\+([^+]+)\+\+/.exec(src);
    if (match) return { type: 'underline', raw: match[0], text: match[1] };
  },
  renderer(token) { return `<u>${token.text}</u>`; }
};

// --- Superscript ^text^ ---
const superscriptExt = {
  name: 'superscript',
  level: 'inline',
  start(src) { return src.indexOf('^'); },
  tokenizer(src) {
    const match = /^\^([^\^\n]+)\^/.exec(src);
    if (match) return { type: 'superscript', raw: match[0], text: match[1] };
  },
  renderer(token) { return `<sup>${token.text}</sup>`; }
};

// --- Subscript ~text~ (single tilde, not ~~) ---
const subscriptExt = {
  name: 'subscript',
  level: 'inline',
  start(src) { return src.indexOf('~'); },
  tokenizer(src) {
    const match = /^~([^~\n]+)~(?!~)/.exec(src);
    if (match) return { type: 'subscript', raw: match[0], text: match[1] };
  },
  renderer(token) { return `<sub>${token.text}</sub>`; }
};

// --- Definition Lists ---
// Term\n: Definition
const defListExt = {
  name: 'deflist',
  level: 'block',
  start(src) { const m = src.match(/^[^\n]+\n:[ \t]/); return m ? m.index : src.length; },
  tokenizer(src) {
    const match = /^((?:[^\n]+\n:[ \t][^\n]*\n?)+)/.exec(src);
    if (!match) return;
    const raw = match[0];
    const items = [];
    const lines = raw.split('\n');
    let current = null;
    for (const line of lines) {
      if (/^:[ \t]/.test(line)) {
        if (current) items.push(current);
        current = { term: '', def: line.replace(/^:[ \t]/, '') };
      } else if (line.trim() && current === null) {
        current = { term: line.trim(), def: '' };
      } else if (line.trim() === '' && current) {
        items.push(current); current = null;
      }
    }
    if (current) items.push(current);
    return { type: 'deflist', raw, items };
  },
  renderer(token) {
    return '<dl>' + token.items.map(i =>
      `<dt>${escapeHtml(i.term)}</dt><dd>${i.def}</dd>`
    ).join('') + '</dl>';
  }
};

// --- Custom containers  ::: warning / info / tip ---
const containerExt = {
  name: 'container',
  level: 'block',
  start(src) {
    // Use /^:::/m so the returned index points directly at the ::: start character
    const m = src.match(/^:::/m);
    return m ? m.index : src.length;
  },
  tokenizer(src) {
    const match = /^:::[ \t]*(warning|info|tip)[^\n]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src);
    if (match) {
      return { type: 'container', raw: match[0], kind: match[1], content: match[2].trim() };
    }
  },
  renderer(token) {
    const titles = { warning: '&#9888; Warning', info: '&#8505; Info', tip: '&#128161; Tip' };
    const inner = marked.parse(token.content);
    return '<div class="container-' + token.kind + '"><div class="container-title">' + titles[token.kind] + '</div>' + inner + '</div>';
  }
};

// Register all extensions
marked.use({ extensions: [highlightExt, underlineExt, superscriptExt, subscriptExt, defListExt, containerExt] });

// Footnotes via marked-footnote plugin
if (typeof markedFootnote !== 'undefined') {
  marked.use(markedFootnote());
}

// Configure marked
marked.use({
  breaks: true,
  gfm: true,
  renderer: (() => {
    const r = new marked.Renderer();
    // Code blocks — handle mermaid separately
    r.code = function(code, lang) {
      const langStr = (lang || '').toLowerCase();
      if (langStr === 'mermaid') {
        return `<div class="mermaid-wrapper"><div class="mermaid">${escapeHtml(code)}</div></div>`;
      }
      try {
        const highlighted = (lang && hljs.getLanguage(lang))
          ? hljs.highlight(code, { language: lang }).value
          : hljs.highlightAuto(code).value;
        return `<pre><code class="hljs language-${escapeHtml(lang || '')}">${highlighted}</code></pre>`;
      } catch {
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
      }
    };
    return r;
  })()
});

/* ===================== STATE ===================== */
const state = {
  fileName: 'Untitled',
  filePath: null,
  dirty: false,
  mode: 'preview',
  theme: 'default',
  zoom: 1,
  focusMode: false,
  typewriterMode: false,
  wordWrap: true,
  spellCheck: true,
  sidebarOpen: true,
  findOpen: false,
};

/* ===================== DEFAULT CONTENT ===================== */
const DEFAULT_CONTENT = `# Welcome to MarkFlow ✦

**MarkFlow** is a free, fully-featured Markdown editor that runs entirely in your browser.

---

## Full Syntax Support

### Text Styles

**Bold**, *italic*, ++underline++, ~~strikethrough~~, ==highlight==, \`inline code\`

Superscript: E = mc^2^  |  Subscript: H~2~O

### Lists

- Unordered item
- Another item
  - Nested item

1. Ordered item
2. Second item

- [x] Completed task
- [ ] Pending task

### Definition List

Apple
: A round fruit, often red or green.

Markdown
: A lightweight markup language for plain text formatting.

### Blockquote

> "Keep it simple." — Unknown

### Code with Syntax Highlighting

\`\`\`python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(10)))
\`\`\`

### Tables

| Language   | Year | Paradigm     |
|------------|------|--------------|
| Python     | 1991 | Multi        |
| JavaScript | 1995 | Multi        |
| Rust       | 2010 | Systems      |

### Math (KaTeX)

Inline: $E = mc^2$

Display:
$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

### Footnotes

Here is a footnote reference[^1] and another one[^2].

[^1]: This is the first footnote.
[^2]: This is the second footnote.

### Custom Containers

::: warning
Be careful! This is a **warning** container.
:::

::: info
This is an **info** container.
:::

::: tip
This is a **tip** container.
:::

### Mermaid Diagrams

\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do this]
  B -->|No| D[Do that]
  C --> E[End]
  D --> E
\`\`\`

### Images

![Placeholder](https://picsum.photos/seed/markflow/700/200)

---

*Happy writing with MarkFlow!*
`;

/* ===================== ELEMENTS ===================== */
const source   = document.getElementById('source');
const preview  = document.getElementById('preview');
const sidebar  = document.getElementById('sidebar');
const outline  = document.getElementById('outline-list');
const statusFile  = document.getElementById('status-file');
const statusStats = document.getElementById('status-stats');
const statusMode  = document.getElementById('status-mode');
const wordCount   = document.getElementById('word-count');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle   = document.getElementById('modal-title');
const modalBody    = document.getElementById('modal-body');
const modalOk      = document.getElementById('modal-ok');
const modalCancel  = document.getElementById('modal-cancel');
const findbar      = document.getElementById('findbar');
const findInput    = document.getElementById('find-input');
const replaceInput = document.getElementById('replace-input');
const findCount    = document.getElementById('find-count');

/* ===================== CODEMIRROR 6 ===================== */
let cmView = null;
(function initCodeMirror() {
  try {
    const { EditorState } = CM_State || window['@codemirror/state'] || {};
    const { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } = CM_View || window['@codemirror/view'] || {};
    const { defaultKeymap, historyKeymap, history, indentWithTab } = CM_Commands || window['@codemirror/commands'] || {};
    const { markdown } = CM_Markdown || window['@codemirror/lang-markdown'] || {};
    const { oneDark } = CM_OneDark || window['@codemirror/theme-one-dark'] || {};
    if (!EditorState || !EditorView || !markdown) return; // CDN failed, use textarea

    const darkTheme = EditorView.theme({
      '&': { height: '100%', fontSize: '15px' },
      '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.7', overflow: 'auto', height: '100%' },
      '.cm-content': { padding: '32px 28px' },
      '.cm-focused': { outline: 'none' },
    });
    const lightTheme = EditorView.theme({
      '&': { height: '100%', fontSize: '15px', background: 'var(--bg)', color: 'var(--fg)' },
      '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.7', overflow: 'auto', height: '100%' },
      '.cm-content': { padding: '32px 28px', caretColor: 'var(--accent)' },
      '.cm-focused': { outline: 'none' },
      '.cm-activeLine': { background: 'var(--bg2)' },
      '.cm-gutters': { background: 'var(--bg2)', borderRight: '1px solid var(--border)', color: 'var(--fg3)' },
      '.cm-activeLineGutter': { background: 'var(--bg3)' },
    });

    function isDarkTheme() {
      return ['dark', 'dracula'].includes(state.theme) ||
        (state.theme === 'default' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged) {
        source.value = update.state.doc.toString();
        onSourceInput();
      }
    });

    const startState = EditorState.create({
      doc: source.value,
      extensions: [
        history(),
        markdown(),
        lineNumbers(),
        drawSelection(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        isDarkTheme() ? oneDark : lightTheme,
        darkTheme,
        updateListener,
        EditorView.lineWrapping,
      ]
    });

    const cmHost = document.createElement('div');
    cmHost.id = 'cm-host';
    source.parentNode.insertBefore(cmHost, source);
    source.style.display = 'none'; // hide raw textarea, use as hidden value store

    cmView = new EditorView({ state: startState, parent: cmHost });

    // Expose a helper to sync CM content from external source.value changes
    window._cmSetContent = (text) => {
      if (!cmView) return;
      cmView.dispatch({ changes: { from: 0, to: cmView.state.doc.length, insert: text } });
    };

    // Expose theme updater
    window._cmSetTheme = (dark) => {
      if (!cmView) return;
      cmView.dispatch({
        effects: EditorView.reconfigure.of([
          history(), markdown(), lineNumbers(), drawSelection(), highlightActiveLine(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          dark ? oneDark : lightTheme, darkTheme, updateListener, EditorView.lineWrapping,
        ])
      });
    };
  } catch (e) {
    console.warn('CodeMirror init failed, using plain textarea:', e);
  }
})();

/* ===================== RENDER ===================== */
async function renderPreview(md) {
  const html = marked.parse(preMath(md || ''));
  preview.innerHTML = postMath(html);

  // Mermaid — render each diagram individually to avoid getBoundingClientRect issues in v11
  for (const el of Array.from(preview.querySelectorAll('.mermaid'))) {
    try {
      const id = 'mermaid-' + Math.random().toString(36).slice(2);
      const { svg } = await mermaid.render(id, el.textContent);
      el.innerHTML = svg;
    } catch (err) {
      el.outerHTML = `<div class="mermaid-error">Diagram error: ${escapeHtml(String(err.message || err))}</div>`;
    }
  }

  // KaTeX
  if (window.renderMathInElement) {
    renderMathInElement(preview, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  updateOutline();
  updateStats(md);

  if (state.findOpen && findInput.value) {
    clearTimeout(_renderTimer);
    applyFindHighlights();
  }
}

/* Protect math from being mangled by marked */
const mathStore = [];
function preMath(md) {
  mathStore.length = 0;
  let i = 0;
  return md
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => { mathStore.push({ t: 'block', v: m }); return `@@MATH${i++}@@`; })
    .replace(/\$([^\n$]+?)\$/g,      (_, m) => { mathStore.push({ t: 'inline', v: m }); return `@@MATH${i++}@@`; });
}
function postMath(html) {
  return html.replace(/@@MATH(\d+)@@/g, (_, idx) => {
    const { t, v } = mathStore[Number(idx)];
    return t === 'block' ? `$$${v}$$` : `$${v}$`;
  });
}

/* ===================== OUTLINE ===================== */
function updateOutline() {
  const headings = preview.querySelectorAll('h1,h2,h3,h4,h5,h6');
  outline.innerHTML = '';
  headings.forEach((h, i) => {
    if (!h.id) h.id = 'mf-h-' + i;
    const li = document.createElement('li');
    li.className = h.tagName.toLowerCase();
    li.textContent = h.textContent;
    li.addEventListener('click', () => {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      outline.querySelectorAll('li').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
    });
    outline.appendChild(li);
  });
}

/* Active outline heading on scroll */
(function () {
  let _outlineTimer = null;
  preview.addEventListener('scroll', () => {
    clearTimeout(_outlineTimer);
    _outlineTimer = setTimeout(() => {
      const headings = Array.from(preview.querySelectorAll('h1,h2,h3,h4,h5,h6'));
      if (!headings.length) return;
      const scrollTop = preview.scrollTop + 80;
      let active = headings[0];
      for (const h of headings) {
        if (h.offsetTop <= scrollTop) active = h;
        else break;
      }
      outline.querySelectorAll('li').forEach(li => {
        li.classList.toggle('active', li.textContent === active.textContent);
      });
    }, 50);
  });
})();

/* ===================== STATS ===================== */
function updateStats(md) {
  const text = (md || '').replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chars = (md || '').length;
  const lines = (md || '').split('\n').length;
  const readMin = Math.max(1, Math.ceil(words / 200));
  statusStats.textContent = `${words} words \u00b7 ${chars} chars \u00b7 ${lines} lines \u00b7 ~${readMin} min read`;
  wordCount.textContent = `${words} words`;
}

/* ===================== DIRTY FLAG ===================== */
function markDirty() { if (!state.dirty) { state.dirty = true; statusFile.classList.add('dirty'); } }
function markClean() { state.dirty = false; statusFile.classList.remove('dirty'); }

/* ===================== TOOLBAR FORMATTING ===================== */
const FMT = {
  bold:             { wrap: ['**', '**'],     placeholder: 'bold text' },
  italic:           { wrap: ['*', '*'],        placeholder: 'italic text' },
  underline:        { wrap: ['++', '++'],      placeholder: 'underlined text' },
  strike:           { wrap: ['~~', '~~'],      placeholder: 'strikethrough' },
  highlight:        { wrap: ['==', '=='],      placeholder: 'highlighted text' },
  superscript:      { wrap: ['^', '^'],        placeholder: 'sup' },
  subscript:        { wrap: ['~', '~'],        placeholder: 'sub' },
  code:             { wrap: ['`', '`'],        placeholder: 'code' },
  math:             { wrap: ['$', '$'],        placeholder: 'x^2' },
  h1:               { prefix: '# ' },
  h2:               { prefix: '## ' },
  h3:               { prefix: '### ' },
  ul:               { prefix: '- ' },
  ol:               { prefix: '1. ' },
  task:             { prefix: '- [ ] ' },
  quote:            { prefix: '> ' },
  deflist:          { insert: '\nTerm\n: Definition\n' },
  hr:               { insert: '\n---\n' },
  codeblock:        { insert: '\n```\ncode here\n```\n' },
  mathblock:        { insert: '\n$$\n\\text{expression}\n$$\n' },
  link:             { insert: '[link text](https://example.com)' },
  image:            { insert: '![alt text](https://example.com/image.png)' },
  table:            { insert: '\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n' },
  mermaid:          { insert: '\n```mermaid\ngraph TD\n  A[Start] --> B[End]\n```\n' },
  footnote:         { insert: '[^fn1]\n\n[^fn1]: Footnote text here.' },
  'container-warning': { insert: '\n::: warning\nContent here.\n:::\n' },
  'container-info':    { insert: '\n::: info\nContent here.\n:::\n' },
  'container-tip':     { insert: '\n::: tip\nContent here.\n:::\n' },
};

function applyFormat(type) {
  const fmt = FMT[type];
  if (!fmt) return;
  if (state.mode !== 'source') setMode('source');
  const ta = source;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const selected = ta.value.slice(start, end);

  if (fmt.insert) {
    ta.setRangeText(fmt.insert, start, end, 'end');
    ta.focus();
  } else if (fmt.wrap) {
    const [open, close] = fmt.wrap;
    const text = selected || fmt.placeholder;
    const insert = open + text + close;
    ta.setRangeText(insert, start, end, 'end');
    ta.setSelectionRange(start + open.length, start + open.length + text.length);
    ta.focus();
  } else if (fmt.prefix) {
    const lines  = (selected || '').split('\n');
    const replacement = selected ? lines.map(l => fmt.prefix + l).join('\n') : fmt.prefix;
    ta.setRangeText(replacement, start, end, 'end');
    ta.focus();
  }

  onSourceInput();
}

document.getElementById('toolbar').addEventListener('click', e => {
  const btn = e.target.closest('button[data-fmt]');
  if (btn) applyFormat(btn.dataset.fmt);
});

/* ===================== SOURCE INPUT ===================== */
let _renderTimer = null;
function onSourceInput() {
  markDirty();
  clearTimeout(_renderTimer);
  _renderTimer = setTimeout(() => renderPreview(source.value), 150);
}

source.addEventListener('input', onSourceInput);

/* ---- Tab & auto-pair ---- */
source.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = source.selectionStart, end = source.selectionEnd;
    if (e.shiftKey) {
      // Unindent: remove up to 2 spaces at line start
      const lineStart = source.value.lastIndexOf('\n', s - 1) + 1;
      const before = source.value.slice(lineStart, s);
      const remove = before.match(/^  /) ? 2 : before.match(/^ /) ? 1 : 0;
      if (remove) {
        source.setRangeText('', lineStart, lineStart + remove, 'end');
      }
    } else {
      source.setRangeText('  ', s, end, 'end');
    }
    onSourceInput();
  }
  // Auto-pair
  const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
  if (pairs[e.key]) {
    const s = source.selectionStart, end = source.selectionEnd;
    if (s !== end) {
      e.preventDefault();
      const selected = source.value.slice(s, end);
      source.setRangeText(e.key + selected + pairs[e.key], s, end, 'end');
      source.setSelectionRange(s + 1, s + 1 + selected.length);
      onSourceInput();
    }
  }
  // Continue list on Enter
  if (e.key === 'Enter') {
    const s = source.selectionStart;
    const line = source.value.slice(source.value.lastIndexOf('\n', s - 1) + 1, s);
    const bul = line.match(/^(\s*)([-*+]|\d+\.) /);
    if (bul) {
      e.preventDefault();
      const prefix = bul[0];
      // If line is empty prefix, remove it
      if (line.trim() === bul[0].trim()) {
        source.setRangeText('\n', source.value.lastIndexOf('\n', s - 1) + 1, s + 1, 'end');
      } else {
        source.setRangeText('\n' + prefix, s, s, 'end');
      }
      onSourceInput();
    }
  }
});

/* ===================== SCROLL POSITION MEMORY ===================== */
const _scrollPos = { source: 0, preview: 0 };
function saveScrollPos() {
  if (state.mode === 'source' || state.mode === 'split') _scrollPos.source = source.scrollTop;
  if (state.mode === 'preview' || state.mode === 'split') _scrollPos.preview = preview.scrollTop;
}
function restoreScrollPos(mode) {
  requestAnimationFrame(() => {
    if (mode === 'source') source.scrollTop = _scrollPos.source;
    else if (mode === 'preview') preview.scrollTop = _scrollPos.preview;
    else if (mode === 'split') { source.scrollTop = _scrollPos.source; preview.scrollTop = _scrollPos.preview; }
  });
}

/* ===================== MODE TOGGLE ===================== */
function setMode(mode) {
  saveScrollPos();
  state.mode = mode;
  document.body.dataset.mode = mode;
  statusMode.textContent = mode === 'source' ? 'Source' : mode === 'split' ? 'Split' : 'Preview';
  if (mode === 'preview' || mode === 'split') renderPreview(source.value).then(() => restoreScrollPos(mode));
  else restoreScrollPos(mode);
  if (mode !== 'preview') source.focus();
}

// Cycle: preview → split → source → preview
document.getElementById('btn-mode-toggle').addEventListener('click', () => {
  const next = { preview: 'split', split: 'source', source: 'preview' };
  setMode(next[state.mode] || 'split');
});

document.getElementById('btn-split-toggle').addEventListener('click', () => {
  setMode(state.mode === 'split' ? 'preview' : 'split');
});

/* ===================== SPLIT PANE DRAG ===================== */
(function () {
  const divider = document.getElementById('split-divider');
  const editorArea = document.getElementById('editor-area');
  let dragging = false, startX = 0, startLeft = 0;

  function leftPane() { return document.getElementById('cm-host') || source; }

  divider.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX;
    startLeft = leftPane().getBoundingClientRect().width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const total = editorArea.getBoundingClientRect().width;
    const newLeft = Math.min(Math.max(startLeft + (e.clientX - startX), 200), total - 200);
    const pct = (newLeft / total * 100).toFixed(1);
    const lp = leftPane();
    lp.style.flex = 'none';
    lp.style.width = pct + '%';
    preview.style.flex = '1';
    preview.style.width = '';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();

/* ===================== SCROLL SYNC (split mode) ===================== */
(function () {
  let syncing = false;
  function syncScroll(from, to) {
    if (state.mode !== 'split') return;
    if (syncing) return;
    syncing = true;
    const pct = from.scrollTop / (from.scrollHeight - from.clientHeight || 1);
    to.scrollTop = pct * (to.scrollHeight - to.clientHeight);
    requestAnimationFrame(() => { syncing = false; });
  }
  source.addEventListener('scroll',  () => syncScroll(source, preview));
  preview.addEventListener('scroll', () => syncScroll(preview, source));
})();

/* ===================== FILE OPERATIONS ===================== */
function newFile() {
  const proceed = () => {
    source.value = ''; if (window._cmSetContent) _cmSetContent('');
    state.fileName = 'Untitled'; state.filePath = null; state._fileHandle = null;
    statusFile.textContent = 'Untitled'; markClean(); renderPreview('');
    setMode('split'); source.focus();
  };
  state.dirty ? showConfirm('Unsaved Changes', 'Discard current changes and start a new document?', proceed) : proceed();
}

async function openFile() {
  if ('showOpenFilePicker' in window) {
    try {
      const [fh] = await window.showOpenFilePicker({
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.txt'] } }]
      });
      const file = await fh.getFile();
      const text = await file.text();
      state._fileHandle = fh;
      source.value = text; if (window._cmSetContent) _cmSetContent(text);
      state.fileName = file.name; state.filePath = file.name;
      statusFile.textContent = file.name; markClean(); renderPreview(source.value); setMode(state.mode);
      return;
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  // Fallback
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.md,.txt,.markdown';
  input.addEventListener('change', () => {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      source.value = evt.target.result; if (window._cmSetContent) _cmSetContent(evt.target.result);
      state.fileName = file.name; state.filePath = file.name;
      statusFile.textContent = file.name; markClean(); renderPreview(source.value); setMode(state.mode);
    };
    reader.readAsText(file);
  });
  input.click();
}

async function saveFile() {
  if (state._fileHandle) {
    try {
      const writable = await state._fileHandle.createWritable();
      await writable.write(source.value);
      await writable.close();
      markClean(); return;
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  const name = state.fileName.endsWith('.md') ? state.fileName : state.fileName + '.md';
  downloadBlob(source.value, name, 'text/markdown');
  markClean();
}

async function saveFileAs() {
  if ('showSaveFilePicker' in window) {
    try {
      const fh = await window.showSaveFilePicker({
        suggestedName: state.fileName.replace(/\.md$/, '') + '.md',
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
      });
      state._fileHandle = fh;
      state.fileName = fh.name || state.fileName;
      statusFile.textContent = state.fileName;
      await saveFile(); return;
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  const name = prompt('File name:', state.fileName.replace(/\.md$/, '') + '.md');
  if (!name) return;
  state.fileName = name; statusFile.textContent = name;
  const blob = new Blob([source.value], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url); markClean();
}

/* ===================== EXPORT THEMES ===================== */
const EXPORT_THEMES = {
  clean: {
    label: 'Clean (Default)',
    css: `*{box-sizing:border-box}body{max-width:820px;margin:40px auto;font-family:Georgia,serif;font-size:17px;line-height:1.8;color:#333;padding:0 24px}h1,h2,h3,h4,h5,h6{font-family:system-ui,sans-serif;margin:1.4em 0 .5em;line-height:1.3}h1{font-size:2em;border-bottom:2px solid #eee;padding-bottom:.3em}h2{font-size:1.5em;border-bottom:1px solid #eee}a{color:#0366d6}mark{background:#ffe066;padding:0 2px;border-radius:2px}sup,sub{font-size:.75em}code{background:#f6f8fa;padding:.12em .35em;border-radius:3px;font-size:.875em;font-family:Consolas,monospace}pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow-x:auto;margin:1em 0}pre code{background:none;padding:0}blockquote{border-left:4px solid #0366d6;margin:1em 0;padding:.5em 1em;background:#f6f8fa;color:#555}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #ddd;padding:8px 12px}th{background:#f6f8fa;font-weight:600}tr:nth-child(even) td{background:#fafafa}img{max-width:100%;border-radius:6px;display:block;margin:1em auto}hr{border:none;border-top:2px solid #eee;margin:2em 0}dl dt{font-weight:700;margin-top:.8em}dl dd{margin:.2em 0 .4em 1.5em;color:#555}.footnotes{margin-top:2em;padding-top:1em;border-top:1px solid #eee;font-size:.9em;color:#555}.container-warning{background:#fff8e1;border-left:4px solid #f9a825;padding:12px 16px;border-radius:0 6px 6px 0;margin:1em 0;color:#5d4037}.container-info{background:#e3f2fd;border-left:4px solid #1565c0;padding:12px 16px;border-radius:0 6px 6px 0;margin:1em 0;color:#0d3756}.container-tip{background:#e8f5e9;border-left:4px solid #2e7d32;padding:12px 16px;border-radius:0 6px 6px 0;margin:1em 0;color:#1b5e20}.container-title{font-weight:700;margin-bottom:6px;font-family:system-ui,sans-serif}.mermaid-wrapper{text-align:center;margin:1.2em 0}`
  },
  github: {
    label: 'GitHub',
    css: `*{box-sizing:border-box}body{max-width:800px;margin:32px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#24292e;padding:0 24px}h1,h2,h3,h4,h5,h6{margin:.6em 0;font-weight:600;line-height:1.25}h1{font-size:2em;padding-bottom:.3em;border-bottom:1px solid #eaecef}h2{font-size:1.5em;padding-bottom:.3em;border-bottom:1px solid #eaecef}a{color:#0366d6}code{background:#f6f8fa;padding:.2em .4em;border-radius:3px;font-size:85%;font-family:SFMono-Regular,Consolas,monospace}pre{background:#f6f8fa;padding:16px;border-radius:6px;overflow:auto;font-size:85%;line-height:1.45}pre code{background:none;padding:0}blockquote{border-left:.25em solid #dfe2e5;color:#6a737d;margin:0;padding:0 1em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe2e5;padding:6px 13px}th{background:#f6f8fa;font-weight:600}tr:nth-child(even){background:#f6f8fa}img{max-width:100%}hr{border:0;border-top:1px solid #eaecef;margin:24px 0}.container-warning{background:#fffbdd;border-left:4px solid #f0a500;padding:12px 16px;margin:1em 0}.container-info{background:#ddf4ff;border-left:4px solid #0969da;padding:12px 16px;margin:1em 0}.container-tip{background:#ddf8e4;border-left:4px solid #1a7f37;padding:12px 16px;margin:1em 0}.container-title{font-weight:700;margin-bottom:4px}`
  },
  academic: {
    label: 'Academic',
    css: `*{box-sizing:border-box}body{max-width:700px;margin:60px auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.6;color:#000;padding:0 24px}h1{font-size:18pt;text-align:center;margin:0 0 6px}h2{font-size:14pt;margin:24px 0 8px}h3{font-size:12pt;font-style:italic;margin:16px 0 6px}a{color:#000;text-decoration:underline}code{font-family:'Courier New',monospace;font-size:10pt;background:#f4f4f4;padding:0 3px}pre{background:#f4f4f4;padding:12px;overflow:auto;font-size:10pt}blockquote{margin:1em 2em;font-style:italic;border-left:3px solid #999;padding-left:1em}table{border-collapse:collapse;width:100%;font-size:11pt;margin:16px 0}th,td{border:1px solid #333;padding:4px 8px}th{background:#eee}img{max-width:100%;display:block;margin:1em auto}hr{border:none;border-top:1px solid #000;margin:2em 0}.footnotes{font-size:10pt;margin-top:2em;border-top:1px solid #000;padding-top:1em}.container-warning,.container-info,.container-tip{border:1px solid #999;padding:8px 12px;margin:1em 0;background:#f9f9f9}.container-title{font-weight:700}`
  },
  dark: {
    label: 'Dark',
    css: `*{box-sizing:border-box}body{max-width:820px;margin:40px auto;font-family:'Segoe UI',system-ui,sans-serif;font-size:16px;line-height:1.7;color:#d4d4d4;background:#1e1e1e;padding:0 24px}h1,h2,h3,h4,h5,h6{color:#e8e8e8;margin:1.3em 0 .5em}h1{font-size:2em;border-bottom:1px solid #3c3c3c;padding-bottom:.3em}h2{font-size:1.5em;border-bottom:1px solid #3c3c3c}a{color:#569cd6}code{background:#2d2d2d;padding:.15em .35em;border-radius:3px;font-size:.875em;font-family:Consolas,monospace;color:#ce9178}pre{background:#2d2d2d;padding:16px;border-radius:6px;overflow:auto}pre code{background:none;color:inherit}blockquote{border-left:4px solid #569cd6;margin:1em 0;padding:.5em 1em;background:#252526;color:#aaa}table{border-collapse:collapse;width:100%}th,td{border:1px solid #3c3c3c;padding:8px 12px}th{background:#252526}tr:nth-child(even) td{background:#252526}img{max-width:100%;border-radius:6px}hr{border:none;border-top:1px solid #3c3c3c;margin:2em 0}mark{background:#4a4000;color:#ffe066}.container-warning{background:#3d3000;border-left:4px solid #f9a825;padding:12px 16px;margin:1em 0;color:#ffe082}.container-info{background:#0d2137;border-left:4px solid #42a5f5;padding:12px 16px;margin:1em 0;color:#90caf9}.container-tip{background:#0d2b0f;border-left:4px solid #66bb6a;padding:12px 16px;margin:1em 0;color:#a5d6a7}.container-title{font-weight:700;margin-bottom:6px}`
  },
  print: {
    label: 'Print / SOP',
    css: `*{box-sizing:border-box}@page{margin:2cm}body{max-width:none;font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;color:#000;padding:0}h1{font-size:18pt;border-bottom:2pt solid #000;padding-bottom:4pt;margin:0 0 12pt}h2{font-size:14pt;border-bottom:1pt solid #000;margin:16pt 0 6pt}h3{font-size:12pt;margin:12pt 0 4pt}a{color:#000}code{font-family:'Courier New',monospace;font-size:9pt;background:#f5f5f5;padding:0 2px}pre{background:#f5f5f5;padding:8pt;border:1pt solid #ccc;overflow:auto;font-size:9pt;page-break-inside:avoid}blockquote{border-left:3pt solid #000;margin:8pt 0;padding-left:10pt}table{border-collapse:collapse;width:100%;font-size:10pt;margin:8pt 0;page-break-inside:avoid}th,td{border:1pt solid #000;padding:4pt 8pt}th{background:#e0e0e0;font-weight:700}img{max-width:100%;page-break-inside:avoid}hr{border:none;border-top:1pt solid #000;margin:12pt 0}.container-warning{border:1pt solid #f9a825;background:#fff8e1;padding:8pt;margin:8pt 0;page-break-inside:avoid}.container-info{border:1pt solid #1565c0;background:#e3f2fd;padding:8pt;margin:8pt 0}.container-tip{border:1pt solid #2e7d32;background:#e8f5e9;padding:8pt;margin:8pt 0}.container-title{font-weight:700;margin-bottom:4pt}`
  }
};
state.exportTheme = 'clean';

function exportHTML() {
  const html = buildHTMLExport(state.exportTheme);
  downloadBlob(html, state.fileName.replace(/\.md$/, '') + '.html', 'text/html');
}

function showExportDialog() {
  const opts = Object.entries(EXPORT_THEMES).map(([k, v]) =>
    `<label style="display:flex;align-items:center;gap:8px;margin:6px 0;cursor:pointer">
      <input type="radio" name="exp-theme" value="${k}" ${state.exportTheme === k ? 'checked' : ''}/>
      ${v.label}
    </label>`
  ).join('');
  showModal('Export as HTML', `<p style="margin-bottom:12px;color:var(--fg2)">Choose export style:</p>${opts}`, { confirm: true })
    .then(ok => {
      if (!ok) return;
      const sel = document.querySelector('input[name="exp-theme"]:checked');
      if (sel) state.exportTheme = sel.value;
      exportHTML();
    });
}

function buildHTMLExport(themeName = 'clean') {
  const theme = EXPORT_THEMES[themeName] || EXPORT_THEMES.clean;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(state.fileName)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css"/>
<style>${theme.css}</style>
</head>
<body>
${preview.innerHTML}
</body>
</html>`;
}

function exportPDF() { window.print(); }

function copyHTMLToClipboard() {
  const text = buildHTMLExport();
  // navigator.clipboard is blocked on file:// origins; use execCommand fallback
  if (navigator.clipboard && location.protocol !== 'file:') {
    navigator.clipboard.writeText(text).then(() => {
      showAlert('Copied', 'HTML copied to clipboard.');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try {
    document.execCommand('copy');
    showAlert('Copied', 'HTML copied to clipboard.');
  } catch {
    showAlert('Error', 'Could not copy. Please use Export as HTML instead.');
  }
  document.body.removeChild(ta);
}

function exportTxt() {
  downloadBlob(source.value, state.fileName.replace(/\.md$/, '') + '.txt', 'text/plain');
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ===================== THEME ===================== */
const HLJS_THEMES = {
  default:   'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css',
  github:    'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css',
  solarized: 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/base16/solarized-light.min.css',
  dark:      'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css',
  dracula:   'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/base16/dracula.min.css',
};
const MERMAID_THEMES = { default: 'default', github: 'default', solarized: 'base', dark: 'dark', dracula: 'dark' };

function setTheme(theme) {
  document.body.className = 'theme-' + theme;
  state.theme = theme;
  document.getElementById('hljs-theme').href = HLJS_THEMES[theme] || HLJS_THEMES.default;
  mermaid.initialize({ startOnLoad: false, theme: MERMAID_THEMES[theme] || 'default', securityLevel: 'strict' });
  if (window._cmSetTheme) _cmSetTheme(['dark','dracula'].includes(theme));
  renderPreview(source.value);
  saveDraft();
}

/* ===================== ZOOM ===================== */
function setZoom(z) {
  state.zoom = Math.min(2.5, Math.max(0.5, Math.round(z * 10) / 10));
  document.documentElement.style.setProperty('--zoom', state.zoom);
}

/* ===================== VIEW MODES ===================== */
function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  document.body.classList.toggle('focus-mode', state.focusMode);
}
function toggleTypewriterMode() {
  state.typewriterMode = !state.typewriterMode;
  document.body.classList.toggle('typewriter-mode', state.typewriterMode);
}
function toggleWordWrap() {
  state.wordWrap = !state.wordWrap;
  source.style.whiteSpace = state.wordWrap ? 'pre-wrap' : 'pre';
}
function toggleSpellCheck() {
  state.spellCheck = !state.spellCheck;
  source.spellcheck = state.spellCheck;
}

/* ===================== FIND & REPLACE ===================== */
let findMatches = [];
let findCurrent = -1;

function openFind(withReplace = false) {
  state.findOpen = true;
  findbar.classList.remove('hidden');
  document.documentElement.style.setProperty('--fb-h', '38px');
  replaceInput.style.display = withReplace ? 'block' : 'none';
  document.getElementById('find-replace-one').style.display = withReplace ? 'inline-block' : 'none';
  document.getElementById('find-replace-all').style.display = withReplace ? 'inline-block' : 'none';
  findInput.focus(); findInput.select();
  if (findInput.value) doFind();
}

function closeFind() {
  state.findOpen = false;
  findbar.classList.add('hidden');
  document.documentElement.style.setProperty('--fb-h', '0px');
  clearFindHighlights();
  source.focus();
}

function doFind() {
  clearFindHighlights();
  const query = findInput.value;
  if (!query) { findCount.textContent = ''; return; }
  const isRx = document.getElementById('find-regex').checked;
  const isCase = document.getElementById('find-case').checked;
  const text = source.value;
  findMatches = [];

  try {
    const flags = isCase ? 'g' : 'gi';
    const rx = isRx ? new RegExp(query, flags) : new RegExp(escapeRegex(query), flags);
    let m;
    while ((m = rx.exec(text)) !== null) {
      findMatches.push({ index: m.index, length: m[0].length });
      if (findMatches.length > 2000) break; // safety cap
    }
  } catch { findCount.textContent = 'Invalid regex'; return; }

  findCount.textContent = findMatches.length ? `${Math.min(findCurrent + 1, findMatches.length)} / ${findMatches.length}` : 'No results';
  if (findMatches.length) {
    findCurrent = 0;
    scrollToMatch(0);
    applyFindHighlights();
  }
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function scrollToMatch(idx) {
  if (!findMatches[idx]) return;
  const m = findMatches[idx];
  source.focus();
  source.setSelectionRange(m.index, m.index + m.length);
  findCurrent = idx;
  findCount.textContent = `${idx + 1} / ${findMatches.length}`;
  // If in preview mode, no selection — just re-render with highlights
}

function findNext() {
  if (!findMatches.length) return doFind();
  findCurrent = (findCurrent + 1) % findMatches.length;
  scrollToMatch(findCurrent);
}
function findPrev() {
  if (!findMatches.length) return doFind();
  findCurrent = (findCurrent - 1 + findMatches.length) % findMatches.length;
  scrollToMatch(findCurrent);
}

function doReplaceOne() {
  if (!findMatches[findCurrent]) { doFind(); return; }
  const m = findMatches[findCurrent];
  source.setRangeText(replaceInput.value, m.index, m.index + m.length, 'end');
  onSourceInput(); doFind();
}
function doReplaceAll() {
  if (!findMatches.length) { doFind(); return; }
  const isRx = document.getElementById('find-regex').checked;
  const isCase = document.getElementById('find-case').checked;
  try {
    const flags = isCase ? 'g' : 'gi';
    const rx = isRx ? new RegExp(findInput.value, flags) : new RegExp(escapeRegex(findInput.value), flags);
    source.value = source.value.replace(rx, replaceInput.value);
    onSourceInput(); doFind();
  } catch { findCount.textContent = 'Invalid regex'; }
}

function applyFindHighlights() {
  if (!findMatches.length) return;
  const query = findInput.value;
  if (!query) return;
  const isRx  = document.getElementById('find-regex').checked;
  const isCase = document.getElementById('find-case').checked;
  const flags = isCase ? 'g' : 'gi';
  try {
    const rx = isRx ? new RegExp(query, flags) : new RegExp(escapeRegex(query), flags);
    // Walk text nodes in preview and wrap matches
    const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      if (!node.textContent.match(rx)) return;
      const parent = node.parentNode;
      if (parent.closest('code, .katex, .mermaid-wrapper')) return;
      const frag = document.createDocumentFragment();
      let last = 0;
      node.textContent.replace(rx, (m, ...args) => {
        const offset = args[args.length - 2];
        frag.appendChild(document.createTextNode(node.textContent.slice(last, offset)));
        const mark = document.createElement('mark');
        mark.className = 'find-highlight';
        mark.textContent = m;
        frag.appendChild(mark);
        last = offset + m.length;
      });
      frag.appendChild(document.createTextNode(node.textContent.slice(last)));
      parent.replaceChild(frag, node);
    });
    // Highlight current match
    const marks = preview.querySelectorAll('.find-highlight');
    if (marks[findCurrent]) {
      marks.forEach(m => m.classList.remove('current'));
      marks[findCurrent].classList.add('current');
      marks[findCurrent].scrollIntoView({ block: 'center' });
    }
  } catch { /* invalid regex */ }
}
function clearFindHighlights() {
  // Remove injected highlight marks
  preview.querySelectorAll('.find-highlight').forEach(m => {
    m.replaceWith(document.createTextNode(m.textContent));
  });
  findMatches = []; findCurrent = -1; findCount.textContent = '';
}

findInput.addEventListener('input', doFind);
findInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.shiftKey ? findPrev() : findNext(); }
  if (e.key === 'Escape') closeFind();
});
document.getElementById('find-prev').addEventListener('click', findPrev);
document.getElementById('find-next').addEventListener('click', findNext);
document.getElementById('find-replace-one').addEventListener('click', doReplaceOne);
document.getElementById('find-replace-all').addEventListener('click', doReplaceAll);
document.getElementById('find-close').addEventListener('click', closeFind);
document.getElementById('find-regex').addEventListener('change', doFind);
document.getElementById('find-case').addEventListener('change', doFind);
document.getElementById('btn-find').addEventListener('click', () => openFind(false));

/* ===================== MODAL HELPERS ===================== */
let modalResolve = null;

function showModal(title, body, { confirm = false } = {}) {
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalCancel.classList.toggle('hidden', !confirm);
  modalOverlay.classList.remove('hidden');
  return new Promise(resolve => { modalResolve = resolve; });
}
function showAlert(title, body) { return showModal(title, body); }
function showConfirm(title, body, onOk) { showModal(title, body, { confirm: true }).then(ok => { if (ok) onOk(); }); }

modalOk.addEventListener('click', () => { modalOverlay.classList.add('hidden'); if (modalResolve) { modalResolve(true); modalResolve = null; } });
modalCancel.addEventListener('click', () => { modalOverlay.classList.add('hidden'); if (modalResolve) { modalResolve(false); modalResolve = null; } });
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) { modalOverlay.classList.add('hidden'); if (modalResolve) { modalResolve(false); modalResolve = null; } } });

/* ===================== CHEATSHEET ===================== */
const CHEATSHEET_HTML = `<div style="columns:2;column-gap:24px;font-size:13px">
<table style="width:100%;border-collapse:collapse;break-inside:avoid;margin-bottom:12px">
<tr><th colspan="2" style="text-align:left;padding:4px 0;border-bottom:1px solid var(--border);font-family:var(--font-ui)">Text Formatting</th></tr>
${[['**bold**','Bold'],['*italic*','Italic'],['++underline++','Underline'],['~~strike~~','Strikethrough'],
   ['==highlight==','Highlight'],['\\`code\\`','Inline Code'],['^sup^','Superscript'],['~sub~','Subscript']
].map(([s,d])=>`<tr><td style="padding:3px 0;font-family:monospace;font-size:12px">${s}</td><td style="padding:3px 0 3px 12px;color:var(--fg2)">${d}</td></tr>`).join('')}
</table>
<table style="width:100%;border-collapse:collapse;break-inside:avoid;margin-bottom:12px">
<tr><th colspan="2" style="text-align:left;padding:4px 0;border-bottom:1px solid var(--border);font-family:var(--font-ui)">Structure</th></tr>
${[['# H1 / ## H2 / ### H3','Headings'],['- item / * item','Unordered list'],
   ['1. item','Ordered list'],['- [x] item','Task list'],['> text','Blockquote'],
   ['---','Horizontal rule'],['[text](url)','Link'],['![alt](url)','Image'],
   ['| H1 | H2 |\\n|---|---|\\n| c1 | c2 |','Table'],
].map(([s,d])=>`<tr><td style="padding:3px 0;font-family:monospace;font-size:11px">${s}</td><td style="padding:3px 0 3px 12px;color:var(--fg2)">${d}</td></tr>`).join('')}
</table>
<table style="width:100%;border-collapse:collapse;break-inside:avoid">
<tr><th colspan="2" style="text-align:left;padding:4px 0;border-bottom:1px solid var(--border);font-family:var(--font-ui)">Extended Syntax</th></tr>
${[['Term\\n: Definition','Definition list'],['[^1]  [^1]: text','Footnote'],
   ['$expr$','Inline math'],['$$\\nexpr\\n$$','Math block'],
   ['\\`\\`\\`mermaid\\n...\\n\\`\\`\\`','Mermaid diagram'],
   ['::: warning\\n...\\n:::','Warning container'],
   ['::: info\\n...\\n:::','Info container'],
   ['::: tip\\n...\\n:::','Tip container'],
].map(([s,d])=>`<tr><td style="padding:3px 0;font-family:monospace;font-size:11px">${escapeHtml(s)}</td><td style="padding:3px 0 3px 12px;color:var(--fg2)">${d}</td></tr>`).join('')}
</table>
</div>`;

/* ===================== SHORTCUTS REFERENCE ===================== */
const SHORTCUTS_HTML = `<table style="width:100%;font-size:13px;border-collapse:collapse">
<thead><tr>
  <th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border)">Action</th>
  <th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border)">Shortcut</th>
</tr></thead><tbody>
${[['New File','Ctrl+N'],['Open File','Ctrl+O'],['Save','Ctrl+S'],['Save As','Ctrl+Shift+S'],
   ['Export HTML','Ctrl+E'],['Print / PDF','Ctrl+P'],['Find','Ctrl+F'],['Find & Replace','Ctrl+H'],
   ['Bold','Ctrl+B'],['Italic','Ctrl+I'],['Underline','Ctrl+U'],
   ['Toggle Source/Preview','Ctrl+/'],['Toggle Outline','Ctrl+Shift+B'],
   ['Focus Mode','F8'],['Typewriter Mode','F9'],['Word Wrap','F10'],
   ['Zoom In','Ctrl+='],['Zoom Out','Ctrl+-'],['Reset Zoom','Ctrl+0'],
].map(([a,k])=>`<tr><td style="padding:5px 8px">${a}</td><td style="padding:5px 8px;font-family:monospace;font-size:12px">${k}</td></tr>`).join('')}
</tbody></table>`;

/* ===================== READING PROGRESS BAR ===================== */
(function () {
  const bar = document.getElementById('progress-bar');
  preview.addEventListener('scroll', () => {
    const pct = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1) * 100;
    bar.style.width = Math.min(100, pct).toFixed(1) + '%';
  });
})();

/* ===================== ABOUT ===================== */
const ABOUT_HTML = `<div style="text-align:center">
  <div style="font-size:2.5em;margin-bottom:8px">✦</div>
  <strong style="font-size:20px">MarkFlow</strong>
  <div style="margin:8px 0;color:var(--fg3)">Version 2.1.0 &mdash; Full Edition</div>
  <p style="margin:12px 0">A free, open-source Markdown editor running entirely in your browser.<br/>No account, no cloud, no tracking.</p>
  <hr style="border:none;border-top:1px solid var(--border);margin:12px 0"/>
  <p style="font-size:12px;color:var(--fg3)">MIT License &middot; Original work<br/>
  Powered by:
  <a href="https://github.com/markedjs/marked" target="_blank" rel="noopener">marked.js</a> (MIT) &middot;
  <a href="https://github.com/highlightjs/highlight.js" target="_blank" rel="noopener">highlight.js</a> (BSD) &middot;
  <a href="https://github.com/KaTeX/KaTeX" target="_blank" rel="noopener">KaTeX</a> (MIT) &middot;
  <a href="https://github.com/mermaid-js/mermaid" target="_blank" rel="noopener">Mermaid</a> (MIT) &middot;
  <a href="https://github.com/bent10/marked-extensions" target="_blank" rel="noopener">marked-footnote</a> (MIT)
  </p>
</div>`;

/* ===================== TABLE EDITOR ===================== */
function showTableEditor() {
  let rows = 3, cols = 3;
  function buildGrid(r, c) {
    let html = `<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;font-size:13px">
      <label>Rows: <input id="te-rows" type="number" min="1" max="20" value="${r}" style="width:50px;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--fg)"/></label>
      <label>Cols: <input id="te-cols" type="number" min="1" max="10" value="${c}" style="width:50px;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--fg)"/></label>
      <button id="te-resize" style="padding:2px 10px;border:1px solid var(--border);border-radius:3px;background:var(--bg3);color:var(--fg);cursor:pointer">Resize</button>
    </div>
    <div style="overflow:auto;max-height:40vh">
    <table style="border-collapse:collapse;font-size:12px">`;
    for (let ri = 0; ri < r; ri++) {
      html += '<tr>';
      for (let ci = 0; ci < c; ci++) {
        const bg = ri === 0 ? 'var(--bg2)' : 'var(--bg)';
        const fw = ri === 0 ? '700' : '400';
        html += `<td style="border:1px solid var(--border);padding:2px"><input data-r="${ri}" data-c="${ci}" type="text" placeholder="${ri===0?'Header':'Cell'}" style="width:90px;padding:3px 5px;border:none;background:${bg};color:var(--fg);font-weight:${fw};font-size:12px;outline:none"/></td>`;
      }
      html += '</tr>';
    }
    html += '</table></div>';
    return html;
  }
  modalTitle.textContent = 'Table Editor';
  modalBody.innerHTML = buildGrid(rows, cols);
  modalCancel.classList.remove('hidden');
  modalOk.textContent = 'Insert';
  modalOverlay.classList.remove('hidden');

  function attachResize() {
    document.getElementById('te-resize')?.addEventListener('click', () => {
      rows = Math.max(1, Math.min(20, parseInt(document.getElementById('te-rows').value) || 3));
      cols = Math.max(1, Math.min(10, parseInt(document.getElementById('te-cols').value) || 3));
      modalBody.innerHTML = buildGrid(rows, cols);
      attachResize();
    });
  }
  attachResize();

  modalResolve = ok => {
    modalOverlay.classList.add('hidden');
    modalOk.textContent = 'OK';
    if (!ok) { modalResolve = null; return; }
    const inputs = modalBody.querySelectorAll('input[data-r]');
    const data = Array.from({ length: rows }, () => Array(cols).fill(''));
    inputs.forEach(inp => { data[+inp.dataset.r][+inp.dataset.c] = inp.value || (inp.dataset.r === '0' ? 'Header' : '&nbsp;'); });
    const sep = data[0].map(() => '---');
    const toRow = row => '| ' + row.join(' | ') + ' |';
    const md = '\n' + toRow(data[0]) + '\n' + toRow(sep) + '\n' + data.slice(1).map(toRow).join('\n') + '\n';
    if (state.mode !== 'source' && state.mode !== 'split') setMode('split');
    const s = source.selectionStart || source.value.length;
    source.setRangeText(md, s, s, 'end');
    if (window._cmSetContent) _cmSetContent(source.value);
    onSourceInput();
    modalResolve = null;
  };
}

/* ===================== MENU ACTIONS ===================== */
document.querySelectorAll('.dropdown li[data-action]').forEach(li => {
  li.addEventListener('click', e => {
    e.stopPropagation();
    switch (li.dataset.action) {
      case 'new':               newFile(); break;
      case 'open':              openFile(); break;
      case 'save':              saveFile(); break;
      case 'saveas':            saveFileAs(); break;
      case 'export-html':       showExportDialog(); break;
      case 'export-pdf':        exportPDF(); break;
      case 'export-txt':        exportTxt(); break;
      case 'copy-html':         copyHTMLToClipboard(); break;
      case 'find':              openFind(false); break;
      case 'replace':           openFind(true); break;
      case 'fmt-bold':          applyFormat('bold'); break;
      case 'fmt-italic':        applyFormat('italic'); break;
      case 'fmt-underline':     applyFormat('underline'); break;
      case 'fmt-strike':        applyFormat('strike'); break;
      case 'fmt-highlight':     applyFormat('highlight'); break;
      case 'fmt-superscript':   applyFormat('superscript'); break;
      case 'fmt-subscript':     applyFormat('subscript'); break;
      case 'fmt-code':          applyFormat('code'); break;
      case 'fmt-codeblock':     applyFormat('codeblock'); break;
      case 'fmt-math':          applyFormat('math'); break;
      case 'fmt-mathblock':     applyFormat('mathblock'); break;
      case 'fmt-link':          applyFormat('link'); break;
      case 'fmt-image':         applyFormat('image'); break;
      case 'fmt-table':         applyFormat('table'); break;
      case 'table-editor':      showTableEditor(); break;
      case 'fmt-mermaid':       applyFormat('mermaid'); break;
      case 'fmt-footnote':      applyFormat('footnote'); break;
      case 'toggle-source':     setMode(state.mode === 'preview' ? 'source' : 'preview'); break;
      case 'toggle-split':      setMode(state.mode === 'split'   ? 'preview' : 'split');  break;
      case 'toggle-sidebar':    toggleSidebar(); break;
      case 'toggle-focus':      toggleFocusMode(); break;
      case 'toggle-typewriter': toggleTypewriterMode(); break;
      case 'toggle-wordwrap':   toggleWordWrap(); break;
      case 'toggle-spellcheck': toggleSpellCheck(); break;
      case 'zoom-in':           setZoom(state.zoom + 0.1); break;
      case 'zoom-out':          setZoom(state.zoom - 0.1); break;
      case 'zoom-reset':        setZoom(1); break;
      case 'theme-default':     setTheme('default'); break;
      case 'theme-dark':        setTheme('dark'); break;
      case 'theme-solarized':   setTheme('solarized'); break;
      case 'theme-github':      setTheme('github'); break;
      case 'theme-dracula':     setTheme('dracula'); break;
      case 'show-cheatsheet':   showAlert('Markdown Cheatsheet', CHEATSHEET_HTML); break;
      case 'show-shortcuts':    showAlert('Keyboard Shortcuts', SHORTCUTS_HTML); break;
      case 'show-about':        showAlert('About MarkFlow', ABOUT_HTML); break;
    }
  });
});

/* ===================== SIDEBAR ===================== */
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  sidebar.classList.toggle('hidden', !state.sidebarOpen);
}

/* ===================== KEYBOARD SHORTCUTS ===================== */
document.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 'n') { e.preventDefault(); newFile(); }
  if (ctrl && e.key === 'o') { e.preventDefault(); openFile(); }
  if (ctrl && e.key === 's' && !e.shiftKey) { e.preventDefault(); saveFile(); }
  if (ctrl && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveFileAs(); }
  if (ctrl && e.key === 'e') { e.preventDefault(); exportHTML(); }
  if (ctrl && e.key === 'p') { e.preventDefault(); exportPDF(); }
  if (ctrl && e.key === 'f') { e.preventDefault(); openFind(false); }
  if (ctrl && e.key === 'h') { e.preventDefault(); openFind(true); }
  if (ctrl && !e.shiftKey && e.key === '/') { e.preventDefault(); const next = { preview: 'split', split: 'source', source: 'preview' }; setMode(next[state.mode] || 'split'); }
  if (ctrl && e.shiftKey && e.key === '/') { e.preventDefault(); setMode(state.mode === 'split' ? 'preview' : 'split'); }
  if (ctrl && e.key === 'b' && !e.shiftKey && state.mode === 'source') { e.preventDefault(); applyFormat('bold'); }
  if (ctrl && e.key === 'i' && state.mode === 'source') { e.preventDefault(); applyFormat('italic'); }
  if (ctrl && e.key === 'u' && state.mode === 'source') { e.preventDefault(); applyFormat('underline'); }
  if (ctrl && e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar(); }
  if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(state.zoom + 0.1); }
  if (ctrl && e.key === '-') { e.preventDefault(); setZoom(state.zoom - 0.1); }
  if (ctrl && e.key === '0') { e.preventDefault(); setZoom(1); }
  if (e.key === 'F8')  { e.preventDefault(); toggleFocusMode(); }
  if (e.key === 'F9')  { e.preventDefault(); toggleTypewriterMode(); }
  if (e.key === 'F10') { e.preventDefault(); toggleWordWrap(); }
  if (e.key === 'Escape') {
    if (state.findOpen) { closeFind(); return; }
    if (!modalOverlay.classList.contains('hidden')) {
      modalOverlay.classList.add('hidden');
      if (modalResolve) { modalResolve(false); modalResolve = null; }
    }
  }
});

/* ===================== UTIL ===================== */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ===================== IMAGE UPLOAD ===================== */
// Upload an image file to 0x0.st (free, no account) and return a URL.
// Falls back to base64 embedding if upload fails or user is offline.
async function uploadImage(file) {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('https://0x0.st', { method: 'POST', body: fd });
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith('https://')) return url;
    }
  } catch { /* offline or blocked — fall through */ }
  return null;
}

async function insertImage(file, altText = 'image') {
  let url = null;
  if (state.imageUpload !== false) {
    url = await uploadImage(file);
  }
  if (!url) {
    // Fallback: base64 embed
    url = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
  const tag = `![${altText}](${url})`;
  const s = source.selectionStart || source.value.length;
  source.setRangeText(tag, s, s, 'end');
  if (window._cmSetContent) _cmSetContent(source.value);
  onSourceInput();
}

/* ===================== IMAGE PASTE ===================== */
document.addEventListener('paste', e => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (state.mode !== 'source' && state.mode !== 'split') setMode('split');
      insertImage(file, 'pasted image');
      break;
    }
  }
});

/* ===================== DRAG & DROP ===================== */
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (/\.(md|txt|markdown)$/i.test(file.name)) {
    const reader = new FileReader();
    reader.onload = evt => {
      source.value = evt.target.result;
      state.fileName = file.name; statusFile.textContent = file.name;
      markClean(); renderPreview(source.value); setMode('preview');
    };
    reader.readAsText(file);
  } else if (file.type.startsWith('image/')) {
    if (state.mode !== 'source' && state.mode !== 'split') setMode('split');
    insertImage(file, file.name.replace(/\.[^.]+$/, ''));
  } else {
    showAlert('Unsupported file', 'Please drop a .md, .txt, .markdown, or image file.');
  }
});

/* ===================== MULTI-TAB ===================== */
const tabs = [];
let activeTabId = null;
const LS_TABS_KEY = 'markflow_v4_tabs';

function createTab(opts = {}) {
  const id = 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const tab = {
    id,
    fileName: opts.fileName || 'Untitled',
    filePath: opts.filePath || null,
    fileHandle: opts.fileHandle || null,
    content: opts.content !== undefined ? opts.content : '',
    dirty: false,
    scrollSource: 0,
    scrollPreview: 0,
  };
  tabs.push(tab);
  renderTabBar();
  return tab;
}

function renderTabBar() {
  const list = document.getElementById('tab-list');
  list.innerHTML = '';
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
    el.dataset.id = tab.id;
    el.innerHTML = `<span class="tab-name${tab.dirty ? ' tab-dirty' : ''}">${escapeHtml(tab.fileName)}</span><span class="tab-close" title="Close tab">\u00d7</span>`;
    el.addEventListener('click', e => {
      if (e.target.classList.contains('tab-close')) { closeTab(tab.id); return; }
      switchTab(tab.id);
    });
    list.appendChild(el);
  });
}

function switchTab(id) {
  // Save current state into active tab
  if (activeTabId) {
    const cur = tabs.find(t => t.id === activeTabId);
    if (cur) {
      cur.content = source.value;
      cur.scrollSource = source.scrollTop;
      cur.scrollPreview = preview.scrollTop;
    }
  }
  activeTabId = id;
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  source.value = tab.content;
  if (window._cmSetContent) _cmSetContent(tab.content);
  state.fileName = tab.fileName;
  state.filePath = tab.filePath;
  state._fileHandle = tab.fileHandle;
  state.dirty = tab.dirty;
  statusFile.textContent = tab.fileName;
  if (tab.dirty) statusFile.classList.add('dirty'); else statusFile.classList.remove('dirty');

  renderPreview(tab.content).then(() => {
    source.scrollTop = tab.scrollSource;
    preview.scrollTop = tab.scrollPreview;
  });
  renderTabBar();
  saveTabs();
}

function closeTab(id) {
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  const doClose = () => {
    const idx = tabs.findIndex(t => t.id === id);
    tabs.splice(idx, 1);
    if (tabs.length === 0) {
      const fresh = createTab({ content: '', fileName: 'Untitled' });
      switchTab(fresh.id);
    } else if (activeTabId === id) {
      const next = tabs[Math.min(idx, tabs.length - 1)];
      switchTab(next.id);
    } else {
      renderTabBar();
    }
    saveTabs();
  };
  tab.dirty ? showConfirm('Unsaved Changes', `Close "${tab.fileName}" without saving?`, doClose) : doClose();
}

function saveTabs() {
  try {
    // Save current content into active tab before persisting
    if (activeTabId) {
      const cur = tabs.find(t => t.id === activeTabId);
      if (cur) cur.content = source.value;
    }
    const data = tabs.map(t => ({ id: t.id, fileName: t.fileName, filePath: t.filePath, content: t.content }));
    localStorage.setItem(LS_TABS_KEY, JSON.stringify({ tabs: data, active: activeTabId }));
  } catch { /* storage full */ }
}

function loadTabs() {
  try {
    const raw = localStorage.getItem(LS_TABS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.tabs && data.tabs.length) {
        data.tabs.forEach(t => tabs.push({ id: t.id, fileName: t.fileName, filePath: t.filePath || null,
          fileHandle: null, content: t.content || '', dirty: false, scrollSource: 0, scrollPreview: 0 }));
        activeTabId = data.active || tabs[0].id;
        renderTabBar();
        const active = tabs.find(t => t.id === activeTabId) || tabs[0];
        source.value = active.content;
        if (window._cmSetContent) _cmSetContent(active.content);
        state.fileName = active.fileName;
        statusFile.textContent = active.fileName;
        return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

// Override markDirty/markClean to also update tab
const _origMarkDirty = markDirty, _origMarkClean = markClean;
function markDirty() {
  _origMarkDirty();
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab) { tab.dirty = true; renderTabBar(); }
}
function markClean() {
  _origMarkClean();
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab) { tab.dirty = false; renderTabBar(); }
}

document.getElementById('btn-new-tab').addEventListener('click', () => {
  const tab = createTab({ content: '', fileName: 'Untitled' });
  switchTab(tab.id);
  setMode(state.mode === 'preview' ? 'split' : state.mode);
});

// Override newFile to create a new tab instead
function newFile() {
  const tab = createTab({ content: DEFAULT_CONTENT, fileName: 'Untitled' });
  switchTab(tab.id);
}

/* ===================== LOCALSTORAGE DRAFT ===================== */
const LS_KEY = 'markflow_v4_draft';

function saveDraft() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      content: source.value, fileName: state.fileName, theme: state.theme
    }));
  } catch { /* storage full */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.content) {
        source.value = data.content;
        if (window._cmSetContent) _cmSetContent(data.content);
        state.fileName = data.fileName || 'Untitled';
      }
      if (data.theme) setTheme(data.theme);
      return !!data.content;
    }
  } catch { /* ignore */ }
  return false;
}

source.addEventListener('input', saveDraft);

/* ===================== INIT ===================== */
(function init() {
  // Auto-detect dark mode if no saved theme
  const raw = (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })();
  const savedTheme = raw ? (() => { try { return JSON.parse(raw).theme; } catch { return null; } })() : null;
  if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setTheme('dark');
  } else {
    const draft = (() => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } })();
    if (draft && draft.theme) setTheme(draft.theme);
  }

  // Load tabs, fall back to old single-draft, fall back to default content
  const hadTabs = loadTabs();
  if (!hadTabs) {
    const hasDraft = loadDraft();
    const content = hasDraft ? source.value : DEFAULT_CONTENT;
    const tab = createTab({ content, fileName: state.fileName || 'Untitled' });
    activeTabId = tab.id;
    source.value = content;
    if (window._cmSetContent) _cmSetContent(content);
    renderTabBar();
  }

  statusFile.textContent = state.fileName;
  renderPreview(source.value);
  setMode('split');
})();

