import * as assert from "assert";
import {
	extractWholeTreeBlock,
	getFrontmatterEndIndex,
	getIndentationLevel,
	searchContentForWholeTree,
	dedentBlock,
} from "../src/parser";
import { makeOfflineMarkdown } from "../src/offline";

// Test 1: Indentation level tracking with spaces and tabs
assert.strictEqual(getIndentationLevel("- Root item"), 0);
assert.strictEqual(getIndentationLevel("  - Two spaces"), 2);
assert.strictEqual(getIndentationLevel("    - Four spaces"), 4);
assert.strictEqual(getIndentationLevel("\t- One tab"), 4);
assert.strictEqual(getIndentationLevel("\t\t- Two tabs"), 8);

// Test 2: Extracting Parent + Match + Children with space indentation
const sampleMarkdown = [
	"- Project Alpha",
	"  - **Milestone 1**: Architecture & Design",
	"    - Define database schema",
	"      - Users table",
	"      - Sessions table",
	"    - Draft API specification",
	"  - **Milestone 2**: Implementation",
	"    - Build authentication service",
	"",
	"- Unrelated Root Note",
].join("\n");

const lines = sampleMarkdown.split("\n");

// Match on "Milestone 1" (line index 1):
// Should include Parent ("- Project Alpha"), Match ("  - **Milestone 1**..."),
// and all nested children (lines 2, 3, 4, 5), stopping before "  - **Milestone 2**" (equal indent).
const milestoneBlock = extractWholeTreeBlock(lines, 1);
assert.strictEqual(
	milestoneBlock,
	[
		"- Project Alpha",
		"  - **Milestone 1**: Architecture & Design",
		"    - Define database schema",
		"      - Users table",
		"      - Sessions table",
		"    - Draft API specification",
	].join("\n")
);

// Match on "Define database schema" (line index 2):
// Immediate parent is line 1 ("  - **Milestone 1**..."), children are lines 3 & 4 ("      - Users table", "      - Sessions table"),
// stops at line 5 ("    - Draft API specification") because it has equal indentation.
const schemaBlock = extractWholeTreeBlock(lines, 2);
assert.strictEqual(
	schemaBlock,
	[
		"  - **Milestone 1**: Architecture & Design",
		"    - Define database schema",
		"      - Users table",
		"      - Sessions table",
	].join("\n")
);

// Match on "Milestone 2" (line index 6):
// Should stop at empty line (line index 8)
const milestone2Block = extractWholeTreeBlock(lines, 6);
assert.strictEqual(
	milestone2Block,
	[
		"- Project Alpha",
		"  - **Milestone 2**: Implementation",
		"    - Build authentication service",
	].join("\n")
);

// Test 3: Tab indentation support
const tabMarkdown = [
	"- Root Topic",
	"\t- Subtopic ==highlighted==",
	"\t\t- Child detail 1",
	"\t\t- Child detail 2",
	"\t- Sibling subtopic",
].join("\n");

const tabResults = searchContentForWholeTree(tabMarkdown, "highlighted", "notes.md", "notes");
assert.strictEqual(tabResults.length, 1);
assert.strictEqual(tabResults[0].matchedLineIndex, 1);
assert.strictEqual(
	tabResults[0].block,
	[
		"- Root Topic",
		"\t- Subtopic ==highlighted==",
		"\t\t- Child detail 1",
		"\t\t- Child detail 2",
	].join("\n")
);

// Test 4: Edge cases & Bounds safety
assert.strictEqual(extractWholeTreeBlock([], 0), "");
assert.strictEqual(extractWholeTreeBlock(["- single line"], -1), "");
assert.strictEqual(extractWholeTreeBlock(["- single line"], 5), "");
assert.strictEqual(searchContentForWholeTree("", "test").length, 0);
assert.strictEqual(searchContentForWholeTree("line 1\nline 2", "   ").length, 0);

// Test 5: Configurable tab width
assert.strictEqual(getIndentationLevel("\t- One tab", 2), 2);
assert.strictEqual(getIndentationLevel("\t  - Tab + two spaces", 2), 4);

