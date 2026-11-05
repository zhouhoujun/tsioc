import type { AgentConsoleAppRpc } from '@tsdi/agent';
import { formatAgentUiNotice } from './agent-ui.i18n';

export interface RemoteAgentConsoleEvent {
    type: string;
    sessionId?: string;
    data?: any;
}

export interface AgentConsoleRemoteEventBridgeOptions {
    baseUrl: string;
    token?: string;
    fetchImpl?: typeof fetch;
    rpc?: AgentConsoleAppRpc | null;
    reconnectDelayMs?: number;
    onReconnected?: () => void;
}

interface SseFrame {
    event?: string;
    data?: string;
}

export function resolveFetch(options: AgentConsoleRemoteEventBridgeOptions): typeof fetch {
    const custom = options.fetchImpl;
    if (custom) {
        return custom;
    }
    const globalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    if (globalFetch) {
        // Browsers throw "Illegal invocation" when extracted window.fetch is called
        // with a detached receiver; bind it to the global object.
        return globalFetch.bind(globalThis) as typeof fetch;
    }
    return (() => { throw new Error(formatAgentUiNotice(undefined, 'fetchUnavailableRemoteEventBridge')); }) as unknown as typeof fetch;
}

export function parseSseFrames(input: string): { frames: SseFrame[]; rest: string } {
    const frames: SseFrame[] = [];
    let buffer = input;
    let delimiterIndex: number;
    while ((delimiterIndex = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, delimiterIndex);
        buffer = buffer.slice(delimiterIndex + 2);
        const frame = parseSseBlock(block);
        if (frame) {
            frames.push(frame);
        }
    }
    return { frames, rest: buffer };
}

function parseSseBlock(block: string): SseFrame | undefined {
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const rawLine of block.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) {
            continue;
        }
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
            continue;
        }
        if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
            continue;
        }
    }
    if (!dataLines.length) {
        return undefined;
    }
    return { event, data: dataLines.join('\n') };
}

export function decodeSseFrame(frame: SseFrame): RemoteAgentConsoleEvent | undefined {
    if (!frame.data) {
        return undefined;
    }
    let payload: any;
    try {
        payload = JSON.parse(frame.data);
    } catch {
        return undefined;
    }
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }
    return {
        type: frame.event || payload.type || 'message',
        sessionId: payload.sessionId,
        data: payload
    };
}
