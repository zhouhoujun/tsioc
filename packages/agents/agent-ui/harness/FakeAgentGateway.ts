/**
 * P285 — Transport-agnostic fake agent gateway for interaction-gate tests.
 *
 * This class mirrors the agent-gateway's RPC surface against an in-memory store
 * while staying fully transport-agnostic (no node import, no browser import —
 * only pure helpers re-exported from `@tsdi/agent`). It powers BOTH the JSDOM
 * gate spec (via `createFetchImpl`) and the Node/Playwright browser runner (via
 * the shared `harness/run-browser-gate.ts` transport on the same core).
 *
 * The RPC handlers intentionally use the SAME projection/paging helpers as the
 * real durable stores (`reduceTimelineEvents`, `sortTimelineEntries`,
 * `pageTimelineEntries`, `pageCommandExchangeRecords`) so assertions on the
 * harness prove the console's wire contract — not a simplified stand-in.
 *
 * SSE behavior:
 *  - One append-only frame log + one shared consumed pointer per gateway.
 *  - Each connection pulls frames it has not consumed yet; after a one-shot
 *    `sseDrop.afterFrames` limit the connection closes (EOF), and the bridge's
 *    reconnect re-serves the REMAINING frames (deduped by stable-key seeding).
 *  - Without a drop policy the stream stays open once drained.
 *  - `dispose()` closes every stream so a parked reader resolves `done`.
 */

import {
    CommandExchangeRecord,
    CommandExchangeNoncePage,
    CommandExchangePageOptions,
    TimelineEventRecord,
    TimelineEntry,
    TimelineNoncePage,
    TimelinePageOptions,
    compareCommandExchangeAsc,
    pageCommandExchangeRecords,
    pageTimelineEntries,
    reduceTimelineEvents,
    sortTimelineEntries
} from '@tsdi/agent';

/** A session appears in the nav tree with these fields. */
export interface FakeNavSession {
    id: string;
    label?: string;
    status?: string;
    createdAt?: number;
    updatedAt?: number;
    messageCount?: number;
}

/** Pending-question items returned by `question.list`. */
export interface FakeQuestionItem {
    questionId: string;
    sessionId?: string;
    question: string;
    options?: string[];
    context?: string;
    severity?: 'low' | 'medium' | 'high';
    status?: 'pending' | 'resolved' | null;
    createdAt?: number;
    updatedAt?: number;
}

/** Streaming command-output entries for `command_output.*`. */
export interface FakeCommandOutputEntry {
    id: string;
    sessionId: string;
    command?: string;
    output?: string;
    type?: string;
    status?: string;
    timestamp: number;
}

/** Tool definitions surfaced by `tools.list` (`toToolItem` reads name/toolset/activation). */
export interface FakeToolDefinition {
    name: string;
    toolset?: string;
    activation?: { kind?: string; activated?: boolean };
}

/** A single SSE frame pushed to the shared log. `data` auto-injects `sessionId`. */
export interface FakeSseFrame {
    event?: string;
    data: unknown;
}

/** One-shot SSE drop policy (disconnect-retry scenario). */
export interface FakeSseDrop {
    /** Close the first connection after this many frames have been served. */
    afterFrames: number;
}

export interface FakeRpcCall {
    method: string;
    params?: Record<string, unknown>;
    at: number;
}