// Test 6: Ancestor levels
// Line 3 ("Users table") with 2 ancestor levels -> "Milestone 1", "Define database schema"
assert.strictEqual(
	extractWholeTreeBlock(lines, 3, { ancestorLevels: 2 }),
	[
		"  - **Milestone 1**: Architecture & Design",
		"    - Define database schema",
		"      - Users table",
	].join("\n")
);
// All ancestors up to the root
assert.strictEqual(
	extractWholeTreeBlock(lines, 3, { ancestorLevels: 10 }),
	[
		"- Project Alpha",
		"  - **Milestone 1**: Architecture & Design",
		"    - Define database schema",
		"      - Users table",
	].join("\n")
);
// No ancestors
assert.strictEqual(
	extractWholeTreeBlock(lines, 2, { ancestorLevels: 0, includeChildren: false }),
	"    - Define database schema"
);

// Test 7: Child depth limit
assert.strictEqual(
	extractWholeTreeBlock(lines, 1, { maxChildDepth: 1 }),
	[
		"- Project Alpha",
		"  - **Milestone 1**: Architecture & Design",
		"    - Define database schema",
		"    - Draft API specification",
	].join("\n")
);
assert.strictEqual(
	extractWholeTreeBlock(lines, 0, { includeChildren: false }),
	"- Project Alpha"
);

// Test 8: Blank lines inside an outline
const spacedMarkdown = ["- Parent", "", "  - Child A", "", "  - Child B", "- Next root"];
assert.strictEqual(extractWholeTreeBlock(spacedMarkdown, 0), "- Parent");
assert.strictEqual(
	extractWholeTreeBlock(spacedMarkdown, 0, { stopAtBlankLines: false }),
	["- Parent", "  - Child A", "  - Child B"].join("\n")
);
assert.strictEqual(
	extractWholeTreeBlock(spacedMarkdown, 4, { stopAtBlankLines: false }),
	["- Parent", "  - Child B"].join("\n")
);
assert.strictEqual(extractWholeTreeBlock(spacedMarkdown, 4), "  - Child B");

// Test 9: Case sensitivity
assert.strictEqual(searchContentForWholeTree("- Alpha\n- alpha", "Alpha").length, 2);
assert.strictEqual(
	searchContentForWholeTree("- Alpha\n- alpha", "Alpha", "", "", { caseSensitive: true }).length,
	1
);

// Test 10: Frontmatter skipping
const fmMarkdown = ["---", "tags: alpha", "---", "- alpha item"].join("\n");
assert.strictEqual(getFrontmatterEndIndex(fmMarkdown.split("\n")), 3);
assert.strictEqual(getFrontmatterEndIndex(["- no frontmatter"]), 0);
assert.strictEqual(searchContentForWholeTree(fmMarkdown, "alpha").length, 2);
const fmResults = searchContentForWholeTree(fmMarkdown, "alpha", "", "", { skipFrontmatter: true });
assert.strictEqual(fmResults.length, 1);
assert.strictEqual(fmResults[0].matchedLineIndex, 3);

// Test 11: Result limit
assert.strictEqual(searchContentForWholeTree("- a\n- a\n- a", "a", "", "", { limit: 2 }).length, 2);

// Rendered results never load remote content
{
	const out = makeOfflineMarkdown(
		[
			"- ![logo](https://example.com/a.png) and ![[Embedded note]]",
			"  - ![[diagram.png]] <img src=\"https://x/y.png\"> <iframe src=\"https://yt\"></iframe>",
			"  - `![code](https://x.png)` [a link](https://example.com)",
		].join("\n")
	);
	assert.strictEqual(
		out,
		[
			"- *(remote image not loaded: logo)* and [[Embedded note]]",
			"  - ![[diagram.png]] &lt;img src=\"https://x/y.png\"> &lt;iframe src=\"https://yt\">&lt;/iframe>",
			"  - `![code](https://x.png)` [a link](https://example.com)",
		].join("\n")
	);
}

// Results are dedented so nested matches render as lists, not code blocks
assert.strictEqual(dedentBlock("\t- Negligence\n\t\t- Duty of care"), "- Negligence\n\t- Duty of care");
assert.strictEqual(dedentBlock("    - a\n\n      - b"), "- a\n\n  - b");
assert.strictEqual(dedentBlock("- top\n\t- child"), "- top\n\t- child");
assert.strictEqual(dedentBlock("\t- tab\n    - spaces"), "\t- tab\n    - spaces");

console.log("All Whole-Tree Search tests passed!");
