import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { readSessionToolPayload } from '../src/app-rpc/session-tool-payload';

/** The console inspector fetches one tool payload on demand. */
@Suite('session.tool_payload rpc')
export class SessionToolPayloadTest {
    protected host(access: string[]): any {
        return {
            requireSessionId: (params: any) => String(params.sessionId || ''),
            ensureSessionAccess: async (sessionId: string) => { access.push(sessionId); }
        };
    }

    @Test('returns the stored payload for the requested tool call')
    async returnsPayload() {
        const access: string[] = [];
        const store: any = { getToolPayload: async (_sessionId: string, toolCallId: string) => toolCallId === 'call-1' ? 'line 200' : undefined };
        const result = await readSessionToolPayload(store, this.host(access), { sessionId: 's1', toolCallId: 'call-1' }, {});
        expect(result).toEqual({ toolCallId: 'call-1', text: 'line 200' });
        expect(access).toEqual(['s1']);
    }

    @Test('missing or empty tool calls return an empty payload after the access check')
    async missingPayload() {
        const access: string[] = [];
        const store: any = { getToolPayload: async () => undefined };
        expect((await readSessionToolPayload(store, this.host(access), { sessionId: 's1', toolCallId: 'nope' }, {})).text).toEqual('');
        expect((await readSessionToolPayload(store, this.host(access), { sessionId: 's1' }, {})).text).toEqual('');
        expect(access).toEqual(['s1', 's1']);
    }
}
