import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleElement, ConsoleRenderer, ConsoleTemplateModule, TuiRenderer, TuiTemplateModule } from '@tsdi/components/console';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessageDetailPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleWorkingPanelComponent,
    AgentModule
} from '../src';

@Suite('Agent Console Renderer')
export class AgentConsoleRendererTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, ConsoleTemplateModule, ComponentsModule]
        });
    }

    @Test('renders agent console through console template module')
    async render() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);
        ref.instance.sessionState.setSessions([
            { id: 'default', current: true, messageCount: 2, updatedAt: 2 } as any,
            { id: 'chat-2', current: false, messageCount: 1, updatedAt: 1 } as any
        ]);
        ref.instance.sessionState.setTasksCount(1);
        await ref.render();
        const renderer = this.ctx.get(ConsoleRenderer);
        const root = ref.hostView.rootNodes[0] as ConsoleElement;
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const lines = renderer.renderToLines(root);
        const sessionsPanel = ref.hostView.query(AgentConsoleSessionsPanelComponent) as ComponentRef<AgentConsoleSessionsPanelComponent>;
        const sessionLines = renderer.renderToLines(sessionsPanel.hostView.rootNodes[0]);
        const messageLines = renderer.renderToLines(messagesPanel.hostView.rootNodes[0]);

        expect(root.tagName).toEqual('div');
        expect(lines.some(line => line.includes('tsdi-agent'))).toBe(false);
        expect(ref.hostView.query(AgentConsoleStatusPanelComponent)).toBeTruthy();
        expect(messageLines.some(line => line.includes('›') && line.includes('hello'))).toBe(true);
        expect(messageLines.some(line => !line.includes('agent>') && line.includes('world'))).toBe(true);
        expect(ref.hostView.query(AgentConsoleSessionsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleInputPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleWorkingPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolRunsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleMessagesPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleActivityPanelComponent)).toBeTruthy();
    }

    @Test('renders working line with token usage while running')
    async renderWorkingLine() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setStatus('running');
        ref.instance.sessionState.turnStartedAt = Date.now() - 65000;
        ref.instance.sessionState.setTokenUsage({
            promptTokens: 120,
            completionTokens: 80,
            totalTokens: 200
        });
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const workingPanel = ref.hostView.query(AgentConsoleWorkingPanelComponent) as ComponentRef<AgentConsoleWorkingPanelComponent>;
        const workingLines = renderer.renderToLines(workingPanel.hostView.rootNodes[0]);

        expect(workingLines.some(line => line.includes('Working'))).toBe(true);
        expect(workingLines.some(line => line.includes('esc to interrupt'))).toBe(true);
        expect(workingLines.some(line => line.includes('200 tokens'))).toBe(true);
    }

    @Test('renders message detail panel with line numbers for selected message')
    async renderMessageDetailPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: '\tline1\n\tline2\n\tline3\n\tline4\n\tline5\n\tline6\n\tline7', createdAt: 1 } as any
        ]);
        ref.instance.sessionState.setMessagesFocused(true);
        ref.instance.sessionState.openMessageDetail();
        ref.instance.sessionState.scrollMessageDetailToEdge('end');
        ref.instance.sessionState.scrollMessageDetailColumns(4);
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const detailPanel = ref.hostView.query(AgentConsoleMessageDetailPanelComponent) as ComponentRef<AgentConsoleMessageDetailPanelComponent>;
        const detailLines = renderer.renderToLines(detailPanel.hostView.rootNodes[0]);

        expect(detailLines.some(line => line.includes('message 1/1 user'))).toBe(true);
        expect(detailLines.some(line => line.includes('lines 2-7 / 7'))).toBe(true);
        expect(detailLines.some(line => line.includes('col 5/9'))).toBe(true);
        expect(detailLines.some(line => line.includes('2|'))).toBe(true);
        expect(detailLines.some(line => line.includes('line7'))).toBe(true);
    }

    @Test('renders agent console panels when created from module context for tui chat')
    async renderFromModuleContext() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            const inputPanel = consoleRef.hostView.query(AgentConsoleInputPanelComponent) as ComponentRef<AgentConsoleInputPanelComponent>;
            inputPanel.instance.input = 'hello';
            await Promise.resolve();
            const inputLines = renderer.renderToTuiLines(inputPanel.hostView.rootNodes[0], { width: 36 });

            expect(inputLines.some((line: string) => line.includes('hello'))).toBe(true);
            expect(inputLines.some((line: string) => line.includes('>'))).toBe(true);
            expect(inputLines.some((line: string) => line.includes('\x1b['))).toBe(true);
            expect(consoleRef.hostView.query(AgentConsoleWorkingPanelComponent)).toBeTruthy();
            expect(consoleRef.hostView.query(AgentConsoleStatusPanelComponent)).toBeTruthy();
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders live input content in root tui tree')
    async renderLiveInputInRootTree() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);

            consoleRef.instance.sessionState.setInput('hello');
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 60 });
            expect(rootLines.some((line: string) => line.includes('hello'))).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders select menu in root tui tree when session state opens suggestions')
    async renderSelectMenuInRootTree() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);

            consoleRef.instance.sessionState.openSelectMenu('Suggestions', [
                {
                    label: '/help',
                    value: '/help',
                    description: 'Commands',
                    detail: {
                        command: '/help',
                        title: 'Help',
                        summary: 'Show available commands and mention shortcuts.'
                    }
                },
                {
                    label: '/tools',
                    value: '/tools',
                    description: 'Commands',
                    detail: {
                        command: '/tools',
                        title: 'Tools',
                        summary: 'Inspect the currently enabled tools for this session.'
                    }
                }
            ], 0, 'tab/enter accept');
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 80 });
            expect(rootLines.some((line: string) => line.includes('Suggestions'))).toBe(true);
            expect(rootLines.some((line: string) => line.includes('/help'))).toBe(true);
            expect(rootLines.some((line: string) => line.includes('Preview'))).toBe(true);
            expect(rootLines.some((line: string) => line.includes('"command": "/help"'))).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders selected select-menu option beyond the first page')
    async renderScrolledSelectMenuWindow() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);

            consoleRef.instance.sessionState.openSelectMenu('Many options', Array.from({ length: 16 }, (_value, index) => ({
                label: `Option ${index + 1}`,
                value: `option-${index + 1}`
            })), 12, 'up/down move');
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 80 });
            expect(rootLines.some((line: string) => line.includes('› 13. Option 13'))).toBe(true);
            expect(rootLines.some((line: string) => line.includes('16. Option 16'))).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders focused session selection beyond the first page')
    async renderScrolledSessionWindow() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setSessions(Array.from({ length: 10 }, (_value, index) => ({
            id: `chat-${index + 1}`,
            current: index === 0,
            messageCount: index + 1,
            updatedAt: index + 1
        })) as any);
        ref.instance.sessionState.setSessionsFocused(true);
        ref.instance.sessionState.setSelectedSessionId('chat-9');
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const sessionsPanel = ref.hostView.query(AgentConsoleSessionsPanelComponent) as ComponentRef<AgentConsoleSessionsPanelComponent>;
        const sessionLines = renderer.renderToLines(sessionsPanel.hostView.rootNodes[0]);

        expect(sessionLines.some(line => line.includes('sessions 10 · 9/10'))).toBe(true);
        expect(sessionLines.some(line => line.includes('› chat-9'))).toBe(true);
        expect(sessionLines.some(line => line.includes('chat-10'))).toBe(true);
        expect(sessionLines.some(line => line.includes('chat-2'))).toBe(false);
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
