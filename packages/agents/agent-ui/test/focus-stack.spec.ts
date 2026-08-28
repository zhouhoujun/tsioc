import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';

@Suite('focus stack (P233)')
export class FocusStackTest {
    @Test('projects focused state as ordered layers with modal priority')
    focusProjectionUsesStablePriority() {
        const state = new AgentConsoleSessionState();
        state.setMessagesFocused(true);
        state.setTasksFocused(true);
        state.setPendingQuestion({ question: 'choose', options: ['a'], severity: 'low', updatedAt: 1 });
        expect(state.focusLayers).toEqual(['messages', 'plan', 'question']);
        expect(state.activeFocusLayer).toEqual('question');
        expect(state.inputFocused).toEqual(false);
    }

    @Test('push/pop/replace/consume are deterministic and serializable')
    focusStackOperations() {
        const state = new AgentConsoleSessionState();
        expect(state.pushFocusLayer('overlay')).toEqual(['overlay']);
        expect(state.pushFocusLayer('review')).toEqual(['overlay', 'review']);
        expect(state.pushFocusLayer('overlay')).toEqual(['review', 'overlay']);
        expect(state.replaceFocusLayer('select')).toEqual(['review', 'select']);
        expect(state.consumeFocusLayer('review')).toEqual(false);
        expect(state.consumeFocusLayer('select')).toEqual(true);
        expect(state.focusLayers).toEqual(['review']);
        expect(state.popFocusLayer()).toEqual('review');
        expect(state.activeFocusLayer).toEqual(undefined);
    }

    @Test('clearing the top modal restores the underlying layer')
    async escapePopsQuestionBeforePanel() {
        const state = new AgentConsoleSessionState();
        state.setTasksFocused(true);
        state.setPendingQuestion({ question: 'choose', options: ['a'], severity: 'low', updatedAt: 1 });
        expect(await state.handleFocusKey('escape')).toEqual(true);
        expect(state.pendingQuestion).toEqual(null);
        expect(state.tasksFocused).toEqual(true);
        expect(state.activeFocusLayer).toEqual('plan');
        expect(state.inputFocused).toEqual(false);
        expect(await state.handleFocusKey('escape')).toEqual(true);
        expect(state.activeFocusLayer).toEqual(undefined);
        expect(state.inputFocused).toEqual(true);
    }
}
