# MarkFlow

> A free, open-source Markdown editor that runs entirely in your browser — no account, no cloud, no tracking.

**[Try it live →](https://srart.github.io/markflow)**

---

## Detachable Preview Window

Pop the live preview into its own window with **`Ctrl+Shift+D`** (or *View → Detach Preview Window*).

- **Live sync** — content updates in real time as you type
- **Theme sync** — the detached window inherits the current app theme automatically
- **Multi-monitor friendly** — opens on the opposite half of your screen so you can drag it to a second display
- **Auto-reconnect** — closing the popup restores the inline preview seamlessly
- **Full styling** — tables, code blocks, math, diagrams, and all formatting render exactly as in the main window

Write on one screen, preview on another — ideal for presentations, documentation review, or maximizing editor space.

---

## Features

### Editor
- **CodeMirror 6** source editor with syntax highlighting, line numbers, and auto-pairing
- **Three view modes** — Source, Preview, Split (cycle with `Ctrl+/`)
- **Draggable split divider** with proportional scroll sync
- **Multi-tab documents** — open, edit, and switch between files freely
- **Find & Replace** with regex, case-sensitive toggle, match highlighting in preview
- **Focus Mode** (F8) — dims everything except the current paragraph
- **Typewriter Mode** (F9) — keeps the cursor line centered
- **Zoom** — `Ctrl+=` / `Ctrl+-` / `Ctrl+0` (0.5× – 2.5×)
- **Spell check toggle**, **word wrap toggle** (F10)

### Markdown Support
- **GitHub Flavored Markdown** — tables, task lists, strikethrough, autolinks
- **Math** — inline `$...$` and block `$$...$$` via KaTeX
- **Diagrams** — Mermaid flowcharts, sequence, Gantt, and more
- **Syntax highlighting** — 190+ languages via highlight.js
- **Extended syntax** — `==highlight==`, `++underline++`, `^super^`, `~sub~`, definition lists, footnotes
- **Custom containers** — `::: warning`, `::: info`, `::: tip` with styled icons

### File Operations
- **Native file access** — open, save, and save‑as via File System Access API
- **Open Folder** — browse directories in the sidebar, click to open `.md` files or insert images
- **Drag & drop** files and images into the editor
- **Paste images** from clipboard — uploaded or embedded as base64
- **Auto‑save** every 30 seconds + draft recovery via localStorage
- **File handle persistence** — reopened files retain save access across page reloads (IndexedDB)

### Export
- **5 export themes** — Clean, GitHub, Academic, Dark, Print/SOP
- **Self‑contained HTML** export with all styles inline
- **PDF** via browser print with dedicated print CSS
- **Plain text** download
- **Copy HTML** to clipboard

### Interface
- **5 app themes** — Default, Dark, Solarized, GitHub, Dracula (auto dark mode)
- **Outline panel** — live heading tree with active scroll tracking
- **File browser panel** — directory tree from `Open Folder`
- **Reading progress bar**
- **Word count, character count, line count, reading time** in the status bar
- **Document logo** — set a logo image that appears in preview, export, and print
- **Table editor** — visual grid builder for Markdown tables

### Installable App (PWA)
- Install to desktop — works offline via service worker
- **File handler** — double-click `.md` files to open in MarkFlow
- **Share target** — receive shared files from other apps
- **App shortcut** — "New Document" from the OS app launcher

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
| Cycle View Mode | `Ctrl+/` |
| Toggle Split | `Ctrl+Shift+/` |
| Toggle Sidebar | `Ctrl+Shift+B` |
| **Detach Preview** | **`Ctrl+Shift+D`** |
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
# Open index.html in your browser, or serve locally:
npx serve .
```

> The File System Access API requires Chrome or Edge. Firefox falls back to download-based save.

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
