/**
 * Web Worker entry for off-main-thread markdown parsing.
 *
 * Receives `{ id, content, options }` messages and posts back
 * `{ id, lines }` with the parsed AgentConsoleMarkdownLine[] result.
 *
 * This worker bundles the pure regex-based markdown parser from
 * AgentConsoleMarkdown.ts — no DOM dependencies, safe for Worker scope.
 */

import {
    renderAgentConsoleMarkdownLines,
    AgentConsoleMarkdownRenderOptions,
    AgentConsoleMarkdownLine
} from './AgentConsoleMarkdown';

/** Incoming message shape from the main thread. */
export interface MarkdownWorkerRequest {
    id: string;
    content: string;
    options?: AgentConsoleMarkdownRenderOptions;
}

/** Outgoing message shape back to the main thread. */
export interface MarkdownWorkerResponse {
    id: string;
    lines: AgentConsoleMarkdownLine[];
}

// Worker global scope (browser Web Worker API)
declare const self: Worker & typeof globalThis;

self.onmessage = (event: MessageEvent<MarkdownWorkerRequest>): void => {
    const { id, content, options } = event.data;
    try {
        const lines = renderAgentConsoleMarkdownLines(content, options);
        const response: MarkdownWorkerResponse = { id, lines };
        self.postMessage(response);
    } catch (err) {
        // Post back empty lines on error so the main thread can fall back to sync
        const response: MarkdownWorkerResponse = { id, lines: [] };
        self.postMessage(response);
    }
};
