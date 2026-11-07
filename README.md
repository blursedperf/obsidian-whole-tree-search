# Whole-Tree Search for Obsidian

A fast, lightweight Obsidian search plugin that extracts and renders hierarchical Markdown list blocks—displaying the **matched line**, its **immediate parent**, and all **nested children** based on outline indentation.

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
