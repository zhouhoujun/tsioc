import expect = require('expect');
import { BeforeEach, Suite, Test, AfterEach } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleMessagesPanelComponent,
    AgentUiModule
} from '../src';
import {
    resolveTimelineWindowLedger,
    TimelineWindowMessage
} from '../src/AgentConsoleTimelineWindow';

// P286: v19-C2 UI 编排细节
//  - C2-1 消息默认展开：仅具体 Thought 组件主动采用预览折叠
//  - C2-2 窄终端/CJK 折叠细化：estimateRows 按显示宽度（CJK/emoji 双宽）估算而非字符数
//  - C2-3 重组 timeline 稳定 key：renderedLines.renderKey 基于 messageId，重排后不变

function longContent(lineCount: number): string {
    return Array.from({ length: lineCount }, (_, index) => `line ${index + 1}`).join('\n');
}

function msg(id: string, overrides: Partial<TimelineWindowMessage> = {}): TimelineWindowMessage {
    return {
        id,
        role: 'assistant',
        content: 'content',
        createdAt: Date.now(),
        ...overrides
    };
}

@Suite('C2 error/approval fixed-expand & stable keys (P286)')
export class C2FixedExpandStableKeysTest {
    ctx!: ApplicationContext;

    @BeforeEach()
    async init() {
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                    return dom.window.document;
                }
            }]
        });
    }

    private async bootRef(): Promise<ComponentRef<AgentConsoleComponent>> {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    private panelLines(ref: ComponentRef<AgentConsoleComponent>) {
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        return messagesPanel.instance.renderedLines;
    }

    @Test('C2-1 default: error root cause stays visible while stack detail leaves the mainline')
    async defaultErrorFixedExpand() {
        const ref = await this.bootRef();
        ref.instance.sessionState.setMessages([
            // 普通 system 长消息默认展开
            { id: 'sys1', role: 'system', content: longContent(12), createdAt: 1 } as any,
            // 错误消息：assistant + metadata.error（无 type）→ templateKind 'error' + statusKind 'error'
            { id: 'err1', role: 'assistant', content: longContent(12), createdAt: 2, metadata: { error: 'boom' } } as any,
            // 审批消息：assistant + uiEventType approval → isApprovalMessageItem
            { id: 'appr1', role: 'assistant', content: longContent(12), createdAt: 3, metadata: { uiEventType: 'approval' } } as any
        ]);
        await ref.render();
        await Promise.resolve();

        const lines = this.panelLines(ref);
        const collapsedIds = lines.filter(line => line.previewCollapsed).map(line => line.messageId);
        expect(collapsedIds).not.toContain('sys1');
        expect(collapsedIds).not.toContain('err1');
        expect(collapsedIds).not.toContain('appr1');
        expect(lines.filter(line => line.messageId === 'err1')).toHaveLength(1);
        expect(lines.find(line => line.messageId === 'err1')?.content).toContain('boom');
        expect(ref.instance.sessionState.displayMessages.find(message => message.id === 'err1')?.metadata?.detailRef).toEqual('err1');
        expect(lines.filter(line => line.messageId === 'appr1')).toHaveLength(12);
        expect(lines.filter(line => line.messageId === 'sys1')).toHaveLength(12);
    }

    @Test('C2-1 focused: conversation, approval, error and system content stay expanded')
    async focusedApprovalErrorFixedExpand() {
        const ref = await this.bootRef();
        ref.instance.sessionState.setConsoleOptions({ messageLayout: 'viewport' });
        ref.instance.sessionState.setMessages([
            // 普通对话正文不因 dynamic/focused 布局而折叠。
            { id: 'plain1', role: 'assistant', content: longContent(12), createdAt: 1 } as any,
            { id: 'appr1', role: 'assistant', content: longContent(12), createdAt: 2, metadata: { uiEventType: 'approval' } } as any,
            { id: 'err1', role: 'assistant', content: longContent(12), createdAt: 3, metadata: { error: 'boom' } } as any,
            { id: 'sys1', role: 'system', content: longContent(12), createdAt: 4 } as any
        ]);
        ref.instance.sessionState.setMessagesFocused(true);
        ref.instance.sessionState.setSelectedMessageId('plain1');
        await ref.render();
        await Promise.resolve();

        const lines = this.panelLines(ref);
        const collapsedIds = lines.filter(line => line.previewCollapsed).map(line => line.messageId);
        expect(collapsedIds).not.toContain('plain1');
        expect(collapsedIds).not.toContain('appr1');
        expect(collapsedIds).not.toContain('err1');
        expect(collapsedIds).not.toContain('sys1');
        expect(lines.filter(line => line.messageId === 'plain1')).toHaveLength(12);
        expect(lines.filter(line => line.messageId === 'appr1')).toHaveLength(12);
        expect(lines.filter(line => line.messageId === 'err1')).toHaveLength(1);
        expect(lines.filter(line => line.messageId === 'sys1')).toHaveLength(12);
    }

    @Test('C2-2 estimateRows counts CJK display width, not char count')
    async estimateRowsCjkDisplayWidth() {
        // '中文'.repeat(50) = 100 字符，显示宽度 200 → ceil(200/80) = 3
        const cjk = msg('cjk-1', { content: '中文'.repeat(50) });
        // 100 个 ASCII 字符，显示宽度 100 → ceil(100/80) = 2
        const ascii = msg('ascii-1', { content: 'x'.repeat(100) });
        // ANSI SGR 不占显示宽度；'中文'.repeat(21) 显示宽 84 → 2 行（字符数 42 旧算法只会估 1）
        const ansi = msg('ansi-1', { content: `\x1b[31m${'中'.repeat(42)}\x1b[0m` });
        const boundary = msg('boundary-1', { content: '中'.repeat(40) });

        const result = resolveTimelineWindowLedger({
            messages: [cjk, ascii, ansi, boundary],
            limit: 10,
            mode: 'steps',
            activeScope: ''
        });
        const byId = (id: string) => result.items.find(item => item.message.id === id)!;
        expect(byId('cjk-1').estimatedRows).toBe(3);
        expect(byId('ascii-1').estimatedRows).toBe(2);
        expect(byId('ansi-1').estimatedRows).toBe(2);
        // '中'.repeat(40) 显示宽 80 → 恰好 1 行
        expect(byId('boundary-1').estimatedRows).toBe(1);
    }

    @Test('C2-3 render keys are message-based and stable across reorder')
    async stableRenderKeysOnReorder() {
        const ref = await this.bootRef();
        const m1 = { id: 'm1', role: 'assistant', content: 'alpha\nbeta\ngamma', createdAt: 1 } as any;
        const m2 = { id: 'm2', role: 'user', content: 'delta\nepsilon', createdAt: 2 } as any;
        ref.instance.sessionState.setMessages([m1, m2]);
        await ref.render();
        await Promise.resolve();

        const collectKeys = () => {
            const keys: Record<string, string[]> = {};
            for (const line of this.panelLines(ref)) {
                if (line.messageId) {
                    (keys[line.messageId] ||= []).push(line.renderKey || '');
                }
            }
            return keys;
        };

        const before = collectKeys();
        expect(before['m1']).toEqual(['m1:0', 'm1:1', 'm1:2']);
        expect(before['m2']).toEqual(['m2:0', 'm2:1']);

        // 重排（timeline 重组等价场景）：同消息 renderKey 必须保持不变
        ref.instance.sessionState.setMessages([m2, m1]);
        await ref.render();
        await Promise.resolve();
        const after = collectKeys();
        expect(after['m1']).toEqual(before['m1']);
        expect(after['m2']).toEqual(before['m2']);
    }

    @Test('C2-3 duplicate content messages keep distinct render keys')
    async duplicateContentDistinctKeys() {
        const ref = await this.bootRef();
        const content = 'same content';
        ref.instance.sessionState.setMessages([
            { id: 'a1', role: 'assistant', content, createdAt: 1 } as any,
            { id: 'a2', role: 'assistant', content, createdAt: 2 } as any
        ]);
        await ref.render();
        await Promise.resolve();

        const keys = this.panelLines(ref).map(line => line.renderKey);
        expect(keys.filter(key => key === 'a1:0')).toHaveLength(1);
        expect(keys.filter(key => key === 'a2:0')).toHaveLength(1);
        expect(new Set(keys).size).toBe(keys.length);
    }

    @AfterEach()
    async clean() {
        await this.ctx?.close();
        if (global.gc) global.gc();
    }
}
