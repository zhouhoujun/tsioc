import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleElement, ConsoleRenderer, ConsoleTemplateModule, TuiRenderer, TuiTemplateModule, TuiTerminalSurface } from '@tsdi/components/console';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleApprovalsPanelComponent,
    AgentConsoleComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessageDetailPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleWorkingPanelComponent,
    AgentUiModule,
    AgentModule
} from '../src';

@Suite('Agent Console Renderer')
export class AgentConsoleRendererTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, ConsoleTemplateModule, ComponentsModule]
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
        await Promise.resolve();
        const renderer = this.ctx.get(ConsoleRenderer);
        const root = ref.hostView.rootNodes[0] as ConsoleElement;
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const lines = renderer.renderToLines(root);
        const sessionsPanel = ref.hostView.query(AgentConsoleSessionsPanelComponent) as ComponentRef<AgentConsoleSessionsPanelComponent>;
        const sessionLines = renderer.renderToLines(sessionsPanel.hostView.rootNodes[0]);
        const messageLines = renderer.renderToLines(messagesPanel.hostView.rootNodes[0]);

        expect(root.tagName).toEqual('div');
        expect(lines.some(line => line.toLowerCase().includes('tsdi-agent'))).toBe(true);
        expect(ref.hostView.query(AgentConsoleStatusPanelComponent)).toBeTruthy();
        expect(messageLines.some(line => line.includes('›') && line.includes('hello'))).toBe(true);
        expect(messageLines.some(line => line.includes('●') && line.includes('world'))).toBe(true);
        expect(ref.hostView.query(AgentConsoleSessionsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleInputPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleWorkingPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolRunsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleMessagesPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleActivityPanelComponent)).toBeTruthy();
    }

    @Test('renders shared reply statuses in messages panel')
    async renderMessageStatuses() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            {
                id: 'a1',
                role: 'assistant',
                content: 'streaming response',
                createdAt: 1,
                metadata: { streaming: true }
            } as any,
            {
                id: 'e1',
                role: 'assistant',
                content: 'Error: broken',
                createdAt: 2,
                metadata: { error: true }
            } as any
        ]);
        await ref.render();
        await Promise.resolve();

        const renderer = this.ctx.get(ConsoleRenderer);
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const messageLines = renderer.renderToLines(messagesPanel.hostView.rootNodes[0]);

        expect(messageLines.some(line => line.includes('●') && line.includes('streaming response'))).toBe(true);
        expect(messageLines.some(line => line.includes('●') && line.includes('Error: broken'))).toBe(true);
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
        expect(workingLines.some(line => line.includes('wait for reply'))).toBe(true);
        expect(workingLines.some(line => line.includes('200 tokens'))).toBe(true);
    }

    @Test('renders focused tool list with selected tool details')
    async renderFocusedToolList() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setTools([
            { name: 'read_file', toolset: 'filesystem', active: true, activationKind: 'always' } as any,
            { name: 'write_file', toolset: 'filesystem', active: false, activationKind: 'approval' } as any
        ]);
        ref.instance.sessionState.upsertToolRun({
            name: 'write_file',
            status: 'error',
            message: 'Permission denied',
            error: 'Permission denied',
            updatedAt: Date.now()
        });
        ref.instance.sessionState.setToolsFocused(true);
        ref.instance.sessionState.setSelectedToolName('write_file');
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const toolsPanel = ref.hostView.query(AgentConsoleToolsPanelComponent) as ComponentRef<AgentConsoleToolsPanelComponent>;
        const toolLines = renderer.renderToLines(toolsPanel.hostView.rootNodes[0]);

        expect(toolLines.some(line => line.includes('tools 2'))).toBe(true);
        expect(toolLines.some(line => line.includes('› write_file'))).toBe(true);
        expect(toolLines.some(line => line.includes('status inactive'))).toBe(true);
        expect(toolLines.some(line => line.includes('Permission denied'))).toBe(true);
    }

    @Test('renders focused approval list with selected request details')
    async renderFocusedApprovalList() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setPendingApprovals([
            {
                id: 'approval-1',
                toolName: 'write_file',
                sessionId: 'console',
                reason: 'Writing files requires approval.',
                summary: 'Writing files requires approval.',
                hasInput: true,
                inputSummary: '{"path":"notes.txt"}',
                createdAt: 1,
                timeoutMs: 30000
            } as any,
            {
                id: 'approval-2',
                toolName: 'terminal',
                sessionId: 'console',
                reason: 'Shell execution requires approval.',
                summary: 'Shell execution requires approval.',
                hasInput: true,
                inputSummary: 'npm test',
                createdAt: 2,
                timeoutMs: 60000
            } as any
        ]);
        ref.instance.sessionState.setApprovalsFocused(true);
        ref.instance.sessionState.setSelectedApprovalId('approval-2');
        await ref.render();

        const renderer = this.ctx.get(ConsoleRenderer);
        const approvalsPanel = ref.hostView.query(AgentConsoleApprovalsPanelComponent) as ComponentRef<AgentConsoleApprovalsPanelComponent>;
        const approvalLines = renderer.renderToLines(approvalsPanel.hostView.rootNodes[0]);

        expect(approvalLines.some(line => line.includes('approvals 2'))).toBe(true);
        expect(approvalLines.some(line => line.includes('› terminal (approval)'))).toBe(true);
        expect(approvalLines.some(line => line.includes('Shell execution requires approval.'))).toBe(true);
        expect(approvalLines.some(line => line.includes('npm test'))).toBe(true);
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
        await Promise.resolve();

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
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
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
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
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

    @Test('wraps markdown message lines in tui messages panel')
    async renderWrappedMarkdownMessageInTui() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            const messagesPanel = consoleRef.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;

            consoleRef.instance.sessionState.setMessages([
                {
                    id: 'a1',
                    role: 'assistant',
                    content: `**assistant**\n\`\`\`ts\n${'averylongconversationtoken'.repeat(4)}\n\`\`\``,
                    createdAt: 1
                } as any
            ]);
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const lines = renderer.renderToTuiLines(messagesPanel.hostView.rootNodes[0], { width: 24 });
            const visibleLines = lines
                .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
                .filter(Boolean);

            expect(visibleLines.some((line: string) => line.includes('assistant'))).toBe(true);
            expect(visibleLines.some((line: string) => line.includes('**assistant**'))).toBe(false);
            expect(visibleLines.length).toBeGreaterThan(2);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders user message row with background styling in tui messages panel')
    async renderUserMessageBackgroundInTui() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            const messagesPanel = consoleRef.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;

            consoleRef.instance.sessionState.setMessages([
                {
                    id: 'u1',
                    role: 'user',
                    content: 'hello tui',
                    createdAt: 1
                } as any
            ]);
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            const lines = renderer.renderToTuiLines(messagesPanel.hostView.rootNodes[0], { width: 24 });
            const userLine = lines.find((line: string) => line.includes('hello tui')) || '';

            expect(userLine).toContain('hello tui');
            expect(/\x1b\[[0-9;]*48;/.test(userLine)).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('activity panel hides turn activities and renders only visible activity kinds')
    async renderActivityPanelFiltersTurns() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(ConsoleRenderer);
            const activityPanel = consoleRef.hostView.query(AgentConsoleActivityPanelComponent) as ComponentRef<AgentConsoleActivityPanelComponent>;

            consoleRef.instance.sessionState.pushActivity('turn', 'User: hello');
            consoleRef.instance.sessionState.pushActivity('error', 'submit failed');
            await Promise.resolve();

            const lines = renderer.renderToLines(activityPanel.hostView.rootNodes[0]);
            expect(lines.some((line: string) => line.includes('turn:'))).toBe(false);
            expect(lines.some((line: string) => line.includes('error:'))).toBe(true);
            expect(lines.some((line: string) => line.includes('submit failed'))).toBe(true);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('terminal surface updates working state and input from shared component state')
    async terminalSurfaceUpdatesSharedState() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        const output: string[] = [];
        let surface: TuiTerminalSurface | undefined;
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            surface = new TuiTerminalSurface({
                renderer,
                root: consoleRef.elementRef.nativeElement,
                width: 80,
                output: { write: value => output.push(value) }
            });
            await Promise.resolve();

            consoleRef.instance.sessionState.setStatus('idle');
            consoleRef.instance.sessionState.setInput('hello');
            await Promise.resolve();
            await Promise.resolve();

            expect(surface.lastRenderedLines.some(line => line.includes('Working'))).toBe(false);
            expect(surface.lastRenderedLines.some(line => line.includes('hello'))).toBe(true);
            expect(surface.lastRenderedLines
                .map(line => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
                .some(line => line.includes(consoleRef.instance.sessionState.model))).toBe(true);
            expect(output.join('')).toContain('hello');

            consoleRef.instance.sessionState.setStatus('running');
            await Promise.resolve();
            await Promise.resolve();
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(surface.lastRenderedLines
                .map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))
                .some(line => line.includes('Working'))).toBe(true);
        } finally {
            surface?.destroy();
            await tuiCtx.close();
        }
    }

    @Test('renders the latest visible message content without a stable tail region')
    async rendersLatestVisibleMessageWithoutStableTailRegion() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);
            const messagesPanel = consoleRef.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;

            consoleRef.instance.sessionState.setMessages([
                { id: 'u1', role: 'user', content: 'keep-me', createdAt: 1 } as any,
                { id: 'a1', role: 'assistant', content: 'grow', createdAt: 2 } as any
            ]);
            await Promise.resolve();
            await Promise.resolve();

            const layout = renderer.renderToTuiLayout(messagesPanel.hostView.rootNodes[0], { width: 80 });
            const tailRegion = layout.regions.find(region => region.id === 'message-tail');
            expect(tailRegion).toBeUndefined();
            const rendered = layout.lines
                .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, ''))
                .join('\n');
            expect(rendered).toContain('grow');
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders select menu in root tui tree when session state opens suggestions')
    async renderSelectMenuInRootTree() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
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
            expect(rootLines.some((line: string) => line.includes('/help'))).toBe(true);
            expect(rootLines.some((line: string) => /\/help\s{2,}Commands/.test(line))).toBe(true);
            expect(rootLines.some((line: string) => line.includes('Suggestions'))).toBe(false);
            expect(rootLines.some((line: string) => line.includes('Preview'))).toBe(false);
            expect(rootLines.some((line: string) => line.includes('"command": "/help"'))).toBe(false);
            expect(rootLines.some((line: string) => /[┌┐└┘]/.test(line))).toBe(false);
        } finally {
            await tuiCtx.close();
        }
    }

    @Test('renders selected select-menu option beyond the first page')
    async renderScrolledSelectMenuWindow() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
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

    @Test('updates select menu selection without rerendering root tree')
    async updateSelectMenuSelectionWithoutRootRender() {
        const tuiCtx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const componentFactory = tuiCtx.get(ComponentFactory);
            const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: tuiCtx });
            await consoleRef.render();
            const renderer = tuiCtx.get(TuiRenderer);

            consoleRef.instance.sessionState.openSelectMenu('Choices', [
                { label: 'First', value: 'first' },
                { label: 'Second', value: 'second' }
            ], 0);
            await Promise.resolve();
            let rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 80 });
            expect(rootLines.some((line: string) => line.includes('› 1. First'))).toBe(true);

            consoleRef.instance.sessionState.setSelectMenuIndex(1);
            rootLines = renderer.renderToTuiLines(consoleRef.hostView.rootNodes, { width: 80 });
            expect(rootLines.some((line: string) => line.includes('› 2. Second'))).toBe(true);
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
        await Promise.resolve();

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
