import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { TuiRenderer, TuiTemplateModule } from '@tsdi/components/console';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleMessageRendererRegistry,
    AgentUiModule,
    getDisplayWidth,
    projectAgentConsoleArtifactMainline,
    projectAgentConsoleConversationMainline,
    projectAgentConsoleDecisionMainline,
    projectAgentConsoleDiagnosticMainline,
    projectAgentConsoleExecutionMainline,
    renderAgentConsoleMessageItems
} from '../src';
import { buildFullSessionFixture, FullSessionBranch } from '../harness/full-session-fixture';

function project(branch: FullSessionBranch) {
    return projectAgentConsoleExecutionMainline(projectAgentConsoleDiagnosticMainline(
        projectAgentConsoleDecisionMainline(projectAgentConsoleArtifactMainline(
            projectAgentConsoleConversationMainline(buildFullSessionFixture(branch))
        ))
    ));
}

@Suite('P312 complete session matrix')
export class FullSessionMatrixSuite {
    private ctx!: ApplicationContext;
    private registry!: AgentConsoleMessageRendererRegistry;

    @Before()
    async setup() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        this.registry = this.ctx.get(AgentConsoleMessageRendererRegistry);
    }

    @After()
    async teardown() { await this.ctx.close(); }

    @Test('normal blocked failed cancelled and replay branches preserve ordering and uniqueness')
    matrix() {
        for (const branch of ['normal', 'blocked', 'failed', 'cancelled', 'replay'] as FullSessionBranch[]) {
            const messages = project(branch);
            expect(new Set(messages.map(message => message.id)).size).toEqual(messages.length);
            expect(messages[0].role).toEqual('user');
            expect(messages[1].metadata?.uiKind).toEqual('plan-todo');
            expect(messages[messages.length - 1].content).toContain('Session restore is complete');
            expect(messages.filter(message => message.metadata?.uiKind === 'question')).toHaveLength(1);
            expect(messages.filter(message => message.metadata?.uiKind === 'approval')).toHaveLength(1);
            expect(messages.filter(message => message.metadata?.backgroundSummary)).toHaveLength(1);
        }
    }

    @Test('detail routing markdown attachments and terminal decisions survive projection')
    routing() {
        const messages = project('failed');
        expect(messages.find(message => message.id === 'command-1')?.metadata?.detailRef).toEqual('output-1');
        expect(messages.find(message => message.id === 'files-1')?.metadata?.detailRef).toEqual('review-1');
        expect(messages.find(message => message.id === 'attachment-1')?.metadata?.causalKey).toEqual('step:step-1');
        expect(messages.find(message => message.id === 'diagnostic-1')?.metadata?.stack).toEqual('full stack in inspector');
        expect(messages[messages.length - 1].content).toContain('```ts');
    }

    @Test('shared DOM/TUI render model exposes semantic ARIA')
    semanticAria() {
        const messages = project('failed');
        const rendered = renderAgentConsoleMessageItems(messages, { rendererRegistry: this.registry, timelineMode: true });
        expect(rendered.every(item => item.semanticFamily && item.semanticKind)).toEqual(true);
        expect(rendered.some(item => item.lines.some(line => line.ariaLabel?.includes('恢复索引写入失败')))).toEqual(true);
    }

    @Test('real TUI renderer preserves CJK markdown and line bounds at 80 100 and 120 columns')
    async tuiWidths() {
        const ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            ref.instance.sessionState.setConsoleOptions({ messagesVisibleItems: 40 });
            ref.instance.sessionState.setMessages(buildFullSessionFixture('failed'));
            await Promise.resolve();
            await Promise.resolve();
            const panel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
            const renderer = ctx.get(TuiRenderer);
            for (const width of [80, 100, 120]) {
                const lines = renderer.renderToTuiLines(panel.hostView.rootNodes[0], { width });
                const plain = lines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
                expect(plain.every(line => getDisplayWidth(line) <= width)).toEqual(true);
                expect(plain.some(line => line.includes('恢复索引写入失败'))).toEqual(true);
                expect(plain.some(line => line.includes('Session restore is complete.'))).toEqual(true);
                expect(plain.some(line => line.includes('Thought ·') && line.includes('Inspecting restore state'))).toEqual(true);
                const finalIndex = plain.findIndex(line => line.includes('Session restore is complete.'));
                expect(finalIndex).toBeGreaterThan(0);
                expect(plain[finalIndex]).not.toContain('•');
                const resultHeadingIndex = plain.findIndex(line => line.includes('Result'));
                expect(resultHeadingIndex).toBeGreaterThan(0);
                expect(plain[resultHeadingIndex - 1].replace(/\u200b/g, '').trim()).toEqual('');
                expect(plain.join('\n')).not.toContain('```');
            }
        } finally {
            await ctx.close();
        }
    }

    @Test('real DOM renderer preserves unique semantic ARIA and markdown at 80 100 and 120 columns')
    async domWidths() {
        const ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
        try {
            const ref = ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
            ref.instance.sessionState.setConsoleOptions({ messagesVisibleItems: 40 });
            ref.instance.sessionState.setMessages(buildFullSessionFixture('failed'));
            await Promise.resolve();
            await Promise.resolve();
            const panel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
            const root = panel.hostView.rootNodes[0] as HTMLElement;
            for (const width of [80, 100, 120]) {
                root.style.width = `${width}ch`;
                const lines = Array.from(root.querySelectorAll('.message-line')) as HTMLElement[];
                const labels = lines.map(line => line.getAttribute('aria-label') || '').filter(Boolean);
                expect(labels.length).toBeGreaterThanOrEqual(project('failed').length);
                expect(new Set(labels).size).toEqual(labels.length);
                expect(labels.some(label => label.includes('恢复索引写入失败'))).toEqual(true);
                expect(root.textContent).toContain('Session restore is complete.');
                expect(root.textContent).not.toContain('```');
            }
        } finally {
            await ctx.close();
        }
    }

    @Test('decision interaction converges in place from pending to answered and approved')
    decisionConvergence() {
        const pending = project('blocked');
        expect(pending.find(message => message.metadata?.uiKind === 'question')?.metadata?.status).toEqual('pending');
        const resolved = project('normal');
        expect(resolved.find(message => message.metadata?.uiKind === 'question')?.content).toContain('answered: Yes');
        expect(resolved.find(message => message.metadata?.uiKind === 'approval')?.content).toContain('approved: allow');
    }
}
