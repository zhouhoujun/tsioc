import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsoleParts, RuntimeStub, SchedulerStub, ToolRegistryStub } from './_helpers';
import { executeGlobalKeyActionView } from '../src/AgentConsoleGlobalKeyActions';
import { decodeGlobalKey } from '../src/AgentConsoleStreamHelpers';
import { normalizeAgentConsoleBrowserKey } from '../src/AgentConsoleKeyNormalization';

function build() {
    const runtime = new RuntimeStub();
    (runtime as any).listAgentProfiles = () => [
        { name: 'build', mode: 'primary' },
        { name: 'review', mode: 'primary' },
        { name: 'explore', mode: 'subagent' }
    ];
    (runtime as any).setSessionArchetype = (sessionId: string, name: string) => {
        runtime.calls.push(`archetype:${sessionId}:${name}`);
    };
    const parts = createConsoleParts(runtime, new SchedulerStub(), new ToolRegistryStub());
    parts.state.configure({ sessionId: 'session-1' } as any);
    parts.state.activeArchetype = 'build';
    return { ...parts, runtime };
}

@Suite('shift+tab agent cycling')
export class ArchetypeCycleTest {
    @Test('binds shift+tab and decodes both terminals and browsers')
    bindings() {
        const { component } = build();
        expect((component as any).globalKeymap.resolve('shift+tab', 'global')).toEqual('archetype-cycle');
        expect(decodeGlobalKey('\u001b[Z')).toEqual('shift+tab');
        expect(normalizeAgentConsoleBrowserKey('Tab', { shiftKey: true })).toEqual('shift+tab');
    }

    @Test('/archetype next cycles primary profiles and skips subagents')
    async cycles() {
        const { state, component, runtime } = build();
        await (component as any).handleCommand('/archetype next');
        expect(state.activeArchetype).toEqual('review');
        expect(runtime.calls).toContain('archetype:session-1:review');

        await (component as any).handleCommand('/archetype next');
        expect(state.activeArchetype).toEqual('build');
    }

    @Test('the global action routes through /archetype next')
    async globalAction() {
        const { state, component } = build();
        expect(await executeGlobalKeyActionView(component as any, 'archetype-cycle')).toEqual(true);
        expect(state.activeArchetype).toEqual('review');
    }
}
