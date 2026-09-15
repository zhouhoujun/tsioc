import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { EN_TIMELINE_LABELS, TIMELINE_HEADER_FOOTER_MAX_WIDTH, truncateTimelineRowText } from '../src/AgentConsoleTimelineWindow';
import { getDisplayWidth } from '../src/AgentConsoleTextWidth';

// ── Helpers ──────────────────────────────────────────────────────────────────

function eventMsg(id: string, metaOverrides: Record<string, any> = {}): any {
    return {
        id,
        role: 'assistant',
        content: 'event content',
        createdAt: Date.now(),
        metadata: {
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            uiEventKey: `scope:tool:${id}`,
            status: 'success',
            ...metaOverrides
        }
    };
}

function createState(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.setConsoleOptions({ messagesVisibleItems: 5 });
    return state;
}

const CJK_TITLE = '这是一段用于验证窄终端单行约束的中文会话标题外加一些补充说明文字';

@Suite('session header/footer derivation (P291)')
export class SessionHeaderFooterTest {

    @Test('header and footer are undefined when timeline is off')
    testOffMode() {
        const state = createState();
        expect(state.sessionHeader).toBeUndefined();
        expect(state.sessionFooter).toBeUndefined();
    }

    @Test('header excludes nothing required: title + start time present')
    testHeaderIncludesTitleAndTime() {
        const state = createState();
        state.setTitle('重构用户模块');
        state.setTimelineMode('steps');
        state.setMessages([eventMsg('e1'), eventMsg('e2')]);
        const header = state.sessionHeader;
        expect(header).toBeDefined();
        expect(header!.content).toContain('重构用户模块');
        expect(header!.content).toContain('开始');
        expect(header!.content).toMatch(/\d{1,2}:\d{2}/);
        expect(header!.content).not.toContain('step');
        expect(header!.content).not.toContain('错误');
    }

