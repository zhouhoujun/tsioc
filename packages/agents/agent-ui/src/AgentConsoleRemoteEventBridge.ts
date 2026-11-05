import {
    AgentConsoleRemoteEventBridgeOptions,
    RemoteAgentConsoleEvent,
    decodeSseFrame,
    parseSseFrames,
    resolveFetch
} from './AgentConsoleRemoteEventProtocol';
import { applyRemoteEvent, normalizePendingQuestion } from './AgentConsoleRemoteEventApply';

export type { AgentConsoleRemoteEventBridgeOptions, RemoteAgentConsoleEvent } from './AgentConsoleRemoteEventProtocol';
export { decodeSseFrame, parseSseFrames } from './AgentConsoleRemoteEventProtocol';
export { applyRemoteEvent } from './AgentConsoleRemoteEventApply';

import { AgentConsoleAppRpc, TimelineEntry, TimelineEventRecord, CommandExchangeRecord, reduceTimelineEvents, threadItemKey } from '@tsdi/agent';
import {
    AgentConsoleApprovalRequest,
    AgentConsolePendingQuestion,
    AgentConsoleSessionState,
    AgentConsoleToolRun
} from './AgentConsoleSessionState';
import { formatTimelineEventLine, presentTimelineToolEvent, resolveTimelineToolCategory } from './AgentConsoleTimelineEventPresenter';
import { formatAgentUiNotice } from './agent-ui.i18n';

export class AgentConsoleRemoteEventBridge {
    protected parserBuffer = '';
    protected active = false;
    protected hasConnected = false;
    protected reconnectTimer?: ReturnType<typeof setTimeout>;
    protected sessionId = '';
    protected fetchImpl: typeof fetch;
    protected rpc?: AgentConsoleAppRpc | null;
    protected options: AgentConsoleRemoteEventBridgeOptions;

    constructor(
        protected state: AgentConsoleSessionState,
        options: AgentConsoleRemoteEventBridgeOptions
    ) {
        this.options = options;
        this.fetchImpl = resolveFetch(options);
        this.rpc = options.rpc ?? null;
    }

    protected isDriftedFromActiveSession(): boolean {
        return Boolean(this.state.sessionId) && this.state.sessionId !== this.sessionId;
    }

    get connected(): boolean {
        return this.active;
    }

    async subscribe(sessionId: string): Promise<() => void> {
        this.sessionId = sessionId;
        this.active = true;
        await this.connectOnce();
        return () => this.dispose();
    }

