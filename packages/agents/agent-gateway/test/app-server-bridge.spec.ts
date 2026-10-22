import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { mapRunTurnStreamChunk, toLocalAppRpcError } from '../src/agent-app-server.module';

@Suite('Agent app server stream bridge')
export class AppServerBridgeTest {
    @Test('forwards toolCalls through run.turn_stream.chunk mapping')
    forwardsToolCalls() {
        const chunk = mapRunTurnStreamChunk({
            chunkType: 'tool_call',
            content: 'read_file',
            toolCalls: [{ id: 't1', name: 'read_file', input: { path: 'a.ts' } }],
            usage: { totalTokens: 3 }
        });

        expect(chunk.type).toEqual('tool_call');
        expect(chunk.content).toEqual('read_file');
        expect(chunk.toolCalls?.[0]?.name).toEqual('read_file');
        expect(chunk.toolCalls?.[0]?.input?.path).toEqual('a.ts');
        expect(chunk.usage?.totalTokens).toEqual(3);
    }

    @Test('forwards toolCallId so per-invocation tool event keys survive the relay')
    forwardsToolCallIdentity() {
        const chunk = mapRunTurnStreamChunk({
            chunkType: 'event',
            eventType: 'tool_completed',
            label: 'tool',
            status: 'success',
            content: 'file body',
            toolName: 'read_file',
            toolCallId: 'call-1'
        });

        expect(chunk.toolCallId).toEqual('call-1');
    }

    @Test('forwards the backend durationMs so tool rows show the real execution time')
    forwardsDurationMs() {
        const chunk = mapRunTurnStreamChunk({
            chunkType: 'event',
            eventType: 'tool_completed',
            label: 'tool',
            status: 'success',
            content: 'file body',
            toolName: 'write_file',
            toolCallId: 'call-1',
            durationMs: 16
        });
        expect(chunk.durationMs).toEqual(16);
        expect(mapRunTurnStreamChunk({ chunkType: 'event', eventType: 'tool_invoked' }).durationMs).toBeUndefined();
    }

    @Test('forwards the structured approval request (id, reason, input, timing)')
    forwardsApprovalDetails() {
        const chunk = mapRunTurnStreamChunk({
            chunkType: 'event',
            eventType: 'approval_requested',
            label: 'approval',
            status: 'running',
            content: 'Approval required for terminal: Tool "terminal" requires approval.',
            toolName: 'terminal',
            approvalId: 'ap-1',
            reason: 'Tool "terminal" requires approval.',
            summary: 'Tool "terminal" requires approval. Summary: {"command":"ls"}',
            reasonDetail: { code: 'tool-requires-approval' },
            hasInput: true,
            inputSummary: '{"command":"ls"}',
            timeoutMs: 30000,
            expiresAt: 1700000000000
        });

        // The TUI renders `$ <inputSummary>` and `Reason: <reason>`; dropping
        // these fields made it re-render the composed `content` as both.
        expect(chunk.approvalId).toEqual('ap-1');
        expect(chunk.reason).toEqual('Tool "terminal" requires approval.');
        expect(chunk.inputSummary).toEqual('{"command":"ls"}');
        expect(chunk.timeoutMs).toEqual(30000);
        expect(chunk.expiresAt).toEqual(1700000000000);
        expect(chunk.reasonDetail?.code).toEqual('tool-requires-approval');
        expect(chunk.hasInput).toEqual(true);
    }

    @Test('local bridge keeps the structured ModelFailure the console renders')
    localBridgePreservesModelFailure() {
        const failure = {
            kind: 'quota' as const,
            status: 402,
            provider: 'deepseek',
            model: 'deepseek-flash',
            detail: 'Insufficient Balance',
            requestId: 'req-402',
            retryable: false
        };

        const error = toLocalAppRpcError({
            code: -32603,
            message: 'Model request failed with 402 (deepseek/deepseek-flash): Insufficient Balance',
            data: { modelFailure: failure }
        });

        expect(error.message).toEqual(
            'Model request failed with 402 (deepseek/deepseek-flash): Insufficient Balance'
        );
        expect((error as any).modelFailure).toEqual(failure);
    }

    @Test('plain RPC error keeps the message-only shape')
    plainRpcErrorUnchanged() {
        const error = toLocalAppRpcError({ code: -32603, message: 'boom' }, 'App RPC stream failed');

        expect(error.message).toEqual('boom');
        expect((error as any).modelFailure).toBeUndefined();
    }
}
