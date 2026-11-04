import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultReactiveEffect, reactive } from '@tsdi/components';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src';

/**
 * Extracted domain modules are still driven by the reactive state proxy: they
 * receive the proxy as `state` and every write goes through its set trap.
 */
@Suite('extracted domain state stays reactive')
export class ReactiveDomainStateTest {
    @Test('plan mutations retrigger a binding that read plan state')
    planDomainIsReactive() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const effect = new DefaultReactiveEffect();
        const proxy = reactive(state, effect) as AgentConsoleSessionState;
        let runs = 0;
        effect.run(() => {
            runs++;
            void proxy.planTodoFilter;
            void proxy.planTodos.length;
        });
        const before = runs;
        proxy.setPlanTodos([{ id: 'one', content: 'Inspect', status: 'pending' }]);
        proxy.setPlanTodoFilter('active');
        expect(runs).toBeGreaterThan(before);
        expect(proxy.filteredPlanTodos.length).toBe(1);
    }

    @Test('overlay mutations reach bindings through the same proxy')
    overlayDomainIsReactive() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const effect = new DefaultReactiveEffect();
        const proxy = reactive(state, effect) as AgentConsoleSessionState;
        let runs = 0;
        effect.run(() => {
            runs++;
            void proxy.textOverlay;
            void proxy.commandOutputs.length;
        });
        const before = runs;
        proxy.openTextOverlay('Plan', ['one', 'two']);
        proxy.pushCommandOutput('/help', 'done');
        expect(runs).toBeGreaterThan(before);
        expect(proxy.hasTextOverlayFocus()).toBe(true);
        expect(proxy.visibleCommandOutputs.length).toBe(1);
    }
}
