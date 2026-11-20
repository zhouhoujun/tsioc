import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

function buildServer(existing: Set<string>) {
    const sessions = {
        has: async (sessionId: string) => existing.has(sessionId),
        get: async (sessionId: string) => ({ sessionId, createdAt: 1, updatedAt: 2, workspace: '/work/app', messages: [] }),
        setWorkspace: async () => undefined
    };
    return new AppRpcServer(
        {} as any,
        new RandomUuidGenerator(),
        sessions as any,
        {} as any,
        {} as any,
        { authorize: async () => 'anonymous' } as any,
        { track: () => undefined } as any,
        {} as any
    );
}

@Suite('session.exists probes before a resume can create')
export class SessionExistsTest {

    @Test('reports an existing session')
    async existingSession() {
        const server = buildServer(new Set(['chat-existing']));
        const result = await (server as any).dispatch('session.exists', { sessionId: 'chat-existing' }, {});
        expect(result).toEqual({ sessionId: 'chat-existing', exists: true });
    }

    @Test('reports a missing session without creating it')
    async missingSession() {
        const server = buildServer(new Set());
        const result = await (server as any).dispatch('session.exists', { sessionId: 'chat-typo' }, {});
        expect(result).toEqual({ sessionId: 'chat-typo', exists: false });
    }

    @Test('rejects a missing session id')
    async requiresSessionId() {
        const server = buildServer(new Set());
        let thrown: any = null;
        try {
            await (server as any).dispatch('session.exists', {}, {});
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
    }
}

@Suite('agent profile catalogue RPC')
export class AgentProfileCatalogueTest {
    @Test('session.archetype.list returns profile metadata')
    async listsProfiles() {
        const runtime = {
            listAgentProfiles: () => [
                { name: 'build', mode: 'primary', description: 'Full execution' },
                { name: 'review', mode: 'primary', readOnly: true, model: 'deepseek-v4' }
            ]
        };
        const server = new AppRpcServer(
            runtime as any,
            new RandomUuidGenerator(),
            { has: async () => true } as any,
            {} as any,
            {} as any,
            { authorize: async () => 'anonymous' } as any,
            { track: () => undefined } as any,
            {} as any
        );
        const result = await (server as any).dispatch('session.archetype.list', {}, {});
        expect(result.profiles.map((profile: any) => profile.name)).toEqual(['build', 'review']);
        expect(result.profiles[1].readOnly).toEqual(true);
        expect(result.profiles[1].model).toEqual('deepseek-v4');
    }
}

@Suite('file snapshot list RPC')
export class FileSnapshotListTest {
    @Test('session.file_snapshot.list returns metadata without contents')
    async listsFileSnapshots() {
        const runtime = {
            listFileSnapshots: () => [{
                filePath: 'src/a.ts',
                before: 'old',
                after: 'new',
                timestamp: 5,
                toolName: 'write',
                files: [{ filePath: 'src/a.ts', before: 'old', after: 'new' }]
            }]
        };
        const server = new AppRpcServer(
            runtime as any,
            new RandomUuidGenerator(),
            { has: async () => true } as any,
            {} as any,
            {} as any,
            { authorize: async () => 'anonymous' } as any,
            { track: () => undefined } as any,
            {} as any
        );
        const result = await (server as any).dispatch('session.file_snapshot.list', { sessionId: 's1' }, {});
        expect(result.snapshots.length).toEqual(1);
        expect(result.snapshots[0].filePath).toEqual('src/a.ts');
        expect(result.snapshots[0].before).toBeUndefined();
        expect(result.snapshots[0].files).toEqual(['src/a.ts']);
    }
}

@Suite('side question RPC')
export class SideQuestionRpcTest {
    @Test('session.side_question returns the model answer without touching the session')
    async answersSideQuestion() {
        const calls: Array<[string, string]> = [];
        const runtime = {
            askSideQuestion: async (sessionId: string, question: string) => {
                calls.push([sessionId, question]);
                return 'Because the test failed earlier.';
            }
        };
        const server = new AppRpcServer(
            runtime as any,
            new RandomUuidGenerator(),
            { has: async () => true, get: async () => ({ sessionId: 'chat-1', messages: [] }) } as any,
            {} as any,
            {} as any,
            { authorize: async () => 'anonymous' } as any,
            { track: () => undefined } as any,
            {} as any
        );
        const result = await (server as any).dispatch('session.side_question', {
            sessionId: 'chat-1',
            question: 'why?'
        }, {});
        expect(result).toEqual({ answer: 'Because the test failed earlier.' });
        expect(calls).toEqual([['chat-1', 'why?']]);
    }

    @Test('session.side_question requires a question')
    async requiresQuestion() {
        const server = new AppRpcServer(
            { askSideQuestion: async () => '' } as any,
            new RandomUuidGenerator(),
            { has: async () => true } as any,
            {} as any,
            {} as any,
            { authorize: async () => 'anonymous' } as any,
            { track: () => undefined } as any,
            {} as any
        );
        let thrown: any = null;
        try {
            await (server as any).dispatch('session.side_question', { sessionId: 'chat-1' }, {});
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
    }
}
