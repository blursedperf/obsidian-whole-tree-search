import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
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

	getControlValue(key: string): unknown {
		if (key === "excludedFolders") {
			return this.plugin.settings.excludedFolders.join("\n");
		}
		return this.plugin.settings[key as keyof WholeTreeSearchSettings];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const settings = this.plugin.settings as unknown as Record<string, unknown>;
		if (key === "excludedFolders") {
			settings.excludedFolders = String(value)
				.split(/\r?\n/)
				.map(normalizeFolder)
				.filter(Boolean);
		} else {
			settings[key] = value;
		}
		await this.plugin.saveSettings();

		// "Maximum child depth" is only shown while children are included
		if (key === "includeChildren") {
			this.update();
		}
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: "group",
				heading: "Search",
				items: [
					{
						name: "Maximum results",
						desc: "Stop searching once this many matches have been found. Lower values are faster on large vaults.",
						control: { type: "slider", key: "maxResults", min: 10, max: 500, step: 10 },
					},
					{
						name: "Minimum query length",
						desc: "Number of characters to type before searching starts.",
						control: { type: "slider", key: "minQueryLength", min: 1, max: 5, step: 1 },
					},
					{
						name: "Case sensitive",
						desc: "Match the exact capitalization of the query.",
						aliases: ["capitalization", "match case"],
						control: { type: "toggle", key: "caseSensitive" },
					},
					{
						name: "Ignore frontmatter",
						desc: "Do not match lines inside a note's YAML frontmatter.",
						aliases: ["yaml", "properties"],
						control: { type: "toggle", key: "skipFrontmatter" },
					},
					{
						name: "Excluded folders",
						desc: "Notes in these folders (and their subfolders) are not searched. One folder path per line.",
						aliases: ["ignore", "exclude"],
						control: {
							type: "textarea",
							key: "excludedFolders",
							placeholder: "Archive\nTemplates",
							rows: 3,
						},
					},
				],
			},
			{
				type: "group",
				heading: "Context",
				items: [
					{
						name: "Ancestor levels",
						desc: "How many parent levels to show above the matched line. 0 shows no parents; 1 shows the immediate parent.",
						aliases: ["parent", "breadcrumb"],
						control: { type: "slider", key: "ancestorLevels", min: 0, max: 10, step: 1 },
					},
					{
						name: "Show nested children",
						desc: "Include the items nested beneath the matched line.",
						control: { type: "toggle", key: "includeChildren" },
					},
					{
						name: "Maximum child depth",
						desc: "How many levels of nested children to show. 0 shows all levels.",
						visible: () => this.plugin.settings.includeChildren,
						control: { type: "slider", key: "maxChildDepth", min: 0, max: 10, step: 1 },
					},
					{
						name: "Blank lines end a block",
						desc: "Treat an empty line as the end of an outline. Turn off if your lists contain blank lines between items.",
						aliases: ["empty lines"],
						control: { type: "toggle", key: "stopAtBlankLines" },
					},
					{
						name: "Tab width",
						desc: "Number of spaces a tab counts as when comparing indentation of mixed tab/space outlines.",
						aliases: ["indentation", "indent"],
						control: { type: "slider", key: "tabSize", min: 1, max: 8, step: 1 },
					},
				],
			},
			{
				type: "group",
				heading: "Navigation",
				items: [
					{
						name: "Open in new tab by default",
						desc: "When on, Enter opens the result in a new tab and Mod+Enter opens it in the current tab.",
						aliases: ["pane", "leaf"],
						control: { type: "toggle", key: "openInNewTabByDefault" },
					},
				],
			},
		];
	}
}
