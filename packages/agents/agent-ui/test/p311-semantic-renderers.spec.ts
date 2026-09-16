import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleArtifactMessageRenderer,
    AgentConsoleConversationMessageRenderer,
    AgentConsoleDecisionMessageRenderer,
    AgentConsoleDiagnosticMessageRenderer,
    AgentConsoleExecutionMessageRenderer,
    AgentConsoleMessageRendererRegistry,
    renderAgentConsoleMessageItem
} from '../src';

function message(id: string, role: string, content: string, metadata: Record<string, any> = {}): any {
    return { id, role, content, createdAt: 1, metadata };
}

function registry(): AgentConsoleMessageRendererRegistry {
    return new AgentConsoleMessageRendererRegistry([
        new AgentConsoleConversationMessageRenderer(),
        new AgentConsoleExecutionMessageRenderer(),
        new AgentConsoleDecisionMessageRenderer(),
        new AgentConsoleArtifactMessageRenderer(),
        new AgentConsoleDiagnosticMessageRenderer()
    ]);
}

@Suite('P311 semantic renderer grammar')
export class SemanticRendererSuite {
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
            const rendered = renderAgentConsoleMessageItem(input, { rendererRegistry: registry() });
            expect(rendered.semanticFamily).toEqual(family);
            expect(rendered.semanticKind).toEqual(kind);
            expect(rendered.lines[0].semanticFamily).toEqual(family);
        }
    }

    @Test('ARIA derives semantic title status meta and CJK body from the presenter')
    semanticAria() {
        const rendered = renderAgentConsoleMessageItem(
            message('q', 'assistant', '是否发布到生产环境？', { uiKind: 'question', status: 'pending' }),
            { rendererRegistry: registry(), showTimestamps: true }
        );
        expect(rendered.lines[0].ariaLabel).toContain('Question');
        expect(rendered.lines[0].ariaLabel).toContain('是否发布到生产环境？');
        expect(rendered.lines[0].role).toEqual('? ');
    }

    @Test('semantic renderers keep stable item geometry across content families')
    stableGeometry() {
        const rendered = [
            message('u', 'user', 'request'),
            message('a', 'assistant', 'answer'),
            message('e', 'assistant', 'failure', { error: true })
        ].map(input => renderAgentConsoleMessageItem(input, { rendererRegistry: registry() }));
        rendered.forEach(item => {
            expect(item.itemStyle['box-sizing']).toEqual('border-box');
            expect(item.itemStyle['border-left']).toBeTruthy();
            expect(item.lines[0].itemStyle?.padding).toBeTruthy();
        });
    }
}
