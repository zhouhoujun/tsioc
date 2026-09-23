import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { mapRunTurnStreamChunk } from '../src/agent-app-server.module';

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
}
