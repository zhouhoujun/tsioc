import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TestSessionStore } from './test-stores';
import { SessionAdminTool } from '../sessions/session-admin.tool';

function context(sessionId = 's1', principalId?: string): any {
    return { sessionId, principalId };
}

@Suite('session admin tool')
export class SessionAdminToolTest {
    @Test('renames, pins and archives the current session')
    async managesCurrentSession() {
        const store = new TestSessionStore();
        await store.append('s1', { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any);
        await store.setOwner('s1', 'owner-1');
        const tool = new SessionAdminTool(store);

        expect(await tool.invoke({ action: 'rename', title: '  Renamed   session  ' }, context('s1', 'owner-1'))).toEqual({
            updated: true, sessionId: 's1', action: 'rename', title: 'Renamed session'
        });
        expect((await store.get('s1')).title).toEqual('Renamed session');

        expect(await tool.invoke({ action: 'pin' }, context('s1', 'owner-1'))).toEqual({
            updated: true, sessionId: 's1', action: 'pin', pinned: true
        });
        expect((await store.get('s1')).pinned).toEqual(true);

        expect(await tool.invoke({ action: 'unpin' }, context('s1', 'owner-1'))).toEqual({
            updated: true, sessionId: 's1', action: 'unpin', pinned: false
        });
        expect((await store.get('s1')).pinned).toEqual(false);

        expect(await tool.invoke({ action: 'archive' }, context('s1', 'owner-1'))).toEqual({
            updated: true, sessionId: 's1', action: 'archive', archived: true
        });
        expect((await store.get('s1')).archived).toEqual(true);
    }

    @Test('targets another session and rejects foreign owners')
    async managesExplicitSession() {
        const store = new TestSessionStore();
        await store.append('s2', { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any);
        await store.setOwner('s2', 'owner-2');
        const tool = new SessionAdminTool(store);

        expect(await tool.invoke({ action: 'rename', sessionId: 's2', title: 'Other' }, context('s1', 'owner-2'))).toEqual({
            updated: true, sessionId: 's2', action: 'rename', title: 'Other'
        });
        expect((await store.get('s2')).title).toEqual('Other');

        await expect(tool.invoke({ action: 'rename', sessionId: 's2', title: 'Nope' }, context('s1', 'owner-1')))
            .rejects.toThrow('owned by another principal');
    }

    @Test('validates action and title inputs')
    async validatesInput() {
        const store = new TestSessionStore();
        await store.append('s1', { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any);
        const tool = new SessionAdminTool(store);
        await expect(tool.invoke({ action: 'rename' }, context())).rejects.toThrow('requires a non-empty title');
        await expect(tool.invoke({ action: 'explode' }, context())).rejects.toThrow('Unsupported session_admin action');
    }
}
