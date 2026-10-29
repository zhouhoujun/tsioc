import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AGENT_CONSOLE_COMMAND_DEFINITIONS,
    AGENT_CONSOLE_COMMAND_GROUP_ORDER
} from '../src/AgentConsoleCommandRegistry';
import { buildAgentConsoleHelpGroups, buildAgentConsoleHelpLines } from '../src/AgentConsoleHelpView';

@Suite('/help grouped catalogue')
export class HelpViewTest {
    @Test('lists one row per non-empty command group with a count')
    groups() {
        const groups = buildAgentConsoleHelpGroups(undefined, count => `${count} commands`);
        const expected = AGENT_CONSOLE_COMMAND_GROUP_ORDER.filter(group =>
            AGENT_CONSOLE_COMMAND_DEFINITIONS.some(def => def.group === group && !def.hidden));
        expect(groups.map(group => group.value)).toEqual(expected.map(group => `group:${group}`));
        expect(groups.every(group => /^\d+ commands$/.test(group.description))).toEqual(true);
        expect(groups.find(group => group.value === 'group:core')).toBeTruthy();
    }

    @Test('capitalizes a raw lowercase group translation')
    rawGroupKey() {
        const groups = buildAgentConsoleHelpGroups((_key, fallback) => fallback.toLowerCase());
        expect(groups[0].label).toEqual('Core');
    }

    @Test('full help is grouped and omits hidden commands and subcommand rows')
    fullCatalogue() {
        const body = buildAgentConsoleHelpLines().join('\n');
        for (const group of ['Core', 'Session', 'Display', 'Input']) {
            expect(body).toContain(group);
        }
        expect(body).toContain('/help');
        expect(body).toContain('/model');
        expect(body).not.toContain('/approve retry');
        expect(body).not.toContain('/keymap set');
    }

    @Test('name matches win over description matches')
    filtersByName() {
        const body = buildAgentConsoleHelpLines({ query: 'keymap' }).join('\n');
        expect(body).toContain('/keymap');
        expect(body).toContain('/keymap set');
        expect(body).not.toContain('/reload');
    }

    @Test('falls back to description matches')
    filtersByDescription() {
        const body = buildAgentConsoleHelpLines({ query: 'sandbox' }).join('\n');
        expect(body).toContain('/permissions');
    }

    @Test('group filter shows only that group')
    filtersByGroup() {
        const body = buildAgentConsoleHelpLines({ group: 'core' }).join('\n');
        expect(body).toContain('Core');
        expect(body).toContain('/model');
        expect(body).not.toContain('Session');
    }

    @Test('unknown query returns no rows')
    noMatches() {
        expect(buildAgentConsoleHelpLines({ query: 'no-such-command' })).toEqual([]);
    }
}
