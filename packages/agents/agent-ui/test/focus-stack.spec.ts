import { navigationFor } from './test-transcript-navigation';
import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';

@Suite('focus stack (P233)')
export class FocusStackTest {
    @Test('projects focused state as ordered layers with modal priority')
    focusProjectionUsesStablePriority() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        navigationFor(state).setFocused(true);
        state.setTasksFocused(true);
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'choose', options: ['a'], severity: 'low', createdAt: 1, updatedAt: 1, status: 'pending' });
        expect(state.focusLayers.layers).toEqual(['messages', 'plan', 'question']);
        expect(state.focusLayers.activeLayer).toEqual('question');
        expect(state.inputFocused).toEqual(false);
    }

    @Test('push/pop/replace/consume are deterministic and serializable')
    focusStackOperations() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect(state.focusLayers.push('overlay')).toEqual(['overlay']);
        expect(state.focusLayers.push('review')).toEqual(['overlay', 'review']);
        expect(state.focusLayers.push('overlay')).toEqual(['review', 'overlay']);
        expect(state.focusLayers.replace('select')).toEqual(['review', 'select']);
        expect(state.focusLayers.consume('review')).toEqual(false);
        expect(state.focusLayers.consume('select')).toEqual(true);
        expect(state.focusLayers.layers).toEqual(['review']);
        expect(state.focusLayers.pop()).toEqual('review');
        expect(state.focusLayers.activeLayer).toEqual(undefined);
    }

    @Test('clearing the top modal restores the underlying layer')
    async escapePopsQuestionBeforePanel() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setTasksFocused(true);
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'choose', options: ['a'], severity: 'low', createdAt: 1, updatedAt: 1, status: 'pending' });
        expect(await state.handleFocusKey('escape', navigationFor(state))).toEqual(true);
        expect(state.pendingQuestion).toEqual(null);
        expect(state.tasksFocused).toEqual(true);
        expect(state.focusLayers.activeLayer).toEqual('plan');
        expect(state.inputFocused).toEqual(false);
        expect(await state.handleFocusKey('escape', navigationFor(state))).toEqual(true);
        expect(state.focusLayers.activeLayer).toEqual(undefined);
        expect(state.inputFocused).toEqual(true);
    }
}
