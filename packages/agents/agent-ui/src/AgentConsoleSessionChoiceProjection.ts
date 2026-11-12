import type { AgentMessage, AgentSessionSection } from '@tsdi/agent';
import { deriveSectionInfos } from '@tsdi/agent';
import type { AgentConsoleSessionChoice } from './AgentConsoleSessionService';

/** The lightweight store surface used to list/open sessions without transcripts. */
export interface AgentConsoleSessionFactsStore {
    listSessionFacts?(sessionIds?: readonly string[]): Promise<any[]>;
}

/**
 * Session facts keyed by id, or `undefined` when the store cannot answer them
 * (callers fall back to `get`). One aggregate query replaces one full
 * transcript read per session, which is what made tab switching scale with the
 * total size of the session library.
 */
export async function loadAgentConsoleSessionFacts(
    store: AgentConsoleSessionFactsStore | null | undefined,
    ids: readonly string[]
): Promise<Map<string, any> | undefined> {
    if (!store || typeof store.listSessionFacts !== 'function') {
        return undefined;
    }
    // SQLite caps bind parameters; large libraries must be read in chunks so a
    // single oversized IN (...) never falls back to loading every transcript.
    const chunkSize = 400;
    const result = new Map<string, any>();
    try {
        for (let start = 0; start < ids.length; start += chunkSize) {
            const facts = await store.listSessionFacts(ids.slice(start, start + chunkSize));
            if (!Array.isArray(facts)) {
                return undefined;
            }
            for (const fact of facts) {
                result.set(String(fact?.sessionId || ''), fact);
            }
        }
        return result;
    } catch {
        return undefined;
    }
}

/** Map an RPC/grouped session payload onto the console choice shape. */
export function mapAgentConsoleSessionChoice(item: any): AgentConsoleSessionChoice {
    return {
        id: String(item?.id || ''),
        createdAt: item?.createdAt,
        lastActiveAt: item?.lastActiveAt,
        messageCount: item?.messageCount,
        summary: item?.summary,
        title: item?.title,
        pinned: !!item?.pinned,
        archived: !!item?.archived,
        workspace: item?.workspace,
        projectKey: item?.projectKey,
        projectId: item?.projectId,
        primaryThreadId: item?.primaryThreadId,
        originThreadId: item?.originThreadId,
        sessionRole: item?.sessionRole,
        rootRequest: item?.rootRequest,
        focusSummary: item?.focusSummary,
        threadStatus: item?.threadStatus,
        sections: Array.isArray(item?.sections) ? item.sections : undefined
    };
}

/**
 * Project a full session state or a lightweight fact onto the console choice
 * shape. Facts carry `messageCount` + per-section counts, so a huge transcript
 * is never deserialized just to list or open its session.
 */
export function agentConsoleSessionChoiceFrom(sessionId: string, state?: {
    createdAt?: number;
    updatedAt?: number;
    messages?: AgentMessage[];
    messageCount?: number;
    sectionMessageCounts?: Record<string, number>;
    summary?: string;
    title?: string;
    pinned?: boolean;
    archived?: boolean;
    workspace?: string;
    projectKey?: string;
    projectId?: string;
    primaryThreadId?: string;
    originThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
    threadStatus?: string;
    sections?: AgentSessionSection[];
}): AgentConsoleSessionChoice {
    return {
        id: sessionId,
        createdAt: state?.createdAt,
        lastActiveAt: state?.updatedAt ?? state?.createdAt,
        messageCount: state?.messageCount ?? state?.messages?.length ?? 0,
        summary: state?.summary,
        title: state?.title,
        pinned: !!state?.pinned,
        archived: !!state?.archived,
        workspace: state?.workspace,
        projectKey: state?.projectKey,
        projectId: state?.projectId,
        primaryThreadId: state?.primaryThreadId,
        originThreadId: state?.originThreadId,
        sessionRole: state?.sessionRole,
        rootRequest: state?.rootRequest,
        focusSummary: state?.focusSummary,
        threadStatus: state?.threadStatus,
        sections: Array.isArray(state?.sections)
            ? deriveSectionInfos(state.sections, state?.messages, state?.sectionMessageCounts)
            : undefined
    };
}
