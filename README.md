# Whole-Tree Search for Obsidian

A fast, lightweight Obsidian search plugin that extracts and renders hierarchical Markdown list blocks—displaying the **matched line**, its **parent(s)**, and all **nested children** based on outline indentation.

---

## The Problem

When searching through outlines, nested task lists, or meeting notes in Obsidian, standard search displays only the isolated matching line. You lose:
- Which project or milestone the task belonged to (the parent context).
- Which subtasks or action points were grouped underneath it (the child context).

## The Solution

**Whole-Tree Search** searches your vault and reconstructs the full hierarchical tree block:

```text
- Project Alpha                     <-- [Immediate Parent]
  - Milestone 1: Database Schema   <-- [MATCHED LINE]
    - Users table                   <-- [Nested Child 1]
    - Sessions table                <-- [Nested Child 2]
```

---

## Features

- **Hierarchical Outline Context**: Instantly visualizes the parent item and all child items of any matched line based on indentation (spaces or tabs).
- **Rich Markdown Preview**: Renders search results using Obsidian's native Markdown renderer, preserving formatting, tags, code snippets, and internal links.
- **Fast Vault Traversal**: Uses Obsidian's `cachedRead` API and query cancellation to ensure smooth, responsive search even across large vaults.
- **Keyboard Navigation**:
  - `↑` / `↓`: Navigate suggestions.
  - `↵` (`Enter`): Jump directly to the matched line in the note.
  - `mod + ↵` (`Cmd + Enter` / `Ctrl + Enter`): Open note in a new tab/pane at the matched line.
  - `esc`: Dismiss search modal.
- **100% Offline & Private**: Zero network calls, zero telemetry, and zero external dependencies. Confined strictly to your local vault.
- **Mobile & Desktop Compatible**: Works seamlessly on macOS, Windows, Linux, iOS, and Android.

---

## Security & Privacy Policy

Whole-Tree Search is built with strict privacy and security principles:

- **Zero Network Calls**: The plugin makes no network calls, HTTP requests, WebSockets, or remote telemetry pings.
- **Offline audit**: Every test run checks the source, built bundle and styles with `scripts/offline-audit.mjs`, which fails on any network API (`fetch`, `XMLHttpRequest`, WebSocket, `requestUrl`, workers, dynamic `import()`, ...), dynamic code (`eval`, `new Function`), raw HTML injection, or remote CSS (`@import`, non-`data:` `url()`).
- **Remote content is never loaded**: Before a result is rendered, remote images (`![](https://...)`), raw HTML that loads resources (`<img>`, `<iframe>`, `<video>`, ...) and embeds of other notes are neutralised, so searching never makes a network request. Embeds of local images, audio, video and PDFs still show.
- **Confined to Local Vault**: The plugin reads Markdown files within your vault using Obsidian's official `app.vault` API and does not touch files outside your vault.
- **Safe DOM Rendering**: All user interface elements are rendered using Obsidian's official DOM creation and `MarkdownRenderer.render` APIs. No raw HTML strings or `eval` statements are used.
- **No Memory Leaks**: Suggestion components adhere to Obsidian's `Component` lifecycle management, properly loading and unloading DOM listeners between keystrokes and modal sessions.

---

## Installation

### Community Plugins
1. Open **Settings** > **Community plugins** in Obsidian.
2. Turn off **Restricted mode**.
3. Click **Browse** and search for `Whole-Tree Search`.
4. Click **Install**, then **Enable**.

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub Release](https://github.com/blursedperf/obsidian-whole-tree-search/releases).
2. Create a folder named `whole-tree-search` in your vault's plugin directory: `<vault>/.obsidian/plugins/whole-tree-search/`.
3. Copy the downloaded files into that folder.
4. Reload Obsidian and enable **Whole-Tree Search** under **Community plugins**.

---

## Usage

1. Open the Command Palette (`Ctrl + P` or `Cmd + P`).
2. Type and select **Open whole-tree search**.
3. Type your search query.
4. Press `Enter` to navigate to the matched line in the note, or `Cmd/Ctrl + Enter` to open in a new tab.

*(Tip: Assign a custom hotkey to `Open whole-tree search` in **Settings > Hotkeys** for quick access).*

---

## Settings

Open **Settings > Community plugins > Whole-Tree Search** to configure the options below. On Obsidian 1.13+ every setting is also discoverable through the settings search.

| Setting | Default | Description |
| --- | --- | --- |
| **Maximum results** | 50 | Stop searching once this many matches are found. |
| **Minimum query length** | 1 | Characters to type before searching starts. |
| **Case sensitive** | Off | Match the exact capitalization of the query. |
| **Ignore frontmatter** | Off | Skip matches inside YAML frontmatter. |
| **Excluded folders** | — | Folders (one per line) whose notes are never searched, including subfolders. |
| **Ancestor levels** | 1 | Parent levels shown above the match (0 = none, 1 = immediate parent, higher = full path). |
| **Show nested children** | On | Include items nested beneath the match. |
| **Maximum child depth** | 0 | Levels of children to show (0 = all). |
| **Blank lines end a block** | On | Treat empty lines as the end of an outline; turn off for lists with blank lines between items. |
| **Tab width** | 4 | Spaces a tab counts as when comparing mixed tab/space indentation. |
| **Open in new tab by default** | Off | Swap `Enter` and `Mod + Enter` so results open in a new tab by default. |

---

## Development

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Build for development
npm run dev

# Build for production
npm run build
```

---

## License

[MIT](LICENSE) © blursedperf
