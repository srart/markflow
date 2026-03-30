# MarkFlow

> A free, open-source Markdown editor that runs entirely in your browser — no account, no cloud, no tracking.

**[Try it live →](https://srart.github.io/markflow)**

---

## Features

### Editor
- **Split-pane live preview** — edit and see rendered output side by side
- **CodeMirror 6** source editor with syntax highlighting and auto-pairing
- **Three view modes** — Edit, Preview, Split (cycle with `Ctrl+/`)
- **Word wrap, spell check, focus mode, typewriter mode**
- **Find & Replace** with live highlights in both source and preview
- **Auto-save to file** every 30 seconds (when a file is open)
- **Draft auto-save** to localStorage — never lose unsaved work

### Tabs
- **Multi-tab documents** — open multiple files at once
- Tab state (content, scroll position) persisted across sessions

### Markdown Support
- Full **GitHub Flavored Markdown** (GFM)
- **Math** — inline `$...$` and block `$$...$$` via KaTeX
- **Diagrams** — Mermaid (flowcharts, sequence, Gantt, etc.)
- **Syntax highlighting** — via highlight.js
- **Definition lists**, **footnotes**, **containers** (warning / info / tip)
- **Superscript**, **subscript**, **underline**, **highlight**, **strikethrough**

### Export
- **5 export themes** — Clean, GitHub, Academic, Dark, Print/SOP
- Export as **self-contained HTML** (all styles inline)
- **Export PDF** via browser print
- Export as **plain text**
- Copy rendered HTML to clipboard

### Files
- **File System Access API** — open and save `.md` files directly on disk
- **Drag & drop** files into the editor
- **Image paste** — paste images from clipboard, auto-uploaded to [0x0.st](https://0x0.st) or embedded as base64

### Interface
- **5 themes** — Default, Dark, Solarized, GitHub, Dracula
- **Auto dark mode** — respects `prefers-color-scheme`
- **Outline panel** — live heading tree with scroll tracking
- **Reading progress bar**
- **Table editor** — visual grid UI for building Markdown tables
- **Zoom control** (`Ctrl+=` / `Ctrl+-` / `Ctrl+0`)
- **PWA** — installable as a desktop app, works offline

---

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| New File | `Ctrl+N` |
| Open File | `Ctrl+O` |
| Save | `Ctrl+S` |
| Save As | `Ctrl+Shift+S` |
| Export HTML | `Ctrl+E` |
| Print / PDF | `Ctrl+P` |
| Find | `Ctrl+F` |
| Find & Replace | `Ctrl+H` |
| Bold | `Ctrl+B` |
| Italic | `Ctrl+I` |
| Underline | `Ctrl+U` |
| Toggle Source/Preview | `Ctrl+/` |
| Toggle Split | `Ctrl+Shift+/` |
| Toggle Outline | `Ctrl+Shift+B` |
| Focus Mode | `F8` |
| Typewriter Mode | `F9` |
| Word Wrap | `F10` |
| Zoom In / Out / Reset | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` |

---

## Running Locally

No build step required. Just open `index.html` in any modern browser:

```bash
git clone https://github.com/srart/markflow.git
cd markflow
# Open index.html in your browser
# Or serve it locally:
npx serve .
```

> The File System Access API requires a browser that supports it (Chrome, Edge). Firefox falls back to download-based save.

---

## Tech Stack

All loaded via CDN — zero npm, zero build tools.

| Library | Purpose |
|---|---|
| [marked.js v12](https://github.com/markedjs/marked) | Markdown parser |
| [marked-footnote](https://github.com/bent10/marked-extensions) | Footnote extension |
| [highlight.js v11](https://github.com/highlightjs/highlight.js) | Syntax highlighting |
| [KaTeX v0.16](https://github.com/KaTeX/KaTeX) | Math rendering |
| [Mermaid v11](https://github.com/mermaid-js/mermaid) | Diagram rendering |
| [CodeMirror 6](https://codemirror.net) | Source editor |

---

## Author

**Eric Chi** ([@8l8l8](https://github.com/srart))  
Built with the assistance of [GitHub Copilot](https://github.com/features/copilot)

☕ [Buy me a coffee](https://paypal.me/8l8l8) — if MarkFlow saves you time, a small tip is always appreciated!

---

## License

MIT — free to use, modify, and distribute.