    async connectOnce(): Promise<void> {
        if (!this.active) {
            return;
        }
        // A UI session switch does not re-subscribe this bridge. Re-anchor to
        // the active session before (re)connecting; each sessionId change bumps
        // the remote epoch, so the session-level match is the replay rejection.
        if (this.state.sessionId && this.state.sessionId !== this.sessionId) {
            this.sessionId = this.state.sessionId;
            this.parserBuffer = '';
        }
        if (this.hasConnected) {
            this.state.markTimelineReconnecting(true);
        }
        if (!this.hasConnected) {
            await this.seedFromTimeline();
            await this.seedFromCommandExchange();
            await this.seedFromNav();
            await this.seedFromQuestions();
        } else {
            // P271: replay raw events missed while SSE was down; idempotent via stable-key upsert (P235).
            await this.replayFromTimeline();
            // P284: durable command-exchange replay so disconnects lose nothing and duplicate nothing.
            await this.replayFromCommandExchange();
        }
        const base = String(this.options.baseUrl || '').replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (this.options.token) {
            headers.Authorization = `Bearer ${this.options.token}`;
        }
        const response = await this.fetchImpl(
            `${base}/api/events?sessionId=${encodeURIComponent(this.sessionId)}`,
            { headers }
        );
        if (!response.ok) {
            throw new Error(formatAgentUiNotice(undefined, 'sseConnectionFailed', { status: response.status }));
        }
        const body = response.body as ReadableStream<Uint8Array> | null;
        if (!body) {
            throw new Error(formatAgentUiNotice(undefined, 'sseResponseNoBody'));
        }
        const reader = body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
            // A UI session switch does not re-subscribe this bridge; when the
            // stream is bound to a session the UI has left, drop it so the
            // reconnect re-anchors to the active session.
            if (this.state.sessionId && this.state.sessionId !== this.sessionId) {
                break;
            }
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            this.parserBuffer += decoder.decode(value, { stream: true });
            const { frames, rest } = parseSseFrames(this.parserBuffer);
            this.parserBuffer = rest;
            for (const frame of frames) {
                const event = decodeSseFrame(frame);
                if (!event || !event.sessionId || event.sessionId !== this.state.sessionId) {
                    continue;
                }
                applyRemoteEvent(this.state, event);
                if (event.type === 'tool_completed') {
                    await this.refreshTools();
                }
            }
        }
        if (this.hasConnected) {
            this.options.onReconnected?.();
        }
        this.hasConnected = true;
        this.state.markTimelineReconnecting(false);
        this.scheduleReconnect();
    }

    protected async seedFromTimeline(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const all: TimelineEntry[] = [];
            let cursor: string | undefined;
            for (let page = 0; page < 20; page += 1) {
                const params: Record<string, unknown> = { sessionId: requestedSessionId, limit: 500 };
                if (cursor) {
                    params.cursor = cursor;
                }
                const result = await this.rpc.request('timeline.query', params);
                if (this.isDriftedFromActiveSession()) {
                    return;
                }
                const entries = Array.isArray(result?.entries) ? result.entries : [];
                all.push(...entries);
                if (!result?.hasMore || !result?.nextCursor) {
                    break;
                }
                cursor = result.nextCursor;
            }
            if (all.length) {
                this.state.seedTimeline(all);
            }
        } catch {
            return;
        }
    }

    protected async replayFromTimeline(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const result = await this.rpc.request('timeline.replay', {
                sessionId: requestedSessionId,
                sinceSeq: this.state.timelineTailSeq
            });
            if (this.isDriftedFromActiveSession()) {
                return;
            }
            const rawEvents = Array.isArray(result?.events) ? result.events : [];
            if (!rawEvents.length) {
                return;
            }
            if (rawEvents.some((event: TimelineEventRecord) => event.sessionId && event.sessionId !== this.state.sessionId)) {
                return;
            }
            const entries = [...reduceTimelineEvents(rawEvents).values()];
            if (entries.length) {
                this.state.seedTimeline(entries);
            }
        } catch {
            return;
        }
    }

    protected async seedFromCommandExchange(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const all: CommandExchangeRecord[] = [];
            let cursor: string | undefined;
            for (let page = 0; page < 20; page += 1) {
                const params: Record<string, unknown> = { sessionId: requestedSessionId, limit: 500 };
                if (cursor) {
                    params.cursor = cursor;
                }
                const result = await this.rpc.request('command_exchange.query', params);
                if (this.isDriftedFromActiveSession()) {
                    return;
                }
                const records = Array.isArray(result?.records) ? result.records : [];
                all.push(...records);
                if (!result?.hasMore || !result?.nextCursor) {
                    break;
                }
                cursor = result.nextCursor;
            }
            if (all.length) {
                this.state.seedCommandExchange(all);
            }
        } catch {
            return;
        }
    }

    protected async replayFromCommandExchange(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const result = await this.rpc.request('command_exchange.replay', {
                sessionId: requestedSessionId,
                sinceSeq: this.state.commandExchangeTailSeq
            });
            if (this.isDriftedFromActiveSession()) {
                return;
            }
            const records = Array.isArray(result?.records) ? result.records : [];
            if (!records.length) {
                return;
            }
            if (records.some((record: CommandExchangeRecord) => record.sessionId && record.sessionId !== this.state.sessionId)) {
                return;
            }
            this.state.seedCommandExchange(records);
        } catch {
            return;
        }
    }

    protected async seedFromNav(): Promise<void> {
        if (!this.rpc) {
            return;
        }
        try {
            const tree = await this.rpc.request('nav.query', {});
            if (tree && Array.isArray(tree.sessions)) {
                this.state.seedNavTree(tree);
            }
        } catch {
            return;
        }
    }

    protected async seedFromQuestions(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        const requestedSessionId = this.sessionId;
        try {
            const result = await this.rpc.request('question.list', { sessionId: requestedSessionId });
            if (this.isDriftedFromActiveSession()) {
                return;
            }
            const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
            const now = Date.now();
            const pending = items.filter((item: any) =>
                (item?.status === 'pending' || item?.status == null) &&
                !(Number(item?.expiresAt) && now > Number(item?.expiresAt))
            );
            if (!pending.length) {
                return;
            }
            for (const item of pending) {
                const question = normalizePendingQuestion({
                    ...(item || {}),
                    sessionId: item?.sessionId || requestedSessionId,
                    questionId: item?.questionId,
                    status: 'pending'
                });
                if (question) {
                    this.state.setPendingQuestion(question);
                }
            }
        } catch {
            return;
        }
    }

    protected scheduleReconnect(): void {
        if (!this.active) {
            return;
        }
        const delay = Number(this.options.reconnectDelayMs || 3000);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            if (this.active) {
                void this.connectOnce().catch(() => this.scheduleReconnect());
            }
        }, delay);
    }

    protected async refreshTools(): Promise<void> {
        if (!this.rpc || !this.sessionId || this.isDriftedFromActiveSession()) {
            return;
        }
        try {
            const definitions = await this.rpc.request('tools.list', { sessionId: this.sessionId });
            if (this.isDriftedFromActiveSession()) {
                return;
            }
            const tools = Array.isArray(definitions)
                ? definitions.map((def: any) => this.state.toToolItem(def, def?.activation?.activated ?? true))
                : [];
            tools.sort((a, b) => a.name.localeCompare(b.name));
            this.state.setTools(tools);
        } catch {
            return;
        }
    }

    dispose(): void {
        this.active = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        this.parserBuffer = '';
    }
}

export function createRemoteAgentConsoleEventBridge(
    state: AgentConsoleSessionState,
    options: AgentConsoleRemoteEventBridgeOptions
): AgentConsoleRemoteEventBridge {
    return new AgentConsoleRemoteEventBridge(state, options);
}
