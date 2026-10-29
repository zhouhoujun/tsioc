import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AGENT_CONSOLE_COMMAND_DEFINITIONS,
    AGENT_CONSOLE_COMMAND_GROUP_ORDER,
    AGENT_CONSOLE_FEATURED_COMMANDS,
    agentConsoleCommandHints,
    buildAgentConsoleHelpOptions,
    formatAgentConsoleCommandArgumentTemplate,
    getAgentConsoleCommandDefinition,
    getAgentConsoleCommandName,
    parseAgentConsoleCommandArguments,
    resolveAgentConsoleCommandDescription
} from '../src';
import { AgentConsoleSessionState } from '../src';

const GROUP_COUNTS: Record<string, number> = {
    core: 21,
    session: 27,
    display: 10,
    input: 10,
    review: 8,
    hooks: 4,
    delegation: 10,
    system: 5
};

const NEEDS_ARGS_COMMANDS = [
    '/unshare',
    '/rename',
    '/search',
    '/cd'
];

@Suite('Agent console command registry')
export class AgentConsoleCommandRegistryTest {

    @Test('defines all 95 commands with defined groups, /help first')
    registryCompleteness() {
        expect(AGENT_CONSOLE_COMMAND_DEFINITIONS.length).toEqual(95);
        expect(AGENT_CONSOLE_COMMAND_DEFINITIONS[0].name).toEqual('/help');
        AGENT_CONSOLE_COMMAND_DEFINITIONS.forEach(def => {
            expect(def.name.startsWith('/')).toEqual(true);
            expect(AGENT_CONSOLE_COMMAND_GROUP_ORDER).toContain(def.group);
        });
    }

    @Test('keeps group command counts aligned with locked design')
    groupCounts() {
        AGENT_CONSOLE_COMMAND_GROUP_ORDER.forEach(group => {
            const actual = AGENT_CONSOLE_COMMAND_DEFINITIONS.filter(def => def.group === group).length;
            expect(actual).toEqual(GROUP_COUNTS[group]);
        });
    }

    @Test('hidden commands stay executable but leave the menu and /help')
    hiddenCommandsLeaveTheMenu() {
        const hidden = AGENT_CONSOLE_COMMAND_DEFINITIONS.filter(def => def.hidden).map(def => def.name);
        expect(hidden.length).toEqual(19);
        const hints = agentConsoleCommandHints();
        const help = buildAgentConsoleHelpOptions();
        hidden.forEach(name => {
            expect(hints.includes(name)).toEqual(false);
            expect(help.some(option => option.value === name)).toEqual(false);
            // Dispatch and argument validation still resolve the definition.
            expect(getAgentConsoleCommandDefinition(name)?.name).toEqual(name);
        });
        expect(hints.includes('/tui')).toEqual(true);
        expect(hints.includes('/new')).toEqual(true);
        expect(hints.includes('/review')).toEqual(true);
        expect(getAgentConsoleCommandDefinition('/experimental')).toEqual(undefined);
    }

    @Test('slash menu is curated and keeps the full catalogue in /help')
    curatedSlashMenu() {
        const hints = agentConsoleCommandHints();
        expect(new Set(hints)).toEqual(new Set(AGENT_CONSOLE_FEATURED_COMMANDS));
        expect(hints.length).toEqual(23);
        expect(hints[0]).toEqual('/help');
        const help = buildAgentConsoleHelpOptions();
        for (const advanced of ['/tools', '/mcp', '/keymap', '/search', '/snapshot', '/outputs', '/voice', '/jobs']) {
            expect(hints.includes(advanced)).toEqual(false);
            expect(help.some(option => option.value === advanced)).toEqual(true);
        }
        // Aliases remain executable but do not duplicate the curated menu.
        expect(hints.includes('/connect')).toEqual(false);
        expect(hints.includes('/web')).toEqual(false);
    }

