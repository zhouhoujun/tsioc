import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';

function typeLine(state: any, value: string): void {
    state.setInput(value, value.length);
}

@Suite('multiline draft mode (/multiline + /send)')
export class MultilineDraftTest {

    @Test('/multiline announces the mode so the toggle is visible')
    async toggleAnnouncesMode() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        typeLine(state, '/multiline');
        await component.submit();
        expect(state.notice).toContain('Multiline draft mode on');
        typeLine(state, '/multiline');
        await component.submit();
        expect(state.notice).toContain('Multiline draft mode off');
    }

    @Test('each line enters the draft, clears the composer, and is not a history entry')
    async linesAccumulateWithoutHistoryPollution() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        await (component as any).handleCommand('/multiline');
        typeLine(state, 'alpha line');
        await component.submit();
        expect((component as any).draftLines).toEqual(['alpha line']);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('+1');
        typeLine(state, 'beta line');
        await component.submit();
        expect((component as any).draftLines).toEqual(['alpha line', 'beta line']);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('+2');
        // Only real prompts belong in ↑ history; a draft line is not one.
        expect(state.inputHistoryEntries).toEqual([]);
    }

    @Test('/send submits the joined draft once and records only the joined prompt')
    async sendSubmitsJoinedDraft() {
        const runtime = new RuntimeStub();
        const component = createConsole(runtime, new SchedulerStub());
        const state = component.sessionState;
        await (component as any).handleCommand('/multiline');
        typeLine(state, 'alpha line');
        await component.submit();
        typeLine(state, 'beta line');
        await component.submit();
        expect(runtime.calls).toEqual([]);

        typeLine(state, '/send');
        await component.submit();

        expect(runtime.calls).toEqual([`${state.sessionId}:alpha line\nbeta line`]);
        expect((component as any).draftLines).toEqual([]);
        expect(state.inputHistoryEntries).toEqual(['alpha line\nbeta line']);
        const userMessage = state.messages.filter(message => message.role === 'user').pop();
        expect(userMessage?.content).toEqual('alpha line\nbeta line');
    }

    @Test('/cancel leaves multiline mode and drops the accumulated lines')
    async cancelDropsDraft() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        const state = component.sessionState;
        await (component as any).handleCommand('/multiline');
        typeLine(state, 'alpha line');
        await component.submit();
        await (component as any).handleCommand('/cancel');
        expect((component as any).draftLines).toEqual([]);
        expect((component as any).multilineMode).toEqual(false);
        expect(state.inputHistoryEntries).toEqual([]);
    }
}
