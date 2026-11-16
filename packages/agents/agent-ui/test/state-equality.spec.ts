import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    sameAgentConsoleApprovals,
    sameAgentConsolePlanTodos,
    sameAgentConsoleSessions,
    sameAgentConsoleStringList,
    sameAgentConsoleTools
} from '../src/AgentConsoleStateEquality';

@Suite('agent console state equality')
export class AgentConsoleStateEqualityTest {
    @Test('session refreshes compare content, not array identity')
    comparesSessionContent() {
        const build = (title: string, current: boolean) => ([
            { id: 'a', current, title, workspace: '/w', updatedAt: 1 },
            { id: 'b', current: false, title: 'Beta', workspace: '/w', updatedAt: 2 }
        ]);
        expect(sameAgentConsoleSessions(build('Alpha', true), build('Alpha', true))).toEqual(true);
        expect(sameAgentConsoleSessions(build('Alpha', true), build('Alpha', false))).toEqual(false);
        expect(sameAgentConsoleSessions(build('Alpha', true), build('Alpha 2', true))).toEqual(false);
    }

    @Test('session sections participate in the session comparison')
    comparesSessionSections() {
        const left = [{ id: 'a', current: true, workspace: '/w', sections: [{ id: 's1', title: 'One' }] }];
        const same = [{ id: 'a', current: true, workspace: '/w', sections: [{ id: 's1', title: 'One' }] }];
        const changed = [{ id: 'a', current: true, workspace: '/w', sections: [{ id: 's1', title: 'Two' }] }];
        expect(sameAgentConsoleSessions(left as any, same as any)).toEqual(true);
        expect(sameAgentConsoleSessions(left as any, changed as any)).toEqual(false);
    }

    @Test('tool lists compare name and activation state')
    comparesTools() {
        const left = [{ name: 'read', active: true }, { name: 'write', active: false }] as any;
        expect(sameAgentConsoleTools(left, [{ name: 'read', active: true }, { name: 'write', active: false }] as any)).toEqual(true);
        expect(sameAgentConsoleTools(left, [{ name: 'read', active: false }, { name: 'write', active: false }] as any)).toEqual(false);
        expect(sameAgentConsoleTools(left, [{ name: 'read', active: true }] as any)).toEqual(false);
    }

    @Test('plan todos compare status, content and revision')
    comparesPlanTodos() {
        const left = [
            { id: 't1', content: 'Build', status: 'in_progress', revision: 2 },
            { id: 't2', content: 'Test', status: 'pending', revision: 2 }
        ] as any;
        expect(sameAgentConsolePlanTodos(left, JSON.parse(JSON.stringify(left)))).toEqual(true);
        expect(sameAgentConsolePlanTodos(left, [
            { id: 't1', content: 'Build', status: 'completed', revision: 2 },
            { id: 't2', content: 'Test', status: 'pending', revision: 2 }
        ] as any)).toEqual(false);
        expect(sameAgentConsolePlanTodos(left, [
            { id: 't1', content: 'Build', status: 'in_progress', revision: 3 },
            { id: 't2', content: 'Test', status: 'pending', revision: 3 }
        ] as any)).toEqual(false);
    }

    @Test('approvals compare the visible request fields')
    comparesApprovals() {
        const left = [{
            id: 'r1', toolName: 'shell', sessionId: 's', reason: 'run', summary: 'ls',
            hasInput: false, createdAt: 1, timeoutMs: 2, expiresAt: 3
        }] as any;
        expect(sameAgentConsoleApprovals(left, [{
            id: 'r1', toolName: 'shell', sessionId: 's', reason: 'run', summary: 'ls',
            hasInput: false, createdAt: 1, timeoutMs: 2, expiresAt: 3
        }] as any)).toEqual(true);
        expect(sameAgentConsoleApprovals(left, [{
            id: 'r1', toolName: 'shell', sessionId: 's', reason: 'changed', summary: 'ls',
            hasInput: false, createdAt: 1, timeoutMs: 2, expiresAt: 3
        }] as any)).toEqual(false);
    }

    @Test('string lists compare positionally')
    comparesStringLists() {
        expect(sameAgentConsoleStringList(['a', 'b'], ['a', 'b'])).toEqual(true);
        expect(sameAgentConsoleStringList(['a', 'b'], ['b', 'a'])).toEqual(false);
        expect(sameAgentConsoleStringList(undefined, [])).toEqual(true);
    }
}