export interface FakeAgentGatewayOptions {
    /**
     * Default sessionId stamped on fixtures (`sequenceTimeline`,
     * `appendTimeline`, `appendCommandExchange`) and on SSE frames when the
     * caller does not supply one. MUST match the mounted console's
     * `sessionId` — the bridge rejects frames/replays whose sessionId differs.
     */
    sessionId?: string;
    /** Raw timeline events; no `seq` assignment is required (honored if present). */
    timeline?: TimelineEventRecord[];
    /** Durable command-exchange records (must carry `sessionEpoch` for the gate). */
    commandExchange?: CommandExchangeRecord[];
    /** Nav sessions surfaced by `nav.query`. */
    navSessions?: FakeNavSession[];
    /** Pending-question items surfaced by `question.list`. */
    questions?: FakeQuestionItem[];
    /** Tools surfaced by `tools.list`. */
    tools?: FakeToolDefinition[];
    /** Command-output entries surfaced by `command_output.*`. */
    commandOutputs?: FakeCommandOutputEntry[];
    /** One-shot SSE drop policy for the disconnect-retry scenario. */
    sseDrop?: FakeSseDrop;
    /** Workspace surfaced by `app.state` (mirrors the agent-gateway surface). */
    workspace?: string;
    /** Base URL accepted by `createFetchImpl` (paths still gate the routing). */
    baseUrl?: string;
}

export interface FakeAgentMetadata {
    timelineCount: number;
    commandExchangeCount: number;
    rpcCalls: FakeRpcCall[];
    projectedEntryCount: number;
    sseFrameCount: number;
    sseConsumed: number;
    sseDropped: boolean;
}