    @Test('header excludes step position even when a plan todo is active (P302)')
    testHeaderStep() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setPlanTodos([
            { id: 'p1', content: '分析', status: 'in_progress' },
            { id: 'p2', content: '实施', status: 'pending' }
        ]);
        const header = state.sessionHeader;
        expect(header).toBeDefined();
        expect(header!.content).not.toContain('step');
        expect(header!.content).not.toContain('步');
    }

    @Test('header excludes error count even when messages failed (P302)')
    testHeaderErrorCount() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setMessages([
            eventMsg('e1', { status: 'error', uiEventType: 'tool_failed' }),
            eventMsg('e2', { status: 'failed', uiEventType: 'tool_failed' }),
            eventMsg('e3')
        ]);
        const header = state.sessionHeader;
        expect(header).toBeDefined();
        expect(header!.content).not.toContain('错误');
        expect(header!.content).not.toContain('error');
    }

    @Test('header degrades to a time-only row when no title is set')
    testHeaderTimeOnlyDegrade() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setMessages([eventMsg('e1')]);
        const header = state.sessionHeader;
        expect(header).toBeDefined();
        expect(header!.content).toMatch(/^开始 \d{1,2}:\d{2}/);
    }

    @Test('footer shows 完成 when session is idle')
    testFooterDone() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setMessages([eventMsg('e1')]);
        const footer = state.sessionFooter;
        expect(footer).toBeDefined();
        expect(footer!.content).toContain('完成');
    }

    @Test('footer shows 失败 when session status is error')
    testFooterFailed() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setMessages([eventMsg('e1')]);
        state.setStatus('error');
        const footer = state.sessionFooter;
        expect(footer).toBeDefined();
        expect(footer!.content).toContain('失败');
    }

    @Test('footer shows 进行中 when session is running')
    testFooterRunning() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setMessages([eventMsg('e1')]);
        state.setStatus('running');
        const footer = state.sessionFooter;
        expect(footer).toBeDefined();
        expect(footer!.content).toContain('进行中');
    }

    @Test('footer includes a locale duration')
    testFooterDuration() {
        const state = createState();
        state.setTimelineMode('steps');
        state.setMessages([eventMsg('e1', { createdAt: Date.now() - 65000 })]);
        const footer = state.sessionFooter;
        expect(footer).toBeDefined();
        expect(footer!.content).toContain('耗时');
        expect(footer!.content).toMatch(/\d+m \d+s|ms|\.\ds/);
    }

    @Test('footer omits the /timeline mode hint in every mode (P303)')
    testFooterModeHint() {
        const compact = createState();
        compact.setTimelineMode('compact');
        expect(compact.sessionFooter!.content).not.toContain('/timeline');

        const steps = createState();
        steps.setTimelineMode('steps');
        expect(steps.sessionFooter!.content).not.toContain('/timeline');

        const verbose = createState();
        verbose.setTimelineMode('verbose');
        expect(verbose.sessionFooter!.content).not.toContain('/timeline');
    }

    @Test('footer shows error count only when events failed (P303)')
    testFooterErrorCount() {
        const noError = createState();
        noError.setTimelineMode('steps');
        noError.setMessages([eventMsg('e1')]);
        expect(noError.sessionFooter!.content).not.toContain('错误');

        const withError = createState();
        withError.setTimelineMode('steps');
        withError.setMessages([
            eventMsg('e1'),
            eventMsg('e2', { status: 'error', uiEventType: 'tool_failed' }),
            eventMsg('e3', { status: 'error', uiEventType: 'tool_failed' })
        ]);
        const footer = withError.sessionFooter!;
        expect(footer.content).toContain('2 个错误');
        expect(footer.content).toContain('完成');
    }

    @Test('EN labels are honored when provided')
    testEnLabels() {
        const state = createState();
        state.setConsoleOptions({ timelineLabels: EN_TIMELINE_LABELS });
        state.setTitle('Refactor module');
        state.setStatus('error');
        state.setTimelineMode('compact');
        const header = state.sessionHeader;
        const footer = state.sessionFooter;
        expect(header).toBeDefined();
        expect(header!.content).toContain('started');
        expect(header!.content).toContain('Refactor module');
        expect(footer).toBeDefined();
        expect(footer!.content).toContain('Failed');
        expect(footer!.content).toContain('took');
        expect(footer!.content).not.toContain('/timeline');
    }

    @Test('header and footer rows stay within the single-line width budget')
    testRowWidth() {
        const state = createState();
        state.setTitle(CJK_TITLE);
        state.setTimelineMode('steps');
        state.setPlanTodos([
            { id: 'p1', content: '分析', status: 'in_progress' }
        ]);
        state.setMessages([
            eventMsg('e1', { status: 'error', uiEventType: 'tool_failed' }),
            eventMsg('e2', { status: 'error', uiEventType: 'tool_failed' })
        ]);
        expect(getDisplayWidth(state.sessionHeader!.content)).toBeLessThanOrEqual(TIMELINE_HEADER_FOOTER_MAX_WIDTH);
        expect(getDisplayWidth(state.sessionFooter!.content)).toBeLessThanOrEqual(TIMELINE_HEADER_FOOTER_MAX_WIDTH);
    }

    @Test('row truncation includes the ellipsis in its display-width budget')
    testTruncationBudget() {
        const ascii = truncateTimelineRowText('123456', 5);
        const cjk = truncateTimelineRowText('中文中文', 5);
        expect(ascii).toEqual('1234…');
        expect(cjk).toEqual('中文…');
        expect(getDisplayWidth(ascii)).toEqual(5);
        expect(getDisplayWidth(cjk)).toEqual(5);
        expect(truncateTimelineRowText('x', 0)).toEqual('');
    }

    @Test('header and footer carry distinct timeline metadata kinds')
    testMetadataKinds() {
        const state = createState();
        state.setTimelineMode('steps');
        expect(state.sessionHeader!.metadata?.uiKind).toBe('timeline-header');
        expect(state.sessionFooter!.metadata?.uiKind).toBe('timeline-footer');
        expect(state.sessionHeader!.id).toBe('__timeline_session_header__');
        expect(state.sessionFooter!.id).toBe('__timeline_session_footer__');
    }
}
