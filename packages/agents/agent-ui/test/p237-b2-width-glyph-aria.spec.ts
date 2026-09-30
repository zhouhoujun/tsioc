import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    getDisplayWidth,
    sliceByDisplayWidth,
    fitByDisplayWidth,
    renderAgentConsoleMessageItems,
    truncateTimelineEventRowContent,
    TIMELINE_EVENT_ROW_CONTENT_MAX
} from '../src';

@Suite('P237 timeline width / status glyph / ARIA baseline')
export class P237B2WidthGlyphAriaTest {

    @Test('display width counts CJK/emoji as 2 and zero-width as 0')
    displayWidthSemantics() {
        expect(getDisplayWidth('hello')).toEqual(5);
        expect(getDisplayWidth('中')).toEqual(2);
        expect(getDisplayWidth('中文')).toEqual(4);
        expect(getDisplayWidth('a中b')).toEqual(4);
        expect(getDisplayWidth('\u200b')).toEqual(0);
        expect(getDisplayWidth('x\u200bx')).toEqual(2);
        expect(getDisplayWidth('👋')).toEqual(2);
        expect(getDisplayWidth('\u001b[31mred\u001b[0m')).toEqual(3);
    }

    @Test('sliceByDisplayWidth bounds by columns without splitting a CJK char')
    sliceBoundedByColumns() {
        expect(sliceByDisplayWidth('中'.repeat(300), 200)).toEqual('中'.repeat(100));
        expect(getDisplayWidth(sliceByDisplayWidth('x'.repeat(250), 100))).toBeLessThanOrEqual(100);
        expect(sliceByDisplayWidth('\u001b[31m' + 'x'.repeat(50) + '\u001b[0m', 10)).toContain('\u001b[0m');
        expect(sliceByDisplayWidth('', 10)).toEqual('');
    }

    @Test('fitByDisplayWidth pads short and slices long with ellipsis')
    fitKeepsStableWidth() {
        expect(fitByDisplayWidth('ab', 5)).toEqual('ab');
        expect(fitByDisplayWidth('abcdefgh', 6)).toEqual('abc...');
        expect(getDisplayWidth(fitByDisplayWidth('中'.repeat(10), 8))).toBeLessThanOrEqual(8);
    }

    @Test('event row truncation is display-width based; ASCII result identical to char slicing')
    eventRowTruncationUsesDisplayWidth() {
        expect(truncateTimelineEventRowContent('中'.repeat(300), 'success'))
            .toEqual('中'.repeat(100) + '…');
        const sliced = truncateTimelineEventRowContent('中'.repeat(300), 'success');
        expect(getDisplayWidth(sliced)).toBeLessThanOrEqual(TIMELINE_EVENT_ROW_CONTENT_MAX + 1);
        expect(truncateTimelineEventRowContent('x'.repeat(300), 'success'))
            .toEqual('x'.repeat(TIMELINE_EVENT_ROW_CONTENT_MAX) + '…');
        expect(truncateTimelineEventRowContent('中'.repeat(50), 'success'))
            .toEqual('中'.repeat(50));
        expect(truncateTimelineEventRowContent('中'.repeat(300), 'failed'))
            .toEqual('中'.repeat(100) + '…');
        expect(truncateTimelineEventRowContent('中'.repeat(300), 'error'))
            .toEqual('中'.repeat(100) + '…');
    }

    @Test('event rows get a default status glyph when no custom symbol is configured')
    eventRowGlyphFallback() {
        const running = renderAgentConsoleMessageItems([{
            id: 'e1', role: 'assistant', content: 'Reading files', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_invoked', status: 'running' }
        }] as any);
        expect(running[0].lines[0].status?.trim()).toEqual('●');
        expect(running[0].lines[0].role?.trim()).toEqual('');

        const completed = renderAgentConsoleMessageItems([{
            id: 'e2', role: 'assistant', content: 'Read files', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }
        }] as any);
        expect(completed[0].lines[0].status?.trim()).toEqual('✓');