/** Encode one SSE frame: `event: <type>\ndata: <json>\n\n`; data auto-injects sessionId. */
export function encodeSseFrame(sessionId: string, frame: FakeSseFrame): string {
    const payload: Record<string, unknown> = frame.data && typeof frame.data === 'object'
        ? { ...(frame.data as Record<string, unknown>) }
        : { value: frame.data };
    payload.sessionId = sessionId;
    const event = String(frame.event || payload.type || 'message');
    return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

/**
 * A live SSE channel: append-only frame log + shared consumption pointer.
 * Each connection consumes whatever has not been consumed yet; when a one-shot
 * drop policy triggers, the current connection is closed so the bridge's
 * `scheduleReconnect` reopens it and re-serves the remaining frames.
 */
export class FakeSseChannel {
    protected frames: FakeSseFrame[] = [];
    protected consumed = 0;
    protected closed = false;
    protected dropped = false;
    protected drop?: FakeSseDrop;
    protected controllers: Array<ReadableStreamDefaultController<Uint8Array>> = [];
    protected waiters: Array<() => void> = [];
    protected sessionId = 'console';

    constructor(sessionId = 'console', drop?: FakeSseDrop) {
        this.sessionId = sessionId;
        this.drop = drop;
    }

    get frameCount(): number {
        return this.frames.length;
    }

    get consumedCount(): number {
        return this.consumed;
    }

    get isDropped(): boolean {
        return this.dropped;
    }

    /** Push a frame for every active/parked connection. */
    push(frame: FakeSseFrame): void {
        this.frames.push(frame);
        const waiters = this.waiters.splice(0);
        for (const resolve of waiters) {
            resolve();
        }
    }

    /** Close every connection: a parked reader resolves `done` (EOF). */
    close(): void {
        this.closed = true;
        const waiters = this.waiters.splice(0);
        for (const resolve of waiters) {
            resolve();
        }
        const controllers = this.controllers.splice(0);
        for (const controller of controllers) {
            try {
                controller.close();
            } catch {
                // already closed
            }
        }
    }

    /**
     * Open a fresh connection to this channel. Indefinitely pulls frames from
     * the shared log; honors the one-shot drop policy, then stays open.
     */
    toReadableStream(sessionId?: string): ReadableStream<Uint8Array> {
        const channel = this;
        const encoder = new TextEncoder();
        const encodeSession = String(sessionId || this.sessionId);
        let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
        let served = 0;
        return new ReadableStream<Uint8Array>({
            start(controller) {
                streamController = controller;
                channel.controllers.push(controller);
            },
            async pull(controller) {
                for (;;) {
                    if (channel.closed) {
                        controller.close();
                        return;
                    }
                    // One-shot drop: close the FIRST connection once it has served
                    // `afterFrames` — checked before the availability test so EOF
                    // fires even when the queue is drained (the bridge's
                    // scheduleReconnect then reopens the stream and re-serves the
                    // REMAINING frames, deduped by stable-key seeding).
                    if (channel.drop && !channel.dropped && served >= channel.drop.afterFrames) {
                        channel.dropped = true;
                        controller.close();
                        return;
                    }
                    if (channel.consumed < channel.frames.length) {
                        const frame = channel.frames[channel.consumed];
                        channel.consumed += 1;
                        served += 1;
                        controller.enqueue(encoder.encode(encodeSseFrame(encodeSession, frame)));
                        return;
                    }
                    // Drained: park until a push arrives or the channel closes.
                    await new Promise<void>(resolve => channel.waiters.push(resolve));
                }
            },
            cancel() {
                if (streamController) {
                    const index = channel.controllers.indexOf(streamController);
                    if (index >= 0) {
                        channel.controllers.splice(index, 1);
                    }
                }
            }
        });
    }
}

/**
 * Transport-agnostic fake gateway. RPC dispatch mirrors the wire contract the
 * bridge and RpcCommandOutputStore actually call; the projection/paging helpers
 * are the real `@tsdi/agent` implementations.
 */
export class FakeAgentGateway {
    protected timeline: TimelineEventRecord[] = [];
    protected commandExchange: CommandExchangeRecord[] = [];
    protected navSessions: FakeNavSession[];
    protected questions: FakeQuestionItem[];
    protected tools: FakeToolDefinition[];
    protected commandOutputs: FakeCommandOutputEntry[];
    protected inputHistoryByWorkspace = new Map<string, string[]>();
    readonly rpcCalls: FakeRpcCall[] = [];
    readonly sse: FakeSseChannel;
    protected sessionId: string;
    protected workspace: string;
    protected baseUrl = 'http://fake.invalid';

    constructor(options: FakeAgentGatewayOptions = {}) {
        this.sessionId = String(options.sessionId || 'console');
        this.workspace = String(options.workspace ?? '');
        this.baseUrl = String(options.baseUrl || this.baseUrl).replace(/\/+$/, '');
        if (options.timeline) {
            this.timeline = [...options.timeline];
        }
        if (options.commandExchange) {
            this.commandExchange = [...options.commandExchange];
        }
        this.navSessions = options.navSessions ? [...options.navSessions] : [];
        this.questions = options.questions ? [...options.questions] : [];
        this.tools = options.tools ? [...options.tools] : [];
        this.commandOutputs = options.commandOutputs ? [...options.commandOutputs] : [];
        this.sse = new FakeSseChannel(this.sessionId, options.sseDrop);
    }

    get clientBaseUrl(): string {
        return this.baseUrl;
    }

    /** Raw timeline events (deterministic, ascending). */
    timelineRecords(): TimelineEventRecord[] {
        return this.timeline.slice().sort((left, right) => {
            if (left.seq !== right.seq) {
                return left.seq - right.seq;
            }
            return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
        });
    }

    /** Raw command-exchange records (deterministic, ascending). */
    commandExchangeRecords(): CommandExchangeRecord[] {
        return this.commandExchange.slice().sort(compareCommandExchangeAsc);
    }

    /** Projected timeline entries (single row per logical tool/step/plan/turn). */
    projectedEntries(sessionId?: string): TimelineEntry[] {
        const relevant = sessionId
            ? this.timeline.filter(event => !event.sessionId || event.sessionId === sessionId)
            : this.timeline;
        return [...reduceTimelineEvents(relevant).values()];
    }

    /** Auto-assign per-session monotonically increasing `seq` where absent. */
    protected sequenceTimeline(raw: TimelineEventRecord[]): TimelineEventRecord[] {
        const bySession = new Map<string, number>();
        return raw.map(event => {
            const sessionId = String(event.sessionId || this.sessionId);
            const current = bySession.get(sessionId) ?? -1;
            const next = Number.isFinite(event.seq) ? event.seq : current + 1;
            bySession.set(sessionId, Math.max(current, next));
            return { ...event, sessionId, seq: next };
        });
    }

    /** Append raw timeline events (honors explicit seq; assigns monotonically otherwise). */
    appendTimeline(events: TimelineEventRecord[]): TimelineEventRecord[] {
        const sessionId = String(events[0]?.sessionId || this.sessionId);
        const sequenced = this.sequenceTimeline(events.map(event => ({ ...event, sessionId })));
        this.timeline.push(...sequenced);
        return sequenced;
    }

    /**
     * Append durable command-exchange records. Auto-assigns `sessionEpoch: 1`
     * when absent (the gate requires epoch 1 after `configure()` bumps 0->1).
     */
    appendCommandExchange(records: CommandExchangeRecord[]): CommandExchangeRecord[] {
        let next = this.commandExchange.reduce((max, record) => Math.max(max, record.seq), -1);
        const appended: CommandExchangeRecord[] = records.map(record => {
            const seq = Number.isFinite(record.seq) ? record.seq : next + 1;
            next = Math.max(next, seq);
            return {
                ...record,
                seq,
                id: record.id || `rec-${seq}`,
                sessionId: record.sessionId || this.sessionId,
                sessionEpoch: record.sessionEpoch == null ? 1 : record.sessionEpoch
            };
        });
        this.commandExchange.push(...appended);
        return appended;
    }

    /** Push a live SSE frame (auto-injects sessionId on encode). */
    pushSseFrame(event: string, data: unknown): void {
        this.sse.push({ event, data });
    }

    /** Close the SSE channel (a parked bridge reader resolves `done`). */
    dispose(): void {
        this.sse.close();
    }

    /**
     * Handle one JSON-RPC method. Mirrors the real stores:
     *  - timeline.query            -> paged projection (cap 500) + cursor
     *  - timeline.replay           -> raw `seq >= sinceSeq+1` ascending -> `{ events }`
     *  - command_exchange.query    -> paged raw via `pageCommandExchangeRecords`
     *  - command_exchange.replay   -> raw `seq > sinceSeq` ascending -> `{ records }`
     *  - nav.query                 -> `{ sessions }`
     *  - question.list             -> `{ items }`
     *  - tools.list                -> plain array of tool defs
     *  - command_output.{list,get,append,clear} -> never throws
     *  - unknown                   -> `{code:-32601}` marker (envelope at transport)
     */
    async handleRpc(method: string, params?: Record<string, unknown>): Promise<any> {
        this.rpcCalls.push({ method, params, at: Date.now() });
        const p = (params ?? {}) as Record<string, unknown>;
        const sessionId = String(p.sessionId || this.sessionId);
        switch (method) {
            case 'app.state': {
                return {
                    sessionId,
                    workspace: this.workspace,
                    title: 'P285 interaction gate'
                };
            }
            case 'timeline.query': {
                const pageOptions = this.toTimelinePageOptions(p);
                const entries = sortTimelineEntries(this.projectedEntries(sessionId));
                const page = pageTimelineEntries(entries, pageOptions);
                return page as TimelineNoncePage;
            }
            case 'timeline.replay': {
                const sinceSeq = Number(p.sinceSeq ?? -1);
                const events = this.timeline
                    .filter(event => !event.sessionId || event.sessionId === sessionId)
                    .filter(event => event.seq >= sinceSeq + 1)
                    .sort((left, right) => {
                        if (left.seq !== right.seq) {
                            return left.seq - right.seq;
                        }
                        return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
                    });
                return { events };
            }
            case 'command_exchange.query': {
                const pageOptions = this.toCommandExchangePageOptions(p);
                const raw = this.commandExchangeRecords();
                const page: CommandExchangeNoncePage = pageCommandExchangeRecords(raw, pageOptions);
                return page;
            }
            case 'command_exchange.replay': {
                const sinceSeq = Number(p.sinceSeq ?? -1);
                const records = this.commandExchangeRecords()
                    .filter(record => !record.sessionId || record.sessionId === sessionId)
                    .filter(record => record.seq > sinceSeq);
                return { records };
            }
            case 'nav.query': {
                return { sessions: this.navSessions };
            }
            case 'question.list': {
                return { items: this.questions };
            }
            case 'tools.list': {
                return this.tools;
            }
            case 'tools.invoke': {
                // Benign: `refreshMentionCatalog` probes mention providers (skill_list /
                // plugins) via tools.invoke; empty output keeps the catalog empty instead
                // of surfacing an unserved -32601 during connection checks.
                return { output: {} };
            }
            case 'command_output.list': {
                const items = this.commandOutputs
                    .filter(entry => !entry.sessionId || entry.sessionId === sessionId)
                    .sort((left, right) => left.timestamp - right.timestamp);
                return { items, nextCursor: undefined, total: items.length };
            }
            case 'command_output.get': {
                const id = String(p.id || '');
                return this.commandOutputs.find(entry => entry.id === id) || undefined;
            }
            case 'command_output.append': {
                const entry = p.entry as FakeCommandOutputEntry | undefined;
                if (entry?.id) {
                    this.commandOutputs.push({ ...entry, sessionId: entry.sessionId || sessionId });
                }
                return true;
            }
            case 'command_output.clear': {
                if (p.all === true) {
                    const count = this.commandOutputs.length;
                    this.commandOutputs = [];
                    return count;
                }
                return 0;
            }
            case 'session.create': {
                // Mirrors AppRpcServer.createSession (ephemeral store; recordId keyed for command_output).
                const requested = String(p.sessionId || '').trim() || this.sessionId;
                const createdAt = Date.now();
                return {
                    sessionId: requested,
                    createdAt,
                    updatedAt: createdAt,
                    workspace: this.workspace,
                    commandOutputRecordId: `rpc:${this.workspace}:${requested}`
                };
            }
            case 'session.list': {
                // Mirrors AppRpcServer.listSessions: plain array, not a wrapper.
                return [];
            }
            case 'session.list_projects': {
                // Mirrors AppRpcServer.listSessionProjects: plain array of groups.
                return [];
            }
            case 'session.messages': {
                // Mirrors AppRpcServer.getSessionMessages: a page over the session's
                // persisted message store — empty until turns land; the bridge's
                // seed/replay phase builds the rendered rows from timeline events.
                return {
                    sessionId,
                    messages: [],
                    sections: [],
                    goalSummary: undefined,
                    nextCursor: undefined,
                    hasMore: false
                };
            }
            case 'approval.list': {
                // Mirrors the agent-gateway approval surface: `{ requests }`.
                return { sessionId, requests: [] };
            }
            case 'app.inputHistory.get': {
                // Mirrors AppRpcServer.getInputHistory -> merged string[].
                const workspace = String(p.workspace || '').trim() || 'default';
                return this.inputHistoryByWorkspace.get(workspace) ?? [];
            }
            case 'app.inputHistory.put': {
                // Mirrors AppRpcServer.putInputHistory -> `{ workspace, entries }`.
                const workspace = String(p.workspace || '').trim() || 'default';
                const entries = Array.isArray(p.entries)
                    ? p.entries.map(String).slice(0, 200)
                    : [];
                this.inputHistoryByWorkspace.set(workspace, entries);
                return { workspace, entries };
            }
            case 'session.plan_mode.get': {
                // Mirrors AppRpcServer.getSessionPlanMode -> `{ sessionId, enabled }`.
                return { sessionId, enabled: false };
            }
            case 'coding_task.list': {
                // Mirrors AppRpcServer.listCodingTasks -> `{ sessionId, tasks, total }`.
                return { sessionId, tasks: [], total: 0 };
            }
            case 'usage.stats': {
                // Mirrors AppRpcServer.getUsageStats -> `{ usage, budgets }` (empty windows).
                return {
                    usage: {
                        daily: { turns: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, sessions: 0, timeRange: null },
                        weekly: { turns: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, sessions: 0, timeRange: null },
                        cumulative: { turns: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, sessions: 0, timeRange: null }
                    },
                    budgets: {}
                };
            }
            case 'summary_quality.stats': {
                // Mirrors AppRpcServer.getSummaryQualityStats -> `{ aggregates }`.
                return { aggregates: [] };
            }
            case 'compaction_history.stats': {
                // Mirrors AppRpcServer.getCompactionHistoryStats -> `{ aggregates }`.
                return { aggregates: [] };
            }
            case 'turn_diagnostics.stats': {
                // Mirrors AppRpcServer.getTurnDiagnosticsStats -> `{ aggregate }`.
                return { aggregate: null };
            }
            default: {
                return { code: -32601, message: `Unknown method: ${method}` };
            }
        }
    }

    private toTimelinePageOptions(p: Record<string, unknown>): TimelinePageOptions {
        const options: TimelinePageOptions = {};
        if (typeof p.limit === 'number') {
            options.limit = p.limit;
        }
        if (typeof p.cursor === 'string') {
            options.cursor = p.cursor;
        }
        return options;
    }

    private toCommandExchangePageOptions(p: Record<string, unknown>): CommandExchangePageOptions {
        const options: CommandExchangePageOptions = {};
        if (typeof p.limit === 'number') {
            options.limit = p.limit;
        }
        if (typeof p.cursor === 'string') {
            options.cursor = p.cursor;
        }
        if (typeof p.sinceSeq === 'number') {
            options.sinceSeq = p.sinceSeq;
        }
        return options;
    }

    get metadata(): FakeAgentMetadata {
        return {
            timelineCount: this.timeline.length,
            commandExchangeCount: this.commandExchange.length,
            rpcCalls: this.rpcCalls,
            projectedEntryCount: this.projectedEntries().length,
            sseFrameCount: this.sse.frameCount,
            sseConsumed: this.sse.consumedCount,
            sseDropped: this.sse.isDropped
        };
    }

    /**
     * Create a real web `fetch` implementation bound to this instance:
     *  - POST `{base}/rpc`            -> JSON-RPC 2.0 envelope -> `{jsonrpc,id,result}` (or error)
     *  - GET `{base}/api/events?...`  -> `text/event-stream` `ReadableStream` (SSE)
     *  - any other path               -> HTTP 404 (never throws)
     */
    createFetchImpl(): typeof fetch {
        const gateway = this;
        return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = new URL(String(input));
            if (url.pathname === '/rpc') {
                let body: any = {};
                if (typeof init?.body === 'string') {
                    try {
                        body = JSON.parse(init.body);
                    } catch {
                        body = {};
                    }
                } else if (init?.body) {
                    body = init.body;
                }
                const method = String(body?.method || '');
                const params = (body?.params ?? {}) as Record<string, unknown> | undefined;
                const result = await gateway.handleRpc(method, params);
                if (result && typeof result === 'object' && result.code === -32601) {
                    return new Response(JSON.stringify({
                        jsonrpc: '2.0',
                        id: body?.id ?? null,
                        error: { code: -32601, message: result.message || 'Method not found' }
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: body?.id ?? null, result }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            if (url.pathname === '/api/events') {
                const sessionId = String(url.searchParams.get('sessionId') || this.sessionId);
                const stream = gateway.sseSession(sessionId).toReadableStream(sessionId);
                return new Response(stream, {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache'
                    }
                });
            }
            return new Response('Not Found', { status: 404 });
        }) as typeof fetch;
    }

    /** The SSE channel bound to a session (branded to satisfy the transport). */
    protected sseSession(sessionId: string): FakeSseChannel {
        return this.sse;
    }
}