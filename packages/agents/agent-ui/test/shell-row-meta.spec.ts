import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { resolveTimelineMeta } from '../src/AgentConsoleTimelineMeta';

function shellRow(status: string) {
    return {
        id: 'shell-1',
        role: 'tool',
        name: 'terminal',
        content: 'echo hi\n\nhi',
        createdAt: 1,
        metadata: { type: 'shell', status, command: 'echo hi' }
    } as any;
}

@Suite('shell row meta keeps only useful words')
export class ShellRowMetaTest {

    @Test('a successful shell row does not repeat the status word')
    async successHasNoStatusWord() {
        expect(resolveTimelineMeta(shellRow('success'), 'tool', 'Success', false, null)).toEqual('');
    }

    @Test('a failed shell row still reports the status word')
    async failureKeepsStatusWord() {
        expect(resolveTimelineMeta(shellRow('failed'), 'tool', 'Failed', false, null)).toContain('Failed');
    }

    @Test('non-shell rows keep their status word')
    async toolRowKeepsStatusWord() {
        const message = {
            id: 'tool-1',
            role: 'tool',
            name: 'read_file',
            content: 'body',
            createdAt: 1,
            metadata: { status: 'success' }
        } as any;
        expect(resolveTimelineMeta(message, 'tool', 'Success', false, null)).toContain('Success');
    }
}
