import expect = require('expect');
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { createAnsiScreenBuffer, feedAnsiScreen, ansiScreenLines } from './ansi-screen';

async function settle(ref?: ComponentRef<unknown>): Promise<void> {
    void ref;
    for (let index = 0; index < 48; index++) await Promise.resolve();
}

/**
 * P4 headless frame capture/storybook: renders a real console screen to plain
 * rows, so visual changes can be reviewed/asserted without a terminal.
 */
@Suite('tui storybook frame capture')
export class TuiStorybookTest {
    @Test('captures a transcript screen as fixed-width plain rows')
    async capturesTranscriptFrame() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        let surface: TuiTerminalSurface | undefined;
        try {
            const consoleRef = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await consoleRef.render();
            const state = consoleRef.instance.sessionState;
            state.sessionId = 'storybook';
            state.setMessages([
                { id: 'u1', role: 'user', content: 'storybook-user', createdAt: 1 },
                { id: 'a1', role: 'assistant', content: 'storybook-answer', createdAt: 2 }
            ] as any);
            await settle(consoleRef);
            const renderer = ctx.get(TuiRenderer);
            surface = new TuiTerminalSurface({
                renderer,
                root: consoleRef.elementRef.nativeElement,
                width: 60,
                output: { write() {} }
            });
            await settle(consoleRef);
            const buffer = createAnsiScreenBuffer(20, 60);
            feedAnsiScreen(buffer, surface.lastRenderedLines.join('\n'));
            const rows = ansiScreenLines(buffer);
            const frame = rows
                .map(row => row.replace(/\s+$/, ''))
                .join('\n')
                .replace(/^\d{2}:\d{2}/m, 'HH:MM')
                .replace(/^model: .+$/m, 'model: <model>')
                .replace(/^.*· 0 tokens · agent build ·$/m, 'status: <model> · 0 tokens · agent build ·')
                .trimEnd();
            const expected = readFileSync(join(__dirname, 'fixtures', 'tui-storybook-basic.txt'), 'utf8').trimEnd();
            expect(frame).toEqual(expected);
            expect(rows.every(row => row.length <= 60)).toEqual(true);
        } finally {
            surface?.destroy();
            await (ctx as ApplicationContext).close();
        }
    }
}
