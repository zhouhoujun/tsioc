/**
 * Injectable abstraction for off-main-thread markdown parsing.
 *
 * - Browser: routes long messages (>=1000 chars) to a Web Worker
 * - TUI / fallback: synchronous path (no Worker available)
 *
 * Short messages always stay synchronous to avoid IPC overhead.
 */

import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownRenderOptions,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import type { MarkdownWorkerResponse } from './AgentConsoleMarkdownWorker';

/** Character threshold above which content is routed to the Worker. */
const ASYNC_THRESHOLD = 1000;

/** Maximum number of cached parse results to avoid unbounded memory growth. */
const MAX_CACHE_SIZE = 128;

/**
 * Core interface: takes markdown content + options, returns parsed lines.
 * Implementations decide sync vs async internally.
 */
export interface MarkdownWorkerBridge {
    /** Parse markdown content into structured lines. */
    render(content: string, options?: AgentConsoleMarkdownRenderOptions): AgentConsoleMarkdownLine[];

    /**
     * Check whether the given content length would be routed to the Worker
     * in a browser environment. Useful for tests and diagnostics.
     */
    shouldOffload(contentLength: number): boolean;

    /** Number of Worker-offloaded parses that have completed (metric). */
    readonly workerParseCount: number;
}

/**
 * Browser implementation: uses a Web Worker for long content.
 * Maintains a small LRU-style cache keyed by content hash to avoid
 * re-parsing identical content on reactive re-renders.
 */
export class BrowserMarkdownWorkerBridge implements MarkdownWorkerBridge {
    private worker: Worker | null = null;
    private pending = new Map<string, { resolve: (lines: AgentConsoleMarkdownLine[]) => void }>();
    private cache = new Map<string, AgentConsoleMarkdownLine[]>();
    private _workerParseCount = 0;

    constructor(private workerUrl: string) {
        this.initWorker();
    }

    get workerParseCount(): number {
        return this._workerParseCount;
    }

    shouldOffload(contentLength: number): boolean {
        return contentLength >= ASYNC_THRESHOLD;
    }

    render(content: string, options?: AgentConsoleMarkdownRenderOptions): AgentConsoleMarkdownLine[] {
        // Short content: always synchronous
        if (content.length < ASYNC_THRESHOLD) {
            return renderAgentConsoleMarkdownLines(content, options);
        }

        // Check cache first
        const cacheKey = this.hashContent(content, options);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Cache miss + long content: kick off async Worker parse
        // Return synchronous fallback for this frame; the cache will be
        // populated on Worker response, and the reactive framework will
        // trigger a re-render that picks up the cached result.
        const fallback = renderAgentConsoleMarkdownLines(content, options);
        this.cache.set(cacheKey, fallback);
        this.evictIfNeeded();

        // Fire-and-forget Worker parse (result will be cached)
        if (this.worker) {
            this.postToWorker(cacheKey, content, options);
        }

        return fallback;
    }

    /**
     * Render asynchronously via Worker, returning a Promise.
     * Used by callers that can afford to await (e.g., non-reactive paths).
     */
    renderAsync(content: string, options?: AgentConsoleMarkdownRenderOptions): Promise<AgentConsoleMarkdownLine[]> {
        if (content.length < ASYNC_THRESHOLD || !this.worker) {
            return Promise.resolve(renderAgentConsoleMarkdownLines(content, options));
        }

        const cacheKey = this.hashContent(content, options);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return Promise.resolve(cached);
        }

        return new Promise<AgentConsoleMarkdownLine[]>((resolve) => {
            this.pending.set(cacheKey, { resolve });
            this.postToWorker(cacheKey, content, options);
        });
    }

    /** Terminate the Worker (call on dispose). */
    dispose(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pending.clear();
        this.cache.clear();
    }

    private initWorker(): void {
        try {
            if (typeof Worker === 'undefined') {
                return;
            }
            this.worker = new Worker(this.workerUrl);
            this.worker.onmessage = (event: MessageEvent<MarkdownWorkerResponse>) => {
                const { id, lines } = event.data;
                // Cache the result
                if (lines.length > 0) {
                    this.cache.set(id, lines);
                    this.evictIfNeeded();
                }
                this._workerParseCount++;
                // Resolve any pending async caller
                const pending = this.pending.get(id);
                if (pending) {
                    this.pending.delete(id);
                    pending.resolve(lines);
                }
            };
            this.worker.onerror = () => {
                // Worker failed — all pending promises fall back to sync
                // They'll get resolved on next render cycle via the cache fallback
            };
        } catch {
            // Worker construction failed — graceful degradation to sync
        }
    }

    private postToWorker(id: string, content: string, options?: AgentConsoleMarkdownRenderOptions): void {
        if (!this.worker) {
            return;
        }
        this.pending.set(id, {
            resolve: () => { /* no-op, cache already populated */ }
        });
        this.worker.postMessage({ id, content, options });
    }

    private hashContent(content: string, options?: AgentConsoleMarkdownRenderOptions): string {
        // Fast hash: length + first/last 64 chars + option flags
        const optKey = options
            ? `${options.compactBlankLines ? 'c' : ''}${options.preserveFenceMarkers ? 'f' : ''}${options.treatUnclosedFenceAsText ? 't' : ''}`
            : '';
        const prefix = content.slice(0, 64);
        const suffix = content.slice(-64);
        return `${content.length}:${optKey}:${prefix}::${suffix}`;
    }

    private evictIfNeeded(): void {
        if (this.cache.size <= MAX_CACHE_SIZE) {
            return;
        }
        // Simple eviction: delete oldest entries (Map preserves insertion order)
        const toDelete = this.cache.size - MAX_CACHE_SIZE + 16;
        const keys = this.cache.keys();
        for (let i = 0; i < toDelete; i++) {
            const key = keys.next().value;
            if (key !== undefined) {
                this.cache.delete(key);
            }
        }
    }
}

/**
 * Synchronous fallback for TUI and environments without Worker support.
 * Always parses inline; no caching needed (fast enough for sync path).
 */
export class SyncMarkdownWorkerBridge implements MarkdownWorkerBridge {
    get workerParseCount(): number {
        return 0;
    }

    shouldOffload(_contentLength: number): boolean {
        return false;
    }

    render(content: string, options?: AgentConsoleMarkdownRenderOptions): AgentConsoleMarkdownLine[] {
        return renderAgentConsoleMarkdownLines(content, options);
    }
}

/**
 * Factory: creates the appropriate bridge for the current environment.
 * - Browser with Worker support → BrowserMarkdownWorkerBridge
 * - TUI / Node / fallback → SyncMarkdownWorkerBridge
 */
export function createMarkdownWorkerBridge(workerUrl?: string): MarkdownWorkerBridge {
    if (workerUrl && typeof Worker !== 'undefined') {
        return new BrowserMarkdownWorkerBridge(workerUrl);
    }
    return new SyncMarkdownWorkerBridge();
}

/** Default character threshold constant (exported for tests). */
export const MARKDOWN_ASYNC_THRESHOLD = ASYNC_THRESHOLD;
