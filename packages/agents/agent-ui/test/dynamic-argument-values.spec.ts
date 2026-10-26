import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { resolveDynamicArgumentValues } from '../src/AgentConsoleArgumentValues';
import { resolveAgentConsoleInputSuggestions } from '../src/AgentConsoleSuggestions';

const host: any = {
    tools: [
        { name: 'terminal', toolset: 'terminal', active: true },
        { name: 'disabled-tool', toolset: 'terminal', active: false }
    ],
    sessions: [
        { id: 'chatalpha', current: false, title: 'Alpha work', workspace: '/w' },
        { id: 'chatarchived', current: false, archived: true }
    ],
    mentionCatalog: [
        { kind: 'skill', id: 'plan-mode', title: 'Plan Mode', description: 'plan' },
        { kind: 'plugin', id: 'ops', title: 'Ops' }
    ]
};

/**
 * `/tools`, `/session`, `/theme`, `/skills`, `/plugins` arguments are runtime
 * data; the registry can only declare static enums, so typing them by hand was
 * the remaining `/` completion gap.
 */
@Suite('dynamic argument values')
export class DynamicArgumentValuesTest {

    @Test('runtime data backs the arguments')
    async resolvesRuntimeValues() {
        expect(resolveDynamicArgumentValues(host, '/tools', 0)!.map(option => option.value)).toEqual(['terminal', 'disabled-tool']);
        expect(resolveDynamicArgumentValues(host, '/session', 0)!.map(option => option.value)).toEqual(['chatalpha']);
        expect(resolveDynamicArgumentValues(host, '/theme', 0)!.map(option => option.value)).toContain('dark');
        expect(resolveDynamicArgumentValues(host, '/skills', 0)!.map(option => option.value)).toEqual(['plan-mode']);
        expect(resolveDynamicArgumentValues(host, '/plugins', 0)!.map(option => option.value)).toEqual(['ops']);
    }

    @Test('the typed prefix filters by value or label')
    async filtersByPrefix() {
        expect(resolveDynamicArgumentValues(host, '/tools', 0, 'te')!.map(option => option.value)).toEqual(['terminal']);
        expect(resolveDynamicArgumentValues(host, '/tools', 0, 'zz')!.length).toEqual(0);
        expect(resolveDynamicArgumentValues(host, '/session', 0, 'alpha')!.map(option => option.value)).toEqual(['chatalpha']);
    }

    @Test('other positions and unknown commands stay static')
    async leavesOtherPositionsAlone() {
        expect(resolveDynamicArgumentValues(host, '/tools', 1, 'te')).toBeUndefined();
        expect(resolveDynamicArgumentValues(host, '/model', 0, 'gp')).toBeUndefined();
    }

    @Test('the suggestion engine merges dynamic candidates')
    async engineMergesDynamic() {
        const options = resolveAgentConsoleInputSuggestions(
            '/tools te',
            '/tools te'.length,
            [],
            [],
            [],
            {},
            (command, index, _words, token) => resolveDynamicArgumentValues(host, command, index, token)
        );
        expect(options.map(option => option.value)).toEqual(['terminal']);
    }
}
