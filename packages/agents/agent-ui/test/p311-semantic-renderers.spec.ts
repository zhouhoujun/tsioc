import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleMessageRendererRegistry,
    AgentConsoleSessionState,
    AgentConsoleThoughtTemplate,
    AgentUiModule,
    projectAgentConsoleExecutionMainline,
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
            expect(item.itemStyle['border-left']).toBeUndefined();
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
        expect(answer.itemStyle['border-left']).toBeUndefined();
        expect(answer.spacerBefore).toEqual(true);
        expect(answer.blockPadding).toEqual(true);
        expect(answer.lines[0].itemStyle?.margin).toEqual('0.5em 0 0.25em 0');
        expect(thought.lines[0].role).toEqual('Thought · ');
        expect(thought.lines[0].itemStyle?.margin).toEqual('0.2em 0 0 0');
        expect(plan.lines[0].role).toEqual('');
        expect(question.lines[0].role).toEqual('Question · ');
        expect(error.lines[0].role).toEqual('Error · ');
    }

    @Test('reasoning rows use opencode disclosure glyph')
    thoughtGlyph() {
        const thought = renderAgentConsoleMessageItem({
            id: 'thought-glyph', role: 'assistant', content: 'inspect',
            createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'reasoning', status: 'success', durationMs: 12 }
        } as any, { rendererRegistry: this.registry });
        expect(thought.lines[0].status).toContain('+');
        expect(thought.lines[0].status).not.toContain('✓');
    }

    @Test('settled reasoning collapses to one row and expands on click')
    thoughtCollapse() {
        const state = this.ctx.get(AgentConsoleSessionState);
        state.markdownContentWidth = 98;
        const projected = projectAgentConsoleExecutionMainline([
            message('u1', 'user', '修复恢复索引'),
            message('r1', 'assistant', [
                `第一行推理：${'确认恢复索引的写入路径与权限边界，并检查失败分支。'.repeat(3)}`,
                '第二行推理：对比输入、输出和错误处理，确认不会覆盖生产库。',
                '第三行推理：补上回滚方案后再次验证。'
            ].join('\n'), {
                uiKind: 'event', uiEventType: 'reasoning', status: 'success', durationMs: 1234
            })
        ]);
        const rendered = renderAgentConsoleMessageItem(projected[1], {
            rendererRegistry: this.registry,
            markdownContentWidth: 98
        });
        const template = new AgentConsoleThoughtTemplate();
        template.item = rendered;
        template.state = state;

        const collapsed = template.lines;
        expect(collapsed).toHaveLength(1);
        expect(collapsed[0].status).toContain('+');
        expect(collapsed[0].toggleMode).toEqual('inline');
        const collapsedText = collapsed[0].tokens.map(token => token.text).join('');
        expect(collapsedText).toContain('第一行推理');
        expect(collapsedText).toContain('…');
        expect(collapsedText).toMatch(/\(\d+(\.\d+)?s\)/);

        state.toggleMessageExpanded('r1');
        const expanded = template.lines;
        expect(expanded.length).toBeGreaterThan(1);
        expect(expanded[0].status).toContain('−');
        expect(expanded.map(line => line.tokens.map(token => token.text).join('')).join('\n'))
            .toContain('第三行推理');
        state.setMessageExpanded('r1', false);
    }

    @Test('collapsed single-line reasoning keeps the preview and the duration')
    thoughtSingleLine() {
        const state = this.ctx.get(AgentConsoleSessionState);
        state.markdownContentWidth = 98;
        const projected = projectAgentConsoleExecutionMainline([
            message('u1', 'user', '解释递归'),
            message('r1', 'assistant', `The user asks: ${'explain recursion with a base case. '.repeat(8)}`, {
                uiKind: 'event', uiEventType: 'reasoning', status: 'success', durationMs: 1800
            })
        ]);
        const rendered = renderAgentConsoleMessageItem(projected[1], {
            rendererRegistry: this.registry,
            markdownContentWidth: 98
        });
        const template = new AgentConsoleThoughtTemplate();
        template.item = rendered;
        template.state = state;
        const collapsed = template.lines;
        expect(collapsed).toHaveLength(1);
        const text = collapsed[0].tokens.map(token => token.text).join('');
        expect(text).toContain('The user asks');
        expect(text).toContain('…');
        expect(text).toMatch(/\(\d+(\.\d+)?s\)/);
    }

    @Test('empty reasoning content falls back to metadata reasoning text')
    thoughtMetadataFallback() {
        const rendered = renderAgentConsoleMessageItem({
            id: 'reasoning-fallback', role: 'assistant', content: '', createdAt: 1,
            metadata: {
                uiKind: 'event', uiEventType: 'reasoning', status: 'success', durationMs: 1800,
                reasoningContent: 'recovered reasoning text'
            }
        } as any, { rendererRegistry: this.registry, markdownContentWidth: 98 });
        expect(rendered.lines.some(line => line.content.includes('recovered reasoning text'))).toEqual(true);
    }

    @Test('user turn and first response are separated while execution remains compact')
    conversationSpacing() {
        const rendered = renderAgentConsoleMessageItems([
            message('u', 'user', '今天天气怎么样，详细说明'),
            message('t', 'assistant', 'agent.tool.weather completed', { uiKind: 'event', uiEventType: 'tool_completed' }),
            message('r', 'assistant', 'Checking the forecast', { uiKind: 'event', uiEventType: 'reasoning' })
        ], { rendererRegistry: this.registry });
        expect(rendered[0].blockPadding).toEqual(true);
        expect(rendered[0].lines[0].itemStyle?.padding).toEqual('0em 0 0em 1ch');
        expect(rendered[1].spacerBefore).toEqual(true);
        expect(rendered[1].blockPadding).toEqual(true);
        expect(rendered[1].lines[0].itemStyle?.padding).toEqual('0 1ch');
        expect(rendered[2].spacerBefore).toEqual(false);
        expect(rendered[2].blockPadding).toEqual(false);
        expect(rendered[2].lines[0].itemStyle?.padding).toEqual('0 1ch');
    }
}