    @Test('keeps canonical command names unique')
    canonicalNamesUnique() {
        const names = AGENT_CONSOLE_COMMAND_DEFINITIONS.map(def => def.name);
        expect(new Set(names).size).toEqual(names.length);
    }

    @Test('resolves aliases to canonical names without collisions')
    aliasesResolveCanonically() {
        const names = new Set(AGENT_CONSOLE_COMMAND_DEFINITIONS.map(def => def.name));
        const aliasOwners = new Map<string, string>();
        AGENT_CONSOLE_COMMAND_DEFINITIONS.forEach(def => {
            (def.aliases || []).forEach(alias => {
                expect(alias.startsWith('/')).toEqual(true);
                expect(names.has(alias)).toEqual(false);
                expect(aliasOwners.has(alias)).toEqual(false);
                aliasOwners.set(alias, def.name);
                expect(getAgentConsoleCommandName(alias)).toEqual(def.name);
            });
        });
        expect(getAgentConsoleCommandName('/exit')).toEqual('/exit');
        expect(getAgentConsoleCommandDefinition('/q')).toBeUndefined();
        expect(getAgentConsoleCommandDefinition('/x')).toBeUndefined();
        expect(getAgentConsoleCommandDefinition('/quit')).toBeUndefined();
        expect(getAgentConsoleCommandName('/unknown')).toEqual('/unknown');
    }

    @Test('flags exactly the argument-required commands as needsArgs')
    needsArgsCovered() {
        const needsArgs = AGENT_CONSOLE_COMMAND_DEFINITIONS
            .filter(def => def.needsArgs)
            .map(def => def.name);
        expect(needsArgs).toEqual(NEEDS_ARGS_COMMANDS);
    }

    @Test('builds merged command hints with aliases and dedup')
    hintsMergeAndDedupe() {
        const hints = agentConsoleCommandHints(['/external', '/help', '/q']);
        expect(hints[0]).toEqual('/help');
        expect(new Set(hints).size).toEqual(hints.length);
        expect(hints).not.toContain('/quit');
        expect(hints).toContain('/external');
        expect(hints.filter(hint => hint === '/help').length).toEqual(1);
        const base = agentConsoleCommandHints();
        base.forEach(hint => expect(hint.startsWith('/')).toEqual(true));
        expect(base).not.toContain('/q');
    }

    @Test('formats descriptions as [组] 描述 and resolves aliases')
    descriptionFormat() {
        expect(resolveAgentConsoleCommandDescription('/help')).toEqual('[核心] show command help, grouped by category');
        expect(resolveAgentConsoleCommandDescription('/q')).toEqual(undefined);
        expect(resolveAgentConsoleCommandDescription('/unknown')).toEqual(undefined);
    }

    @Test('builds grouped /help options with subcommand rows and @workspace last')
    helpOptionsGrouped() {
        const options = buildAgentConsoleHelpOptions();
        expect(options.length).toBeGreaterThan(AGENT_CONSOLE_COMMAND_DEFINITIONS.filter(def => !def.hidden).length);
        expect(options[0].value).toEqual('/help');
        expect(options[options.length - 1].value).toEqual('@workspace');
        const seenGroups: string[] = [];
        let lastGroupIndex = -1;
        options.forEach(option => {
            const def = getAgentConsoleCommandDefinition(option.value);
            if (def && def.name === option.value) {
                const groupIndex = AGENT_CONSOLE_COMMAND_GROUP_ORDER.indexOf(def.group);
                expect(groupIndex).toBeGreaterThanOrEqual(lastGroupIndex);
                lastGroupIndex = groupIndex;
                if (!seenGroups.includes(def.group)) {
                    seenGroups.push(def.group);
                }
            }
        });
        expect(seenGroups).toEqual(AGENT_CONSOLE_COMMAND_GROUP_ORDER);
        expect(options.some(option => option.value === '/delegation tree')).toEqual(true);
        // Hidden commands keep their handlers but leave the menu and /help.
        expect(options.some(option => option.value === '/approve retry')).toEqual(false);
        expect(options.some(option => option.value === '/quality trend')).toEqual(false);
        const values = options.map(option => option.value);
        expect(new Set(values).size).toEqual(values.length);
    }

