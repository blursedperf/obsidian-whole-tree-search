import {
	App,
	Component,
	Keymap,
	MarkdownRenderer,
	Plugin,
	SuggestModal,
	TFile,
} from "obsidian";
import {
	extractWholeTreeBlock,
	WholeTreeMatch,
} from "./parser";

export interface VaultTreeSuggestion extends WholeTreeMatch {
	file: TFile;
}

export class WholeTreeSearchModal extends SuggestModal<VaultTreeSuggestion> {
	private maxResults = 50;
	private currentQuery = "";
	private renderComponent: Component = new Component();

	constructor(app: App) {
		super(app);
		this.setPlaceholder("Type to search hierarchical list blocks across your vault...");
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵", purpose: "to jump to line" },
			{ command: "mod ↵", purpose: "to open in new tab" },
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

		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) {
			return [];
		}

		const files = this.app.vault.getMarkdownFiles();
		const suggestions: VaultTreeSuggestion[] = [];

		for (const file of files) {
			// Abort if query changed or maximum limit reached
			if (this.currentQuery !== query) {
				return [];
			}
			if (suggestions.length >= this.maxResults) {
				break;
			}

			const content = await this.app.vault.cachedRead(file);
			if (this.currentQuery !== query) {
				return [];
			}

			if (!content.toLowerCase().includes(normalizedQuery)) {
				continue;
			}

			const lines = content.split(/\r?\n/);
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (line.trim() === "") continue;

				if (line.toLowerCase().includes(normalizedQuery)) {
					const block = extractWholeTreeBlock(lines, i);
					suggestions.push({
						file,
						filePath: file.path,
						fileName: file.basename,
						matchedLineIndex: i,
						block,
					});

					if (suggestions.length >= this.maxResults) {
						break;
					}
				}
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
			suggestion.block,
			contentEl,
			suggestion.file.path,
			this.renderComponent
		);
	}

	onChooseSuggestion(
		suggestion: VaultTreeSuggestion,
		evt: MouseEvent | KeyboardEvent
	): void {
		const openInNewLeaf = Keymap.isModEvent(evt);
		const leaf = this.app.workspace.getLeaf(openInNewLeaf);
		void leaf.openFile(suggestion.file, {
			eState: { line: suggestion.matchedLineIndex },
		});
	}
}

export default class WholeTreeSearchPlugin extends Plugin {
	async onload(): Promise<void> {
		this.addCommand({
			id: "open",
			name: "Open search",
			callback: () => {
				new WholeTreeSearchModal(this.app).open();
			},
		});
	}

	onunload(): void {}
}
