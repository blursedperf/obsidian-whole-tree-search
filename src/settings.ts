import { App, PluginSettingTab, Setting } from "obsidian";
import type WholeTreeSearchPlugin from "./main";

export interface WholeTreeSearchSettings {
	maxResults: number;
	minQueryLength: number;
	caseSensitive: boolean;
	skipFrontmatter: boolean;
	excludedFolders: string[];
	ancestorLevels: number;
	includeChildren: boolean;
	maxChildDepth: number;
	stopAtBlankLines: boolean;
	tabSize: number;
	openInNewTabByDefault: boolean;
}

export const DEFAULT_SETTINGS: WholeTreeSearchSettings = {
	maxResults: 50,
	minQueryLength: 1,
	caseSensitive: false,
	skipFrontmatter: false,
	excludedFolders: [],
	ancestorLevels: 1,
	includeChildren: true,
	maxChildDepth: 0,
	stopAtBlankLines: true,
	tabSize: 4,
	openInNewTabByDefault: false,
};

/** Normalizes a folder path for prefix comparison ("Archive/" -> "Archive"). */
export function normalizeFolder(path: string): string {
	return path.trim().replace(/^\/+|\/+$/g, "");
}

export function isPathExcluded(filePath: string, excludedFolders: string[]): boolean {
	return excludedFolders.some((folder) => {
		const f = normalizeFolder(folder);
		return f !== "" && (filePath === f || filePath.startsWith(f + "/"));
	});
}

export class WholeTreeSearchSettingTab extends PluginSettingTab {
	private plugin: WholeTreeSearchPlugin;

	constructor(app: App, plugin: WholeTreeSearchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.plugin.settings;
		const save = () => this.plugin.saveSettings();

		new Setting(containerEl).setName("Search").setHeading();

		new Setting(containerEl)
			.setName("Maximum results")
			.setDesc("Stop searching once this many matches have been found. Lower values are faster on large vaults.")
			.addSlider((slider) =>
				slider
					.setLimits(10, 500, 10)
					.setValue(settings.maxResults)
					.setDynamicTooltip()
					.onChange(async (value) => {
						settings.maxResults = value;
						await save();
					})
			);

		new Setting(containerEl)
			.setName("Minimum query length")
			.setDesc("Number of characters to type before searching starts.")
			.addSlider((slider) =>
				slider
					.setLimits(1, 5, 1)
					.setValue(settings.minQueryLength)
					.setDynamicTooltip()
					.onChange(async (value) => {
						settings.minQueryLength = value;
						await save();
					})
			);

		new Setting(containerEl)
			.setName("Case sensitive")
			.setDesc("Match the exact capitalization of the query.")
			.addToggle((toggle) =>
				toggle.setValue(settings.caseSensitive).onChange(async (value) => {
					settings.caseSensitive = value;
					await save();
				})
			);

		new Setting(containerEl)
			.setName("Ignore frontmatter")
			.setDesc("Do not match lines inside a note's YAML frontmatter.")
			.addToggle((toggle) =>
				toggle.setValue(settings.skipFrontmatter).onChange(async (value) => {
					settings.skipFrontmatter = value;
					await save();
				})
			);

		new Setting(containerEl)
			.setName("Excluded folders")
			.setDesc("Notes in these folders (and their subfolders) are not searched. One folder path per line.")
			.addTextArea((text) =>
				text
					.setPlaceholder("Archive\nTemplates")
					.setValue(settings.excludedFolders.join("\n"))
					.onChange(async (value) => {
						settings.excludedFolders = value
							.split(/\r?\n/)
							.map(normalizeFolder)
							.filter(Boolean);
						await save();
					})
			);

		new Setting(containerEl).setName("Context").setHeading();

		new Setting(containerEl)
			.setName("Ancestor levels")
			.setDesc("How many parent levels to show above the matched line. 0 shows no parents; 1 shows the immediate parent.")
			.addSlider((slider) =>
				slider
					.setLimits(0, 10, 1)
					.setValue(settings.ancestorLevels)
					.setDynamicTooltip()
					.onChange(async (value) => {
						settings.ancestorLevels = value;
						await save();
					})
			);

		new Setting(containerEl)
			.setName("Show nested children")
			.setDesc("Include the items nested beneath the matched line.")
			.addToggle((toggle) =>
				toggle.setValue(settings.includeChildren).onChange(async (value) => {
					settings.includeChildren = value;
					await save();
					this.display();
				})
			);

		if (settings.includeChildren) {
			new Setting(containerEl)
				.setName("Maximum child depth")
				.setDesc("How many levels of nested children to show. 0 shows all levels.")
				.addSlider((slider) =>
					slider
						.setLimits(0, 10, 1)
						.setValue(settings.maxChildDepth)
						.setDynamicTooltip()
						.onChange(async (value) => {
							settings.maxChildDepth = value;
							await save();
						})
				);
		}

		new Setting(containerEl)
			.setName("Blank lines end a block")
			.setDesc("Treat an empty line as the end of an outline. Turn off if your lists contain blank lines between items.")
			.addToggle((toggle) =>
				toggle.setValue(settings.stopAtBlankLines).onChange(async (value) => {
					settings.stopAtBlankLines = value;
					await save();
				})
			);

		new Setting(containerEl)
			.setName("Tab width")
			.setDesc("Number of spaces a tab counts as when comparing indentation of mixed tab/space outlines.")
			.addSlider((slider) =>
				slider
					.setLimits(1, 8, 1)
					.setValue(settings.tabSize)
					.setDynamicTooltip()
					.onChange(async (value) => {
						settings.tabSize = value;
						await save();
					})
			);

		new Setting(containerEl).setName("Navigation").setHeading();

		new Setting(containerEl)
			.setName("Open in new tab by default")
			.setDesc("When on, Enter opens the result in a new tab and Mod+Enter opens it in the current tab.")
			.addToggle((toggle) =>
				toggle.setValue(settings.openInNewTabByDefault).onChange(async (value) => {
					settings.openInNewTabByDefault = value;
					await save();
				})
			);
	}
}
