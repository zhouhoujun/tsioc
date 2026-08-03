import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentMessage, buildUsageSummary, collectMessageUsageRecords, collectTurnUsageRecords } from '../src';

function assistantMessage(createdAt: number, usage: Record<string, any>): AgentMessage {
    return {
        id: `msg-${createdAt}`,
        role: 'assistant',
        content: 'done',
        createdAt,
        metadata: { usage }
    };
}

@Suite('Usage summary')
export class UsageSummaryTest {
    @Test('collects assistant message usage records with normalized token keys')
    collectMessageUsage() {
        const records = collectMessageUsageRecords('session-1', [
            { id: 'user-1', role: 'user', content: 'hello', createdAt: 1 },
            assistantMessage(2, { prompt_tokens: 4, output_tokens: 6 }),
            assistantMessage(3, { promptTokens: 2, completionTokens: 3, totalTokens: 5 })
        ]);
        expect(records).toEqual([
            { sessionId: 'session-1', createdAt: 2, promptTokens: 4, completionTokens: 6, totalTokens: 10 },
            { sessionId: 'session-1', createdAt: 3, promptTokens: 2, completionTokens: 3, totalTokens: 5 }
        ]);
    }

    @Test('builds daily weekly and cumulative usage windows')
    buildUsageWindows() {
        const day = 24 * 60 * 60 * 1000;
        const now = 10 * day;
        const usage = [
            { sessionId: 'session-1', createdAt: now - (12 * 60 * 60 * 1000), promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            { sessionId: 'session-1', createdAt: now - (3 * day), promptTokens: 20, completionTokens: 10, totalTokens: 30 },
            { sessionId: 'session-2', createdAt: now - (9 * day), promptTokens: 40, completionTokens: 20, totalTokens: 60 }
        ];
        const turns = collectTurnUsageRecords([
            { sessionId: 'session-1', createdAt: now - (18 * 60 * 60 * 1000) },
            { sessionId: 'session-1', createdAt: now - (3 * day) },
            { sessionId: 'session-2', createdAt: now - (9 * day) }
        ] as any);

        const summary = buildUsageSummary(usage, turns, now);

        expect(summary.daily.turns).toEqual(1);
        expect(summary.daily.totalTokens).toEqual(15);
        expect(summary.daily.sessions).toEqual(1);
        expect(summary.weekly.turns).toEqual(2);
        expect(summary.weekly.promptTokens).toEqual(30);
        expect(summary.weekly.completionTokens).toEqual(15);
        expect(summary.weekly.totalTokens).toEqual(45);
        expect(summary.cumulative.turns).toEqual(3);
        expect(summary.cumulative.totalTokens).toEqual(105);
        expect(summary.cumulative.sessions).toEqual(2);
    }

    @Test('falls back to usage records when turn records are unavailable')
    fallbackToUsageRecords() {
        const summary = buildUsageSummary([
            { sessionId: 'session-1', createdAt: 10, promptTokens: 1, completionTokens: 2, totalTokens: 3 },
            { sessionId: 'session-1', createdAt: 20, promptTokens: 3, completionTokens: 4, totalTokens: 7 }
        ], undefined, 30);
        expect(summary.cumulative.turns).toEqual(2);
        expect(summary.cumulative.totalTokens).toEqual(10);
    }
}
