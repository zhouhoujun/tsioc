/**
 * Structured Markdown for the agent console transcript.
 *
 * The implementation is split by feature under `./markdown`:
 *
 * - `model`     — tone/token/line types and render options
 * - `inline`    — links, emphasis, inline code, strikethrough
 * - `structure` — pre-processing that splits inline numbered plans
 * - `blocks`    — headings, quotes, lists, tasks, rules
 * - `code`      — fenced blocks and shared syntax highlighting
 * - `table`     — grid table layout
 * - `layout`    — blank-line rhythm and line flattening
 * - `parser`    — document walk that dispatches to the modules above
 *
 * This file stays a thin facade so renderers (DOM/TUI/worker) keep importing
 * from one stable path.
 */

export type {
    AgentConsoleMarkdownTone,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownRenderOptions
} from './markdown/model';

export { DEFAULT_MARKDOWN_TABLE_WIDTH } from './markdown/model';
export { renderAgentConsoleMarkdownLines } from './markdown/parser';
export { flattenAgentConsoleMarkdownLine } from './markdown/layout';
export { tokenizeMarkdownInline } from './markdown/inline';
