import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { renderAgentConsoleMessageItems } from '../src';
import { TIMELINE_HEADER_FOOTER_MAX_WIDTH } from '../src/AgentConsoleTimelineWindow';
import { getDisplayWidth } from '../src/AgentConsoleTextWidth';

// ── Helpers ──────────────────────────────────────────────────────────────────

function eventMsg(id: string, meta: Record<string, any> = {}): any {
    return {
        id,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        metadata: {
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            uiEventKey: `scope:tool:${id}`,
            status: 'success',
            ...meta
        }
    };
}

function boundaryMsg(
    id: string,
    content: string,
    overrides: Record<string, any> = {}
): any {
    return {
        id,
        role: 'assistant',
        content,
        createdAt: Date.now(),
        metadata: {
            uiKind: 'timeline-boundary',
            planStepStatus: 'in_progress',
            planIndex: 1,
            planTotal: 2,
            ...overrides
        }
    };
}

function headerMsg(
    id = '__timeline_session_header__',
    content = 'Test Session · 开始 10:00'
): any {
    return {
        id,
        role: 'assistant',
        content,
        createdAt: Date.now(),
        metadata: { uiKind: 'timeline-header' }
    };
}

// ── Tests ────────────────────────────────────────────────────────────────────

@Suite('P302 turn/step/event three-layer visual syntax')
export class P302TurnStepEventSyntaxTest {

    // ── Turn header ────────────────────────────────────────────────────────

