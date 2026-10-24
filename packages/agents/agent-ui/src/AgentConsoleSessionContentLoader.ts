import type { AgentMessage, AgentSessionSection } from '@tsdi/agent';
import { normalizeLoadedMessages } from './AgentConsoleMessageNormalization';
import type { AgentUiTranslator } from './agent-ui.i18n';

export interface AgentConsoleSessionContentLoaderHost {
    /**
     * Translator used so replayed tool rows reuse the live row's localized
     * label (`Read file`, not the presenter category verb `Read`).
     */
    translator?: AgentUiTranslator | null;
    sessionService?: {
        loadMessages(sessionId: string, context?: any): Promise<AgentMessage[]>;
        loadMessagesPage(
            sessionId: string,
            context?: any,
            options?: { cursor?: string; before?: boolean; limit?: number }
        ): Promise<{
            messages: AgentMessage[];
            sections?: AgentSessionSection[];
            goalSummary?: any;
            nextCursor?: string;
            hasMore?: boolean;
        }>;
    } | null;
    runtime: {
        getMessages(sessionId: string): Promise<AgentMessage[]>;
    };
}

export async function loadSessionMessages(
    host: AgentConsoleSessionContentLoaderHost,
    sessionId: string
): Promise<AgentMessage[]> {
    const messages = await (host.sessionService?.loadMessages(sessionId) || host.runtime.getMessages(sessionId));
    return normalizeLoadedMessages(messages, { translator: host.translator });
}

export async function loadSessionPage(
    host: AgentConsoleSessionContentLoaderHost,
    sessionId: string
): Promise<{ messages: AgentMessage[]; sections: AgentSessionSection[]; goalSummary?: any }> {
    if (host.sessionService) {
        const page = await host.sessionService.loadMessagesPage(sessionId);
        const messages = page.messages.slice();
        const seenCursors = new Set<string>();
        let cursor = page.messages[0]?.id;
        let hasMore = page.hasMore === true;
        while (hasMore && cursor && !seenCursors.has(cursor)) {
            seenCursors.add(cursor);
            const previous = await host.sessionService.loadMessagesPage(
                sessionId,
                undefined,
                { cursor, before: true }
            );
            messages.unshift(...previous.messages);
            cursor = previous.messages[0]?.id;
            hasMore = previous.hasMore === true;
        }
        return {
            messages: normalizeLoadedMessages(messages, { translator: host.translator }),
            sections: Array.isArray(page.sections) ? page.sections : [],
            goalSummary: page.goalSummary
        };
    }
    const messages = await host.runtime.getMessages(sessionId);
    return { messages: normalizeLoadedMessages(messages, { translator: host.translator }), sections: [], goalSummary: undefined };
}

export async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<Array<{ item: T; result?: R; error?: unknown }>> {
    const outputs: Array<{ item: T; result?: R; error?: unknown }> = [];
    let next = 0;
    const run = async () => {
        while (next < items.length) {
            const index = next++;
            const item = items[index];
            try {
                const result = await worker(item, index);
                outputs.push({ item, result });
            } catch (error) {
                outputs.push({ item, error });
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return outputs;
}
