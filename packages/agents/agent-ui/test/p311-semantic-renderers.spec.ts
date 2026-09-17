import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleMessageRendererRegistry,
    AgentUiModule,
    renderAgentConsoleMessageItem,
    renderAgentConsoleMessageItems
} from '../src';

function message(id: string, role: string, content: string, metadata: Record<string, any> = {}): any {
    return { id, role, content, createdAt: 1, metadata };
}

@Suite('P311 semantic renderer grammar')
export class SemanticRendererSuite {
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

    @Test('five content families resolve through IoC renderers')
    semanticFamilies() {
        const cases = [
            [message('u', 'user', '请求'), 'conversation', 'user'],
            [message('x', 'assistant', '思考', { uiEventType: 'reasoning' }), 'execution', 'thought'],
            [message('q', 'assistant', '继续?', { uiKind: 'question' }), 'decision', 'question'],
            [message('p', 'assistant', '计划', { uiKind: 'plan-todo' }), 'artifact', 'plan'],
            [message('e', 'assistant', '失败', { error: true }), 'diagnostic', 'error']
        ];
        for (const [input, family, kind] of cases as any[]) {
            const rendered = renderAgentConsoleMessageItem(input, { rendererRegistry: this.registry });
            expect(rendered.semanticFamily).toEqual(family);
            expect(rendered.semanticKind).toEqual(kind);
            expect(rendered.lines[0].semanticFamily).toEqual(family);
        }
    }

    @Test('ARIA derives semantic title status meta and CJK body from the presenter')
    semanticAria() {
        const rendered = renderAgentConsoleMessageItem(
            message('q', 'assistant', '是否发布到生产环境？', { uiKind: 'question', status: 'pending' }),
            { rendererRegistry: this.registry, showTimestamps: true }
        );
        expect(rendered.lines[0].ariaLabel).toContain('Question');
        expect(rendered.lines[0].ariaLabel).toContain('是否发布到生产环境？');
        expect(rendered.lines[0].role).toEqual('Question · ');
    }

    @Test('semantic renderers keep stable item geometry across content families')
    stableGeometry() {
        const rendered = [
            message('u', 'user', 'request'),
            message('a', 'assistant', 'answer'),
            message('e', 'assistant', 'failure', { error: true })
        ].map(input => renderAgentConsoleMessageItem(input, { rendererRegistry: this.registry }));
        rendered.forEach(item => {
            expect(item.itemStyle['box-sizing']).toEqual('border-box');
            expect(item.itemStyle['border-left']).toBeTruthy();
            expect(item.lines[0].itemStyle?.padding).toBeTruthy();
        });
    }

    @Test('IoC renderers produce visibly different production grammar')
    distinctGrammar() {
        const inputs = [
            message('a', 'assistant', 'final answer'),
            message('x', 'assistant', 'inspect', { uiEventType: 'reasoning' }),
            message('p', 'assistant', 'plan', { uiKind: 'plan-todo' }),
            message('q', 'assistant', 'continue?', { uiKind: 'question' }),
            message('e', 'assistant', 'failed', { error: true })
        ];
        const [answer, thought, plan, question, error] = inputs.map(input =>
            renderAgentConsoleMessageItem(input, { rendererRegistry: this.registry }));
        expect(answer.lines[0].role).toEqual('');
        expect(answer.itemStyle['border-left']).toEqual('2px solid transparent');
        expect(answer.spacerBefore).toEqual(true);
        expect(answer.blockPadding).toEqual(false);
        expect(answer.lines[0].itemStyle?.margin).toEqual('0');
        expect(thought.lines[0].role).toEqual('Thought · ');
        expect(thought.lines[0].itemStyle?.margin).toEqual('0.2em 0 0 0');
        expect(plan.lines[0].role).toEqual('Plan · ');
        expect(question.lines[0].role).toEqual('Question · ');
        expect(error.lines[0].role).toEqual('Error · ');
        expect(new Set([thought.itemStyle['border-left'], plan.itemStyle['border-left'],
            question.itemStyle['border-left'], error.itemStyle['border-left']]).size).toBeGreaterThan(2);
    }

    @Test('user turn and first response are separated while execution remains compact')
    conversationSpacing() {
        const rendered = renderAgentConsoleMessageItems([
            message('u', 'user', '今天天气怎么样，详细说明'),
            message('t', 'assistant', 'agent.tool.weather completed', { uiKind: 'event', uiEventType: 'tool_completed' }),
            message('r', 'assistant', 'Checking the forecast', { uiKind: 'event', uiEventType: 'reasoning' })
        ], { rendererRegistry: this.registry });
        expect(rendered[0].blockPadding).toEqual(true);
        expect(rendered[0].lines[0].itemStyle?.padding).toEqual('1em 1ch 1em 1ch');
        expect(rendered[1].spacerBefore).toEqual(true);
        expect(rendered[1].blockPadding).toEqual(true);
        expect(rendered[1].lines[0].itemStyle?.padding).toEqual('0 1ch');
        expect(rendered[2].spacerBefore).toEqual(false);
        expect(rendered[2].blockPadding).toEqual(false);
        expect(rendered[2].lines[0].itemStyle?.padding).toEqual('0 1ch');
    }
}
