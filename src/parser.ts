export interface WholeTreeMatch {
	filePath: string;
	fileName: string;
	matchedLineIndex: number;
	block: string;
}

/**
 * Options controlling how much hierarchical context is extracted around a match.
 */
export interface TreeExtractOptions {
	/** Number of ancestor levels to include above the match (0 = none). */
	ancestorLevels: number;
	/** Whether nested children of the match are included. */
	includeChildren: boolean;
	/** Maximum depth of nested children relative to the match (0 = unlimited). */
	maxChildDepth: number;
	/** Treat a blank line as the end of an outline block. */
	stopAtBlankLines: boolean;
	/** Number of spaces a tab character counts as when comparing indentation. */
	tabSize: number;
	/** Lines before this index are never considered (e.g. frontmatter). */
	minLineIndex: number;
}

export interface TreeSearchOptions extends TreeExtractOptions {
	caseSensitive: boolean;
	skipFrontmatter: boolean;
	/** Maximum number of matches to return (0 = unlimited). */
	limit: number;
}

export const DEFAULT_EXTRACT_OPTIONS: TreeExtractOptions = {
	ancestorLevels: 1,
	includeChildren: true,
	maxChildDepth: 0,
	stopAtBlankLines: true,
	tabSize: 4,
	minLineIndex: 0,
};

export const DEFAULT_SEARCH_OPTIONS: TreeSearchOptions = {
	...DEFAULT_EXTRACT_OPTIONS,
	caseSensitive: false,
	skipFrontmatter: false,
	limit: 0,
};

const INDENT_REGEX = /^\s*/;

/**
 * Calculates the indentation level of a line, accounting for both spaces and tabs.
 * Tabs are normalized to `tabSize` spaces so mixed or tab-based indentation compares accurately.
 */
export function getIndentationLevel(line: string, tabSize = 4): number {
	const match = line.match(INDENT_REGEX);
	if (!match) return 0;
	let width = 0;
	for (const ch of match[0]) {
		width += ch === "\t" ? tabSize : 1;
	}
	return width;
}

/**
 * Returns the index of the first line after a YAML frontmatter block, or 0 if there is none.
 */
export function getFrontmatterEndIndex(lines: string[]): number {
	if (lines.length === 0 || lines[0].trim() !== "---") return 0;
	for (let i = 1; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (trimmed === "---" || trimmed === "...") {
			return i + 1;
		}
	}
	return 0;
}

/**
 * Extracts the "Whole-Tree Block" (Ancestors + Matched Line + Nested Children)
 * for a given line index in an array of lines.
 */
export function extractWholeTreeBlock(
	lines: string[],
	matchedLineIndex: number,
	options: Partial<TreeExtractOptions> = {}
): string {
	const opts: TreeExtractOptions = { ...DEFAULT_EXTRACT_OPTIONS, ...options };

	if (matchedLineIndex < 0 || matchedLineIndex >= lines.length) {
		return "";
	}

	const matchedLine = lines[matchedLineIndex];
	if (matchedLine === undefined) {
		return "";
	}

	const matchIndent = getIndentationLevel(matchedLine, opts.tabSize);

	// 1. Ancestors: walk backward, each time taking the first line with strictly lesser
	//    indentation than the last one found, until enough levels or the root is reached.
	const ancestorLines: string[] = [];
	let threshold = matchIndent;
	for (
		let i = matchedLineIndex - 1;
		i >= opts.minLineIndex && ancestorLines.length < opts.ancestorLevels && threshold > 0;
		i--
	) {
		const candidate = lines[i];
		if (candidate.trim() === "") {
			// Blank lines are never treated as 0-indent parents
			if (opts.stopAtBlankLines) break;
			continue;
		}
		const candidateIndent = getIndentationLevel(candidate, opts.tabSize);
		if (candidateIndent < threshold) {
			ancestorLines.unshift(candidate);
			threshold = candidateIndent;
		}
	}

	// 2. Children: walk forward collecting lines with strictly greater indentation.
	const childrenLines: string[] = [];
	if (opts.includeChildren) {
		// Stack of indentation widths for the current child path; its length is the depth.
		const indentStack: number[] = [];
		for (let i = matchedLineIndex + 1; i < lines.length; i++) {
			const candidate = lines[i];
			if (candidate.trim() === "") {
				if (opts.stopAtBlankLines) break;
				continue;
			}
			const candidateIndent = getIndentationLevel(candidate, opts.tabSize);
			// Stop as soon as we hit equal or lesser indentation
			if (candidateIndent <= matchIndent) {
				break;
			}
			while (indentStack.length > 0 && indentStack[indentStack.length - 1] >= candidateIndent) {
				indentStack.pop();
			}
			indentStack.push(candidateIndent);
			if (opts.maxChildDepth > 0 && indentStack.length > opts.maxChildDepth) {
				continue;
			}
			childrenLines.push(candidate);
		}
	}

	// 3. Combine Ancestors + Match + Children into a single string chunk
	return [...ancestorLines, matchedLine, ...childrenLines].join("\n");
}

/**
 * Searches the text content of a markdown file and returns all Whole-Tree matches.
 */
export function searchContentForWholeTree(
	content: string,
	query: string,
	filePath = "",
	fileName = "",
	options: Partial<TreeSearchOptions> = {}
): WholeTreeMatch[] {
	const opts: TreeSearchOptions = { ...DEFAULT_SEARCH_OPTIONS, ...options };
	const trimmedQuery = query.trim();
	if (!trimmedQuery) return [];

	const needle = opts.caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase();
	const normalize = (s: string) => (opts.caseSensitive ? s : s.toLowerCase());

	// Cheap whole-file check before splitting into lines
	if (!normalize(content).includes(needle)) return [];

	const lines = content.split(/\r?\n/);
	const startIndex = opts.skipFrontmatter ? getFrontmatterEndIndex(lines) : 0;
	const extractOpts: TreeExtractOptions = { ...opts, minLineIndex: startIndex };
	const results: WholeTreeMatch[] = [];

	for (let i = startIndex; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "") continue;

		if (normalize(line).includes(needle)) {
			results.push({
				filePath,
				fileName,
				matchedLineIndex: i,
				block: extractWholeTreeBlock(lines, i, extractOpts),
			});
			if (opts.limit > 0 && results.length >= opts.limit) break;
		}
	}

	return results;
}
