import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleApprovalsPanelComponent,
    AgentConsoleCommandOutputsPanelComponent,
    AgentConsolePendingQuestionPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleSessionState,
    AgentConsoleTasksPanelComponent,
    AgentConsoleTextOverlayPanelComponent
} from '../src';

@Suite('overlay accessibility and focus semantics (P270)')
export class P270OverlayAccessibilityTest {
    @Test('select menu exposes title, count, and active option as text')
    async selectMenuLabel() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Command palette', [
            { label: '/help', value: '/help' },
            { label: '/model', value: '/model' }
        ], 1);
        const panel = new AgentConsoleSelectPanelComponent(state);
        expect(panel.accessibilityLabel).toEqual('Command palette. 2 options. Selected 2 of 2.');
    }

    @Test('question and output options expose a selected text projection')
    async questionAndOutputsSelection() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setPendingQuestion({ question: 'Continue?', options: ['Yes', 'No'], severity: 'medium', updatedAt: 1 });
        state.pendingQuestionSelectedIndex = 1;
        const question = new AgentConsolePendingQuestionPanelComponent(state);
        expect(question.pendingQuestionOptionItems[1].selected).toEqual('true');
        expect(question.accessibilityLabel).toContain('Selected 2 of 2');

        state.pushCommandOutput('/help', 'completed');
        const outputs = new AgentConsoleCommandOutputsPanelComponent(state);
        expect(outputs.entryItems[0].selected).toEqual('true');
        expect(outputs.activeOptionId).toEqual('command-output-option-output-1');
        expect(outputs.accessibilityLabel).toContain('Selected 1 of 1: /help');
        expect(question.activeOptionId).toEqual('pending-question-option-1');
    }

    @Test('dialogs describe their current subject without relying on visual state')
    async dialogLabelsDescribeSubject() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openTextOverlay('Plan details', ['one', 'two']);
        expect(new AgentConsoleTextOverlayPanelComponent(state).accessibilityLabel).toContain('Plan details. 2 lines.');

        state.setPendingApprovals([{
            id: 'approval-1', toolName: 'write_file', sessionId: 'console', reason: 'write', summary: 'write', hasInput: true, createdAt: 1, timeoutMs: 1000
        } as any]);
        state.setApprovalsFocused(true);
        expect(new AgentConsoleApprovalsPanelComponent(state).accessibilityLabel).toContain('Selected: write_file');
    }

    @Test('plan region states the active step in text')
    async planRegionLabelsActiveStep() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setPlanTodos([
            { id: 'one', content: 'Inspect implementation', status: 'in_progress' },
            { id: 'two', content: 'Run tests', status: 'pending' }
        ] as any);
        state.setTasksFocused(true);
        expect(new AgentConsoleTasksPanelComponent(state).accessibilityLabel).toContain('Current step: Inspect implementation');
    }
}
