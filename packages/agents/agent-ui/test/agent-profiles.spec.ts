import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleInputPanelComponent, AgentConsoleSessionState } from '../src';
import {
    buildAgentProfileOptions,
    listAgentProfiles,
    runAgentsCommandView,
    switchAgentProfile
} from '../src/AgentConsoleAgentProfiles';

function createHost(overrides: Record<string, any> = {}): any {
    const notices: string[] = [];
    const switched: string[] = [];
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    return {
        notices,
        switched,
        state,
        translator: null,
        notify: (message: string) => notices.push(message),
        runtime: {
            getSessionArchetype: () => 'build',
            listArchetypes: () => ['build', 'plan', 'review'],
            listAgentProfiles: () => [
                { name: 'build', mode: 'primary', description: 'Full execution' },
                { name: 'plan', mode: 'primary', description: 'Read-only planning' },
                { name: 'review', mode: 'primary', description: 'Read-only review', readOnly: true }
            ],
            setSessionArchetype: (_sessionId: string, name: string) => { switched.push(name); }
        },
        ...overrides
    };
}

@Suite('agent profiles')
export class AgentProfilesTest {
    @Test('picker rows mark the current agent and describe mode/model')
    options() {
        const options = buildAgentProfileOptions([
            { name: 'build', mode: 'primary' },
            { name: 'review', mode: 'primary', model: 'deepseek-v4' }
        ], 'review');
        expect(options[0].label).toEqual('  build');
        expect(options[0].description).toEqual('primary');
        expect(options[1].label).toEqual('● review');
        expect(options[1].description).toEqual('primary · deepseek-v4');
    }

    @Test('lists profiles through app RPC before the runtime registry')
    async listPrefersRpc() {
        const host = createHost({
            appRpc: {
                request: async () => ({ profiles: [{ name: 'planner', mode: 'primary', description: 'plan first' }] })
            }
        });
        const profiles = await listAgentProfiles(host);
        expect(profiles.map((profile: any) => profile.name)).toEqual(['planner']);
    }

    @Test('switches through the runtime and updates the composer badge')
    async switches() {
        const host = createHost();
        await switchAgentProfile(host, 'plan');
        expect(host.switched).toEqual(['plan']);
        expect(host.state.activeArchetype).toEqual('plan');
        expect(host.notices[0]).toContain('plan');
        // The profile badge belongs to the meta rail, not the input prompt.
        host.state.inputPrompt = '>';
        const panel = new AgentConsoleInputPanelComponent(host.state);
        expect(panel.inputPrompt).toEqual('>');
        expect(panel.agentBadgeLabel).toEqual('agent plan');
    }

    @Test('no-argument /agents opens the picker and switches the selection')
    async picker() {
        const host = createHost();
        host.state.selectAsync = async (_title: string, options: any[], index: number) => {
            expect(index).toEqual(0);
            return options[2].value;
        };
        host.state.activeArchetype = 'build';
        await runAgentsCommandView(host, '');
        expect(host.switched).toEqual(['review']);
        expect(host.state.activeArchetype).toEqual('review');
    }

    @Test('/agents <name> switches without opening a menu')
    async directArg() {
        const host = createHost();
        let opened = 0;
        host.state.selectAsync = async () => { opened += 1; return undefined; };
        await runAgentsCommandView(host, 'plan');
        expect(opened).toEqual(0);
        expect(host.switched).toEqual(['plan']);
    }
}
