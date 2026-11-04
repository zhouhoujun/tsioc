import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { renderAgentConsoleMessageItems } from '../src';

function translateFrom(bundle: typeof agentUiEnglish) {
    return (key: string, params?: Record<string, any>) => {
        const parts = key.split('.');
        let current: any = bundle.messages;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return key;
            }
        }
        if (typeof current !== 'string') {
            return key;
        }
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const zh = { translate: translateFrom(agentUiChinese as any) } as any;
const en = { translate: translateFrom(agentUiEnglish as any) } as any;

function eventMessage(lines: number): any {
    return {
        id: `e-${lines}`,
        role: 'assistant',
        content: Array.from({ length: lines }, (_value, index) => `line ${index + 1}`).join('\n'),
        createdAt: 1,
        metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', durationMs: 10 }
    };
}

/**
 * Only rows that can expand/collapse own a hover affordance (opencode keeps
 * plain transcript rows quiet). The affordance text itself follows the locale.
 */
@Suite('viewport disclosure affordance')
export class TimelineHoverAffordanceTest {
    @Test('disclosure rows carry no instructional text')
    longEventRowHasNoInstructionText() {
        for (const translator of [zh, en]) {
            const lines = renderAgentConsoleMessageItems([eventMessage(12)], {
                timelineMode: true,
                translator,
                messageDetailVisibleLines: 6
            })[0].lines;
            expect(lines.every(line => !line.toggleContent)).toBe(true);
        }
    }

    @Test('short rows carry no toggle either')
    shortRowsStayQuiet() {
        const lines = renderAgentConsoleMessageItems([{
            id: 'a1',
            role: 'assistant',
            content: 'plain answer',
            createdAt: 1
        } as any], { timelineMode: true, translator: zh })[0].lines;
        expect(lines[0].toggleContent).toBe('');
        const shortEvent = renderAgentConsoleMessageItems([eventMessage(2)], {
            timelineMode: true,
            translator: zh,
            messageDetailVisibleLines: 6
        })[0].lines;
        expect(shortEvent[0].toggleContent).toBe('');
    }
}