    @Test('turn header carries only context and start time; no step or error count (P302)')
    headerContextOnly() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 5 });
        state.setTitle('重构用户模块');
        state.setTimelineMode('steps');
        state.setPlanTodos([
            { id: 'p1', content: '分析', status: 'in_progress' },
            { id: 'p2', content: '实施', status: 'pending' }
        ]);
        state.setMessages([
            eventMsg('e1', { status: 'error' }),
            eventMsg('e2', { status: 'error' })
        ]);
        const header = state.sessionHeader;
        expect(header).toBeDefined();
        expect(header!.content).toContain('重构用户模块');
        expect(header!.content).toContain('开始');
        expect(header!.content).not.toContain('step');
        expect(header!.content).not.toContain('步');
        expect(header!.content).not.toContain('错误');
    }

    // ── Step boundary status glyph ─────────────────────────────────────────

    @Test('in_progress boundary renders running ● glyph (P302)')
    inProgressBoundaryRendersRunning() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/2 步 · 分析', {
            planStepStatus: 'in_progress'
        })], { timelineMode: true });
        expect(items.length).toBe(1);
        expect(items[0].status).toContain('●');
        expect(items[0].lines[0].ariaLabel).toContain('正在执行');
    }

    @Test('pending boundary renders running ● glyph (P302)')
    pendingBoundaryRendersRunning() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 2/2 步 · 实施', {
            planStepStatus: 'pending'
        })], { timelineMode: true });
        expect(items[0].status).toContain('●');
        expect(items[0].lines[0].ariaLabel).toContain('正在执行');
    }

    @Test('completed boundary renders success ✓ glyph (P302)')
    completedBoundaryRendersSuccess() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/1 步 · 完成', {
            planStepStatus: 'completed'
        })], { timelineMode: true });
        expect(items[0].status).toContain('✓');
        expect(items[0].lines[0].ariaLabel).toContain('成功');
    }

    @Test('failed boundary renders failed ✕ glyph (P302)')
    failedBoundaryRendersFailed() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/1 步 · 失败', {
            planStepStatus: 'failed'
        })], { timelineMode: true });
        expect(items[0].status).toContain('✕');
        expect(items[0].lines[0].ariaLabel).toContain('失败');
    }

    // ── Step boundary meta: duration only ──────────────────────────────────

    @Test('boundary meta contains duration when planStepElapsedMs is present (P302)')
    boundaryMetaWithElapsed() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/2 步 · 分析', {
            planStepElapsedMs: 65000
        })], { timelineMode: true });
        expect(items[0].lines[0].meta).toContain('1m 5s');
    }

    @Test('boundary meta is empty when planStepElapsedMs is absent (P302)')
    boundaryMetaWithoutElapsed() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/2 步 · 分析')], {
            timelineMode: true
        });
        expect(items[0].lines[0].meta).toBe('');
    }

    @Test('boundary meta does not include statusLabel text (P302)')
    boundaryMetaExcludesStatusLabel() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/2 步 · 分析', {
            planStepElapsedMs: 1000
        })], { timelineMode: true });
        expect(items[0].lines[0].meta).not.toContain('正在执行');
        expect(items[0].lines[0].meta).not.toContain('成功');
    }

    @Test('boundary meta duration is display-width aware (P302)')
    boundaryMetaCjkSafe() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/2 步 · 分析', {
            planStepElapsedMs: 120000
        })], { timelineMode: true });
        expect(items[0].lines[0].meta).toContain('2m 0s');
    }

    // ── Boundary content truncation ────────────────────────────────────────

    @Test('boundary content is truncated to the single-line width budget (P302)')
    boundaryContentTruncated() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 5 });
        state.setTimelineMode('steps');
        state.setPlanTodos([
            { id: 'p1', content: 'x'.repeat(TIMELINE_HEADER_FOOTER_MAX_WIDTH + 50), status: 'in_progress' }
        ]);
        const boundary = state.displayMessages.find(item => item.id === '__timeline_plan_boundary__');
        expect(boundary).toBeDefined();
        expect(getDisplayWidth(boundary!.content)).toBeLessThanOrEqual(TIMELINE_HEADER_FOOTER_MAX_WIDTH);
    }

    @Test('boundary CJK content truncation is display-width safe (P302)')
    boundaryCjkTruncation() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setConsoleOptions({ messagesVisibleItems: 5 });
        state.setTimelineMode('steps');
        state.setPlanTodos([
            { id: 'p1', content: '中'.repeat(TIMELINE_HEADER_FOOTER_MAX_WIDTH), status: 'in_progress' }
        ]);
        const boundary = state.displayMessages.find(item => item.id === '__timeline_plan_boundary__');
        expect(boundary).toBeDefined();
        expect(getDisplayWidth(boundary!.content)).toBeLessThanOrEqual(TIMELINE_HEADER_FOOTER_MAX_WIDTH);
    }

    // ── Boundary visual contract ───────────────────────────────────────────

    @Test('boundary row uses one themed rail without card separators (P302)')
    boundaryNotCard() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/1 步 · 分析')], {
            timelineMode: true
        });
        expect(items[0].itemStyle['border-top']).toBeUndefined();
        expect(items[0].itemStyle['border-bottom']).toBeUndefined();
        expect(items[0].itemStyle['border-left']).toBeDefined();
        expect(items[0].itemStyle.margin).toBe('0');
    }

    @Test('boundary role continues the timeline rail with ├ (P302)')
    boundaryRolePrefix() {
        const items = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/1 步 · 分析')], {
            timelineMode: true
        });
        expect(items[0].lines[0].role).toContain('├');
    }

    // ── Event rail contract ────────────────────────────────────────────────

    @Test('event rows use a compact continuation rail (P302)')
    eventIndentMaxTwo() {
        const items = renderAgentConsoleMessageItems([
            eventMsg('e1'),
            eventMsg('e2'),
            eventMsg('e3')
        ], { timelineMode: true });
        for (const item of items) {
            const role = item.lines[0]?.role || '';
            expect(role).toMatch(/^│ /);
            expect(getDisplayWidth(role)).toBeLessThanOrEqual(4);
        }
    }

    @Test('event itemStyle has no border-top/bottom separators (P302)')
    eventNoPerRowSeparators() {
        const items = renderAgentConsoleMessageItems([
            eventMsg('e1'),
            eventMsg('e2')
        ], { timelineMode: true });
        for (const item of items) {
            expect(item.itemStyle['border-top']).toBeUndefined();
            expect(item.itemStyle['border-bottom']).toBeUndefined();
            expect(item.itemStyle['border-left']).toBeDefined();
        }
    }

    @Test('event padding is compact (no card look) (P302)')
    eventCompactPadding() {
        const items = renderAgentConsoleMessageItems([eventMsg('e1')], {
            timelineMode: true
        });
        const firstLine = items[0]!.lines[0]!;
        expect(firstLine.itemStyle!['padding']).toBe('0 1ch');
    }

    // ── Three-layer hierarchy verification ─────────────────────────────────

    @Test('turn layers form a coherent start, branch, continuation rail (P302)')
    threeLayerIndentHierarchy() {
        const headerItems = renderAgentConsoleMessageItems([headerMsg()], {
            timelineMode: true
        });
        const boundaryItems = renderAgentConsoleMessageItems([boundaryMsg('b1', '第 1/1 步 · 分析')], {
            timelineMode: true
        });
        const eventItems = renderAgentConsoleMessageItems([eventMsg('e1')], {
            timelineMode: true
        });
        expect(headerItems[0].lines[0].role).toContain('┌');
        expect(boundaryItems[0].lines[0].role).toContain('├');
        expect(eventItems[0].lines[0].role).toMatch(/^│ /);
    }
}