        const failed = renderAgentConsoleMessageItems([{
            id: 'e3', role: 'assistant', content: 'Read failed', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_failed', status: 'error' }
        }] as any);
        expect(failed[0].lines[0].status?.trim()).toEqual('✕');
    }

    @Test('timeline events form a compact rail while failures keep emphasis')
    timelineEventCompactRail() {
        const completed = renderAgentConsoleMessageItems([{
            id: 'e1', role: 'assistant', content: 'Read files', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }
        }] as any)[0].lines[0];
        expect(completed.itemStyle?.padding).toEqual('0 1ch');
        expect(completed.itemStyle?.margin).toEqual('0');
        expect(completed.itemStyle?.['border-left']).toEqual('1px solid #6e7681');

        const failed = renderAgentConsoleMessageItems([{
            id: 'e2', role: 'assistant', content: 'Tests failed', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_failed', status: 'error' }
        }] as any)[0].lines[0];
        expect(failed.itemStyle?.padding).toEqual('0 1ch');
        expect(failed.itemStyle?.margin).toEqual('0');
        expect(failed.itemStyle?.['border-left']).toEqual('2px solid #ffa198');

        const answer = renderAgentConsoleMessageItems([{
            id: 'a1', role: 'assistant', content: 'Done', createdAt: 1
        }] as any)[0].lines[0];
        expect(answer.itemStyle?.padding).toEqual('0em 1ch 0em 1ch');
        expect(answer.itemStyle?.margin).toEqual('0 0 0.25em 0');
    }

    @Test('timeline event text hierarchy mutes completion and emphasizes failures')
    timelineEventTextHierarchy() {
        const render = (status: string, content = 'event') => renderAgentConsoleMessageItems([{
            id: status, role: 'assistant', content, createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status }
        }] as any)[0].lines[0];

        expect(render('success').lineStyle?.color).toEqual('#6e7681');
        expect(render('running').lineStyle?.color).toEqual('#c9d1d9');
        expect(render('blocked').lineStyle?.color).toEqual('#d29922');
        expect(render('error').lineStyle?.color).toEqual('#ffa198');

        const code = renderAgentConsoleMessageItems([{
            id: 'code', role: 'assistant', content: '`npm test`', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }
        }] as any)[0].lines[0];
        expect(code.lineStyle?.background).toEqual('#161b22');
        expect(code.lineStyle?.color).toEqual('#79c0ff');
    }

    @Test('custom status symbol wins over the default glyph')
    customSymbolWinsOverGlyph() {
        const items = renderAgentConsoleMessageItems([{
            id: 'e1', role: 'assistant', content: 'Read files', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }
        }] as any, { statusSymbol: '▶' });
        expect(items[0].lines[0].status?.trim()).toEqual('▶');
    }

    @Test('non-event rows keep an empty status outside timeline mode')
    nonTimelineStatusStaysEmpty() {
        const items = renderAgentConsoleMessageItems([
            {
                id: 'a1', role: 'assistant', content: 'world', createdAt: 1
            }
        ] as any);
        expect(items[0].lines[0].status?.trim()).toEqual('');
    }

    @Test('timeline mode adds glyphs to non-event rows too')
    timelineModeGlyphFallback() {
        const items = renderAgentConsoleMessageItems([{
            id: 'a1', role: 'assistant', content: 'world', createdAt: 1
        }] as any, { timelineMode: true });
        expect(items[0].lines[0].status?.trim()).toEqual('✓');
    }

    @Test('event rows expose a text aria label (status + content + meta, never color-only)')
    eventRowAriaLabel() {
        const items = renderAgentConsoleMessageItems([{
            id: 'e2', role: 'assistant', content: 'Read files', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', durationMs: 1250 }
        }] as any);
        const label = items[0].lines[0].ariaLabel || '';
        expect(label).toContain('Read files');
        expect(label).toContain('1.3s');
        expect(label).toContain('成功');
        expect(label).not.toContain('\u001b[');
    }

    @Test('non-event assistant rows compose status label into aria text')
    assistantAriaLabelHasStatusText() {
        const items = renderAgentConsoleMessageItems([{
            id: 'a1', role: 'assistant', content: 'hello **world**', createdAt: 1
        }] as any);
        expect(items[0].lines[0].ariaLabel).toContain('成功');
        expect(items[0].lines[0].ariaLabel).toContain('hello world');
    }

    @Test('user rows lean on content for the aria label')
    userAriaLabelIsContent() {
        const items = renderAgentConsoleMessageItems([{
            id: 'u1', role: 'user', content: 'fix the tests', createdAt: 1
        }] as any);
        expect(items[0].lines[0].ariaLabel).toContain('fix the tests');
    }
}
