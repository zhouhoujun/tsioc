import type { AgentMessage } from '@tsdi/agent';
import type { AgentConsoleSessionContentPresentation } from './AgentConsoleSessionContentPresenter';

/**
 * Cache for the pure message-presentation pass, keyed by message object.
 *
 * Streaming re-projects the whole transcript per token; unchanged messages keep
 * their object identity, so the mainline/presenter passes reuse this result.
 * Mutable rows (streaming/partial/running) are updated in place by the runtime
 * and always recompute.
 */
const presentationCache = new WeakMap<object, AgentConsoleSessionContentPresentation>();
const normalizedContentCache = new WeakMap<object, string>();

export function cacheAgentConsoleSessionContent(
    compute: (message: AgentMessage) => AgentConsoleSessionContentPresentation
): (message: AgentMessage) => AgentConsoleSessionContentPresentation {
    return message => {
        const metadata: any = (message as any)?.metadata || {};
        const mutable = metadata.streaming === true
            || metadata.partial === true
            || String(metadata.status || '').trim().toLowerCase() === 'running';
        if (!mutable && message && typeof message === 'object') {
            const cached = presentationCache.get(message);
            if (cached) {
                return cached;
            }
            const presentation = compute(message);
            presentationCache.set(message, presentation);
            return presentation;
        }
        return compute(message);
    };
}

/**
 * Cached normalized conversation text (content + parts) used by the mainline
 * dedupe pass. Same mutability rule as the presentation cache.
 */
export function cachedNormalizedConversationContent(message?: AgentMessage): string {
    if (!message) {
        return '';
    }
    const metadata: any = (message as any)?.metadata || {};
    const mutable = metadata.streaming === true
        || metadata.partial === true
        || String(metadata.status || '').trim().toLowerCase() === 'running';
    if (!mutable && typeof message === 'object') {
        const cached = normalizedContentCache.get(message);
        if (cached !== undefined) {
            return cached;
        }
        const value = computeNormalizedConversationContent(message);
        normalizedContentCache.set(message, value);
        return value;
    }
    return computeNormalizedConversationContent(message);
}

function computeNormalizedConversationContent(message: AgentMessage): string {
    const parts = (message.parts || []).map(part => part.type === 'text'
        ? `text:${part.text}`
        : `${part.type}:${part.name || ''}:${part.type === 'image' ? part.imageUrl : part.dataUrl}`);
    return `${String(message.content || '').replace(/\s+/g, ' ').trim()}|${parts.join('|')}`;
}
