import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { getDisplayWidth, TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { ansiScreenLines, AnsiScreenBuffer, createAnsiScreenBuffer, feedAnsiScreen } from './ansi-screen';

async function settle(): Promise<void> {
    for (let index = 0; index < 96; index++) {
        await Promise.resolve();
    }
}

const plain = (line: string): string => String(line || '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');

interface ConsoleHarness {
    ref: ComponentRef<AgentConsoleComponent>;
    surface: TuiTerminalSurface;
    buffer: AnsiScreenBuffer;
    width: number;
    height: number;
}

/**
 * The session tab bar and the composer are chrome: scrolling history must never
 * hide them, and a frame must never exceed the terminal window (a wider/taller
 * frame makes the terminal scroll natively and tears the chrome away).
 *
 * These tests drive the real component + surface and assert the painted screen,
 * so markdown/layout work cannot silently regress the TUI viewport.
 */
@Suite('Agent console viewport chrome pinning')
export class AgentConsoleViewportChromePinningTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async createHarness(options: {
        width: number;
        height: number;
        messages: any[];
        sessions?: any[];
    }): Promise<ConsoleHarness> {
        const ref = this.ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: this.ctx });
        await ref.render();
        const state: any = ref.instance.sessionState;
        state.sessionTabsAction = { select: () => undefined, create: () => undefined, close: () => undefined };
        state.setSessions(options.sessions || [
            { id: 'session-a', current: true, title: 'Alpha' },
            { id: 'session-b', current: false, title: 'Beta' }
        ]);
        state.setMessages(options.messages);
        await settle();

        const buffer = createAnsiScreenBuffer(options.height, options.width);
        const surface = new TuiTerminalSurface({
            renderer: this.ctx.get(TuiRenderer),
            root: ref.elementRef.nativeElement,
            width: options.width,
            height: options.height,
            nativeScrollback: false,
            scrollViewport: true,
            scrollRegionId: 'transcript',
            footerRegionId: 'footer',
            output: { write: (value: string) => feedAnsiScreen(buffer, value) }
        });
        return { ref, surface, buffer, width: options.width, height: options.height };
    }

    protected assertChromePinned(harness: ConsoleHarness, label: string): string[] {
        const screen = ansiScreenLines(harness.buffer);
        // Session tabs stay pinned to the first row.
        expect(screen[0]).toContain('Alpha');
        expect(screen[0]).toContain('Beta');
        // The composer (with its statusline) stays inside the last rows.
        const isPrompt = (line: string) => line.trimStart().replace(/^[│┃║]\s*/, '').startsWith('>');
        expect(screen.some(isPrompt)).toBe(true);
        expect(screen.slice(-5).some(isPrompt)).toBe(true);
        // The frame must fit the window exactly; anything wider/taller scrolls
        // the alternate screen and takes the chrome with it.
        expect(harness.surface.lastRenderedLines.length).toBeLessThanOrEqual(harness.height);
        for (const line of harness.surface.lastRenderedLines) {
            expect(getDisplayWidth(plain(line))).toBeLessThanOrEqual(harness.width);
        }
        expect(harness.buffer.scrolledRows).toEqual(0);
        void label;
        return screen;
    }

    @Test('tabs and composer stay pinned while scrolling a long CJK reply')
    async longReplyScrollKeepsChrome() {
        const reply = Array.from({ length: 120 }, (_value, index) =>
            `第 ${index + 1} 行：这是用于撑满视口的长回复内容，验证滚动后尾部问询仍然可见。`).join('\n') + '\n\n是否继续？';
        const harness = await this.createHarness({
            width: 100,
            height: 32,
            messages: [
                { id: 'u1', role: 'user', content: '请写一篇长文介绍，尽量详细。', createdAt: 1 },
                { id: 'a1', role: 'assistant', content: reply, createdAt: 2 }
            ]
        });
        try {
            harness.surface.render();
            const before = this.assertChromePinned(harness, 'initial');
            expect(before.some(line => line.includes('第 120 行'))).toBe(true);

            for (let step = 0; step < 4; step++) {
                expect(harness.surface.scrollViewport(3)).toBe(true);
                harness.surface.render();
            }
            expect(harness.surface.viewportScrollOffset).toBeGreaterThan(0);
            const scrolled = this.assertChromePinned(harness, 'after wheel up');
            expect(scrolled.some(line => line.includes('第 120 行'))).toBe(false);

            expect(harness.surface.scrollViewportToEdge('start')).toBe(true);
            harness.surface.render();
            expect(harness.surface.viewportScrollOffset).toEqual(harness.surface.viewportMaxScrollOffset);
            this.assertChromePinned(harness, 'oldest history');

            expect(harness.surface.scrollViewportToEdge('end')).toBe(true);
            harness.surface.render();
            expect(harness.surface.viewportScrollOffset).toEqual(0);
            this.assertChromePinned(harness, 'back at the tail');
        } finally {
            harness.surface.destroy();
        }
    }

    @Test('markdown tables and code blocks cannot push the chrome out of the window')
    async markdownHistoryScrollKeepsChrome() {
        const markdown = [
            '## 实现计划',
            '',
            '- 第一项，包含 **粗体** 与 `行内代码`',
            '- 第二项：中文内容中文内容中文内容中文内容中文内容',
            '',
            '```ts',
            'const value = 1;',
            'function run() { return value; }',
            '```',
            '',
            '| 列 | 值 |',
            '| :--- | ---: |',
            '| 中文单元格 | 12345 |',
            '| another | 67890 |',
            '',
            '> 引用内容 with ascii words',
            '',
            `最终回答 ${'总结'.repeat(40)}`
        ].join('\n');
        const harness = await this.createHarness({
            width: 80,
            height: 24,
            messages: Array.from({ length: 30 }, (_value, index) => ({
                id: `m${index}`,
                role: index % 2 === 0 ? 'user' : 'assistant',
                content: `${markdown}\n\nmessage ${index}`,
                createdAt: index
            }))
        });
        try {
            harness.surface.render();
            this.assertChromePinned(harness, 'markdown initial');

            expect(harness.surface.scrollViewport(6)).toBe(true);
            harness.surface.render();
            this.assertChromePinned(harness, 'markdown scrolled');

            expect(harness.surface.scrollViewportToEdge('start')).toBe(true);
            harness.surface.render();
            this.assertChromePinned(harness, 'markdown oldest');

            expect(harness.surface.scrollViewportToEdge('end')).toBe(true);
            harness.surface.render();
            this.assertChromePinned(harness, 'markdown tail');
        } finally {
            harness.surface.destroy();
        }
    }

    @Test('new content while reading history keeps the reading row and the chrome')
    async newContentWhileScrolledKeepsChrome() {
        const message = (index: number) => ({
            id: `m${index}`,
            role: index % 2 === 0 ? 'user' : 'assistant',
            content: `第 ${index} 条消息\n${'内容'.repeat(20)}`,
            createdAt: index
        });
        const harness = await this.createHarness({
            width: 90,
            height: 24,
            messages: Array.from({ length: 20 }, (_value, index) => message(index))
        });
        try {
            harness.surface.render();
            expect(harness.surface.scrollViewport(9)).toBe(true);
            harness.surface.render();
            const readingRow = ansiScreenLines(harness.buffer)[1];

            harness.ref.instance.sessionState.appendMessage(message(20) as any);
            await settle();
            harness.surface.render();

            const screen = this.assertChromePinned(harness, 'new content while scrolled');
            expect(screen[1]).toEqual(readingRow);
        } finally {
            harness.surface.destroy();
        }
    }
}
