export interface WholeTreeMatch {
	filePath: string;
	fileName: string;
	matchedLineIndex: number;
	block: string;
}

const INDENT_REGEX = /^\s*/;

/**
 * Calculates the indentation level of a line, accounting for both spaces and tabs.
 * Tabs are normalized to 4 spaces so mixed or tab-based indentation compares accurately.
 */
export function getIndentationLevel(line: string): number {
	const match = line.match(INDENT_REGEX);
	if (!match) return 0;
	return match[0].replace(/\t/g, "    ").length;
}

/**
 * Extracts the "Whole-Tree Block" (Immediate Parent + Matched Line + Nested Children)
 * for a given line index in an array of lines.
 */
export function extractWholeTreeBlock(lines: string[], matchedLineIndex: number): string {
	if (matchedLineIndex < 0 || matchedLineIndex >= lines.length) {
		return "";
	}

	const matchedLine = lines[matchedLineIndex];
	if (matchedLine === undefined) {
		return "";
	}

	const matchIndent = getIndentationLevel(matchedLine);

	// 1. Parent: Iterate backward to find the first preceding line with strictly lesser indentation
	let parentLine: string | null = null;
	if (matchIndent > 0) {
		for (let i = matchedLineIndex - 1; i >= 0; i--) {
			const candidate = lines[i];
			// Stop at empty lines so blank lines aren't treated as 0-indent parents
			if (candidate.trim() === "") {
				break;
			}
			const candidateIndent = getIndentationLevel(candidate);
			if (candidateIndent < matchIndent) {
				parentLine = candidate;
				break;
			}
		}
	}

	// 2. Children: Iterate forward and collect all subsequent lines with strictly greater indentation
	const childrenLines: string[] = [];
	for (let i = matchedLineIndex + 1; i < lines.length; i++) {
		const candidate = lines[i];
		// Stop on empty line
		if (candidate.trim() === "") {
			break;
		}
		const candidateIndent = getIndentationLevel(candidate);
		// Stop as soon as we hit equal or lesser indentation
		if (candidateIndent <= matchIndent) {
			break;
		}
		childrenLines.push(candidate);
	}

	// 3. Combine Parent + Match + Children into a single string chunk
	const blockLines: string[] = [];
	if (parentLine !== null) {
		blockLines.push(parentLine);
	}
	blockLines.push(matchedLine);
	blockLines.push(...childrenLines);

	return blockLines.join("\n");
}

/**
 * Searches the text content of a markdown file and returns all Whole-Tree matches.
 */
export function searchContentForWholeTree(
	content: string,
	query: string,
	filePath = "",
	fileName = ""
): WholeTreeMatch[] {
	const trimmedQuery = query.trim().toLowerCase();
	if (!trimmedQuery) return [];

	const lines = content.split(/\r?\n/);
	const results: WholeTreeMatch[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "") continue;

		if (line.toLowerCase().includes(trimmedQuery)) {
			results.push({
				filePath,
				fileName,
				matchedLineIndex: i,
				block: extractWholeTreeBlock(lines, i),
			});
		}
	}

	return results;
}
