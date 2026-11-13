import {
	App,
	Component,
	Keymap,
	MarkdownRenderer,
	Plugin,
	SuggestModal,
	TFile,
} from "obsidian";
import { searchContentForWholeTree, WholeTreeMatch } from "./parser";
import { makeOfflineMarkdown } from "./offline";

/** Wait this long after the last keystroke before reading the vault. */
const SEARCH_DELAY_MS = 150;

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
import {
	DEFAULT_SETTINGS,
	isPathExcluded,
	WholeTreeSearchSettings,
	WholeTreeSearchSettingTab,
} from "./settings";

export interface VaultTreeSuggestion extends WholeTreeMatch {
	file: TFile;
}

export class WholeTreeSearchModal extends SuggestModal<VaultTreeSuggestion> {
	private currentQuery = "";
	private renderComponent: Component = new Component();
	private settings: WholeTreeSearchSettings;

	constructor(app: App, settings: WholeTreeSearchSettings) {
		super(app);
		this.settings = settings;
		this.limit = settings.maxResults;
		this.setPlaceholder("Type to search hierarchical list blocks across your vault...");
		const newTab = settings.openInNewTabByDefault;
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵", purpose: newTab ? "to open in new tab" : "to jump to line" },
			{ command: "mod ↵", purpose: newTab ? "to jump to line" : "to open in new tab" },
			{ command: "esc", purpose: "to dismiss" },
		]);
	}

	override onOpen(): void {
		void super.onOpen();
		this.renderComponent.load();
	}

	override onClose(): void {
		this.renderComponent.unload();
		super.onClose();
	}

	async getSuggestions(query: string): Promise<VaultTreeSuggestion[]> {
		this.currentQuery = query;

		// Clean up components from previous suggestion batch before rendering new ones
		this.renderComponent.unload();
		this.renderComponent = new Component();
		this.renderComponent.load();

		const settings = this.settings;
		const trimmedQuery = query.trim();
		if (trimmedQuery.length < Math.max(1, settings.minQueryLength)) {
			return [];
		}

		// Search once typing pauses instead of reading the whole vault on every keystroke
		await delay(SEARCH_DELAY_MS);
		if (this.currentQuery !== query) {
			return [];
		}

		const files = this.app.vault
			.getMarkdownFiles()
			.filter((file) => !isPathExcluded(file.path, settings.excludedFolders));
		const suggestions: VaultTreeSuggestion[] = [];

		for (const file of files) {
			// Abort if query changed or maximum limit reached
			if (this.currentQuery !== query) {
				return [];
			}
			const remaining = settings.maxResults - suggestions.length;
			if (remaining <= 0) {
				break;
			}

			const content = await this.app.vault.cachedRead(file);
			if (this.currentQuery !== query) {
				return [];
			}

			const matches = searchContentForWholeTree(content, trimmedQuery, file.path, file.basename, {
				caseSensitive: settings.caseSensitive,
				skipFrontmatter: settings.skipFrontmatter,
				ancestorLevels: settings.ancestorLevels,
				includeChildren: settings.includeChildren,
				maxChildDepth: settings.maxChildDepth,
				stopAtBlankLines: settings.stopAtBlankLines,
				tabSize: settings.tabSize,
				limit: remaining,
			});
			for (const match of matches) {
				suggestions.push({ ...match, file });
			}
		}

		if (this.currentQuery !== query) {
			return [];
		}

		return suggestions;
	}

	renderSuggestion(suggestion: VaultTreeSuggestion, el: HTMLElement): void {
		el.addClass("whole-tree-search-suggestion");

		const headerEl = el.createDiv({ cls: "whole-tree-search-header" });
		headerEl.createSpan({
			cls: "whole-tree-search-filename",
			text: suggestion.file.basename,
		});
		headerEl.createSpan({
			cls: "whole-tree-search-line-badge",
			text: `:${suggestion.matchedLineIndex + 1}`,
		});

		const contentEl = el.createDiv({ cls: "whole-tree-search-content" });
		void MarkdownRenderer.render(
			this.app,
			makeOfflineMarkdown(suggestion.block),
			contentEl,
			suggestion.file.path,
			this.renderComponent
		);
	}

	onChooseSuggestion(
		suggestion: VaultTreeSuggestion,
		evt: MouseEvent | KeyboardEvent
	): void {
		const openInNewLeaf = Keymap.isModEvent(evt)
			? !this.settings.openInNewTabByDefault
			: this.settings.openInNewTabByDefault;
		const leaf = this.app.workspace.getLeaf(openInNewLeaf);
		void leaf.openFile(suggestion.file, {
			eState: { line: suggestion.matchedLineIndex },
		});
	}
}

export default class WholeTreeSearchPlugin extends Plugin {
	settings: WholeTreeSearchSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new WholeTreeSearchSettingTab(this.app, this));

		this.addCommand({
			id: "open",
			name: "Open search",
			callback: () => {
				new WholeTreeSearchModal(this.app, this.settings).open();
			},
		});
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<WholeTreeSearchSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	onunload(): void {}
}
