/**
 * Markdown document model shared by the agent console renderers.
 */

export type AgentConsoleMarkdownTone =
    | 'default'
    | 'muted'
    | 'accent'
    | 'strong'
    | 'code'
    | 'inline-code'
    | 'link'
    | 'heading'
    | 'quote'
    | 'emphasis'
    | 'strike'
    | 'syntax-keyword'
    | 'syntax-string'
    | 'syntax-number'
    | 'syntax-comment'
    | 'syntax-property'
    | 'syntax-type'
    | 'syntax-constant'
    | 'syntax-variable'
    | 'syntax-tag'
    | 'syntax-attribute'
    | 'syntax-function';

export interface AgentConsoleMarkdownToken {
    text: string;
    tone?: AgentConsoleMarkdownTone;
}

export interface AgentConsoleMarkdownTableData {
    header: string[];
    rows: string[][];
    aligns: Array<'left' | 'center' | 'right'>;
}

export interface AgentConsoleMarkdownCodeData {
    language?: string;
    text: string;
    /** Syntax-highlighted visual lines, used by the browser code surface. */
    lines?: AgentConsoleMarkdownToken[][];
}

export interface AgentConsoleMarkdownLine {
    rawText: string;
    prefix?: string;
    prefixTone?: AgentConsoleMarkdownTone;
    tokens: AgentConsoleMarkdownToken[];
    tone?: AgentConsoleMarkdownTone;
    code?: boolean;
    /** The visual line belongs to a table (grid rows and borders). */
    table?: boolean;
    /** Structured table payload attached once to the first table line. */
    tableData?: AgentConsoleMarkdownTableData;
    /** Fenced code payload attached once to the first code line. */
    codeData?: AgentConsoleMarkdownCodeData;
    /** Columns used to align wrapped continuation lines (list/quote markers). */
    continuationIndent?: number;
}

export interface AgentConsoleMarkdownRenderOptions {
    compactBlankLines?: boolean;
    preserveFenceMarkers?: boolean;
    /** Render the body of an unclosed ``` fence as plain text instead of code lines. */
    treatUnclosedFenceAsText?: boolean;
    /** Column budget for grid tables (defaults to the shared 96-column fallback). */
    tableWidth?: number;
}

/** Column budget used when the host has not measured the transcript width yet. */
export const DEFAULT_MARKDOWN_TABLE_WIDTH = 96;