    @Test('smart-run: required-argument commands wait, optional-argument commands execute')
    async smartRunRespectsNeedsArgs() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        let submitCount = 0;
        state.submitAction = async () => {
            submitCount += 1;
        };

        // `/search` requires a query: Enter completes it and waits.
        state.setInput('/sea');
        const needsArgsResult = await state.acceptSelectMenu('/search');
        expect(needsArgsResult.submitted).toEqual(false);
        expect(state.input).toEqual('/search ');
        expect(submitCount).toEqual(0);

        // `/model` has a meaningful no-argument form (open the switcher):
        // Enter must execute it, exactly like `/help`.
        state.setInput('/mod');
        const modelResult = await state.acceptSelectMenu('/model');
        expect(modelResult.submitted).toEqual(true);
        expect(state.input).toEqual('/model ');
        expect(submitCount).toEqual(1);

        state.setInput('/he');
        const noArgsResult = await state.acceptSelectMenu('/help');
        expect(noArgsResult.submitted).toEqual(true);
        expect(state.input).toEqual('/help ');
        expect(submitCount).toEqual(2);
    }

    @Test('smart-run: external injected hints keep legacy submit behavior')
    async smartRunKeepsExternalHintSubmit() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        let submitCount = 0;
        state.submitAction = async () => {
            submitCount += 1;
        };

        state.setCommandHints(['/custom']);
        state.setInput('/');
        const result = await state.acceptSelectMenu('/custom');
        expect(result.submitted).toEqual(true);
        expect(state.input).toEqual('/custom ');
        expect(submitCount).toEqual(1);
    }

    @Test('parses structured arguments with required, defaults, variadic values, and diagnostics')
    argumentSchemaDiagnostics() {
        const definition = {
            name: '/example', description: 'example', group: 'core' as const,
            args: [
                { name: 'mode', type: 'enum' as const, values: ['fast', 'safe'], required: true },
                { name: 'label', default: 'current' },
                { name: 'paths', variadic: true }
            ]
        };
        const valid = parseAgentConsoleCommandArguments(definition, 'safe "release notes" src/a src/b');
        expect(valid.diagnostics).toEqual([]);
        expect(valid.resolved).toEqual(['safe', 'release notes', 'src/a src/b']);
        expect(formatAgentConsoleCommandArgumentTemplate(definition)).toEqual('<mode> [label] [paths...]');

        const missing = parseAgentConsoleCommandArguments(definition, '');
        expect(missing.diagnostics[0].code).toEqual('missing');
        expect(missing.resolved).toEqual(['current']);

        const invalid = parseAgentConsoleCommandArguments(definition, 'slow');
        expect(invalid.diagnostics[0].code).toEqual('invalid');

        const single = { name: '/single', description: 'single', group: 'core' as const, args: [{ name: 'value' }] };
        expect(parseAgentConsoleCommandArguments(single, 'one two').diagnostics[0].code).toEqual('extra');
    }

    @Test('validates representative command contracts before dispatch')
    representativeCommandContracts() {
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/search'), '').diagnostics[0].code).toEqual('missing');
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/search'), 'quoted query terms').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/snapshot'), 'release').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/review'), 'task-7').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/diff'), '--staged src/a.ts').diagnostics).toEqual([]);
    }

    @Test('command interaction keeps correction flow and resolves aliases')
    async commandInteractionCorrectionAndAlias() {
        const invalid = parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/copy'), 'unknown');
        expect(invalid.diagnostics[0].code).toEqual('invalid');
        expect(invalid.diagnostics[0].suggestion).toBeDefined();

        const corrected = parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/copy'), 'session');
        expect(corrected.diagnostics).toEqual([]);
        expect(corrected.resolved).toEqual(['session']);
        expect(getAgentConsoleCommandName('/exit')).toEqual('/exit');
    }
}
