/**
 * Structured Markdown for the agent console transcript.
 *
 * Implementation is split by feature under `./markdown`:
 * model, inline, structure, blocks, code, table, spacing, parser. This file is
 * the stable facade for renderers/worker imports.
 */

export type {
    AgentConsoleMarkdownTone,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownTableData,
    AgentConsoleMarkdownCodeData,
    AgentConsoleMarkdownRenderOptions
} from './markdown/model';
export { DEFAULT_MARKDOWN_TABLE_WIDTH } from './markdown/model';
export { renderAgentConsoleMarkdownLines } from './markdown/parser';
export { flattenAgentConsoleMarkdownLine } from './markdown/spacing';
export { tokenizeMarkdownInline } from './markdown/inline';
