import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { asModelFailure } from '@tsdi/agent';
import { HttpAgentConsoleAppRpc } from '../src';
import { presentModelFailure } from '../src/AgentConsoleModelFailurePresenter';

function jsonResponse(status: number, body: any): Response {
    return new Response(body === undefined ? undefined : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function ndjsonResponse(status: number, lines: string[]): Response {
    return new Response(lines.join('\n'), {
        status,
        headers: { 'Content-Type': 'application/x-ndjson' }
    });
}

const QUOTA_FAILURE = {
    kind: 'quota' as const,
    status: 402,
    provider: 'deepseek',
    model: 'deepseek-flash',
    detail: 'Insufficient Balance',
    requestId: 'req-402',
    retryable: false
};

/**
 * The gateway now ships `error.data.modelFailure`, but the client rebuilt RPC
 * errors from `message` alone. Without re-attaching the failure the console
 * falls back to the raw provider string and loses the actionable quota wording.
 */
@Suite('HttpAgentConsoleAppRpc model failure transport')
export class HttpRpcModelFailureTest {
    @Test('request re-attaches modelFailure from the error payload')
    async requestReattachesModelFailure() {
        const fetchImpl = async () => jsonResponse(200, {
            jsonrpc: '2.0',
            id: 1,
            error: {
                code: -32603,
                message: 'Model request failed with 402 (deepseek/deepseek-flash): Insufficient Balance',
                data: { modelFailure: QUOTA_FAILURE }
            }
        });
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });

        let caught: unknown;
        try {
            await rpc.request('app.ping');
        } catch (error) {
            caught = error;
        }

        expect(asModelFailure(caught)).toEqual(QUOTA_FAILURE);
    }

    @Test('stream re-attaches modelFailure from the NDJSON error line')
    async streamReattachesModelFailure() {
        const fetchImpl = async () => ndjsonResponse(200, [
            JSON.stringify({
                jsonrpc: '2.0',
                id: 7,
                error: {
                    code: -32603,
                    message: 'Model request failed with 402 (deepseek/deepseek-flash): Insufficient Balance',
                    data: { modelFailure: QUOTA_FAILURE }
                }
            })
        ]);
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });

        let caught: unknown;
        try {
            for await (const _chunk of rpc.stream('run.turn_stream', { sessionId: 's1', input: 'x' })) {
            }
        } catch (error) {
            caught = error;
        }

        expect(asModelFailure(caught)).toEqual(QUOTA_FAILURE);
    }

    @Test('plain RPC error keeps message-only shape')
    async plainErrorUnchanged() {
        const fetchImpl = async () => jsonResponse(200, {
            jsonrpc: '2.0',
            id: 1,
            error: { code: -32603, message: 'boom' }
        });
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });

        let caught: any;
        try {
            await rpc.request('app.ping');
        } catch (error) {
            caught = error;
        }

        expect(caught.message).toEqual('boom');
        expect(caught.code).toEqual(-32603);
        expect(asModelFailure(caught)).toBeUndefined();
    }

    @Test('gateway error payload renders actionable wording end to end')
    async rendersActionableWordingEndToEnd() {
        const fetchImpl = async () => ndjsonResponse(200, [
            JSON.stringify({
                jsonrpc: '2.0',
                id: 7,
                error: {
                    code: -32603,
                    message: 'Model request failed with 402 (deepseek/deepseek-flash): Insufficient Balance (request_id: req-402)',
                    data: { modelFailure: QUOTA_FAILURE }
                }
            })
        ]);
        const rpc = new HttpAgentConsoleAppRpc({ baseUrl: 'http://localhost:8080', fetchImpl: fetchImpl as any });

        let caught: unknown;
        try {
            for await (const _chunk of rpc.stream('run.turn_stream', { sessionId: 's1', input: 'x' })) {
            }
        } catch (error) {
            caught = error;
        }

        const shown = presentModelFailure(caught);
        expect(shown).toBeTruthy();
        expect(shown!.toLowerCase()).toContain('insufficient balance');
        expect(shown!.toLowerCase()).toContain('switch model');
        expect(shown).toContain('request_id: req-402');
        expect(shown).not.toContain('Model request failed with');
    }
}
