import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';

import { AgentConsoleComponent, AgentConsoleMessagesPanelComponent, AgentUiModule } from '../src';

async function settle(): Promise<void> {
    for (let index = 0; index < 48; index++) {
        await Promise.resolve();
    }
}

function longTranscript(count: number): any[] {
    const messages: any[] = [];
    for (let index = 1; index <= count; index++) {
        messages.push({
            id: `u${index}`,
            role: 'user',
            content: `question ${index}`,
            createdAt: index * 10
        });
        messages.push({
            id: `a${index}`,
            role: 'assistant',
            content: Array.from({ length: 5 }, (_value, line) => `answer ${index} line ${line + 1}`).join('\n'),
            createdAt: index * 10 + 5
        });
    }
    return messages;
}

/**
 * Moving the message selection must bring the highlighted message into view:
 * the panel reports the rendered row offset and the host scrolls the platform
 * surface to that row (the viewport keeps following off while browsing).
 */
@Suite('transcript reveal scrolls the viewport (P322)')
export class AgentConsoleRevealScrollTest {
    @Test('PageUp moves the selection and reveals its rendered row')
    async pageUpRevealsSelectedMessage() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();

            consoleRef.instance.sessionState.setConsoleOptions({ messageLayout: 'viewport' });
            consoleRef.instance.sessionState.setMessages(longTranscript(12));
            await settle();

            const scrolled: number[] = [];
            (consoleRef.instance as any).surfaceAccessor = {
                scrollViewportToRow: (row: number) => {
                    scrolled.push(row);
                    return true;
                }
            };

            const component: any = consoleRef.instance;
            await component.handleGlobalKeyInput('\u001b[5~');
            await component.handleGlobalKeyInput('\u001b[5~');
            await settle();

            const selectedId = consoleRef.instance.sessionState.selectedMessageId;
            expect(selectedId).toBeDefined();
            const panel = consoleRef.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
            const expectedRow = panel.instance.messageRowOffset(selectedId as string);
            expect(expectedRow).toBeGreaterThan(0);
            expect(scrolled).toEqual([expectedRow]);
        } finally {
            await tuiCtx.close();
        }
    }
}
