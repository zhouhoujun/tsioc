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

/**
 * Initial transcript page size. Older pages are loaded only when the user
 * reaches the top of the viewport, so opening a huge session stays O(page).
 */
export const AGENT_CONSOLE_SESSION_PAGE_SIZE = 50;

export interface AgentConsoleSessionPage {
    messages: AgentMessage[];
    sections: AgentSessionSection[];
    goalSummary?: any;
    /** Oldest loaded message id, used as the cursor for the previous page. */
    nextCursor?: string;
    /** Whether an older page exists. */
    hasMore: boolean;
}

export async function loadSessionPage(
    host: AgentConsoleSessionContentLoaderHost,
    sessionId: string
): Promise<AgentConsoleSessionPage> {
    if (host.sessionService) {
        const page = await host.sessionService.loadMessagesPage(sessionId, undefined, {
            limit: AGENT_CONSOLE_SESSION_PAGE_SIZE
        });
        return {
            messages: normalizeLoadedMessages(page.messages.slice(), { translator: host.translator }),
            sections: Array.isArray(page.sections) ? page.sections : [],
            goalSummary: page.goalSummary,
            nextCursor: page.messages[0]?.id,
            hasMore: page.hasMore === true
        };
    }
    const messages = await host.runtime.getMessages(sessionId);
    return {
        messages: normalizeLoadedMessages(messages, { translator: host.translator }),
        sections: [],
        goalSummary: undefined,
        nextCursor: messages[0]?.id,
        hasMore: false
    };
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
