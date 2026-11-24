import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { CompactionPrecompute } from '../src/context/CompactionPrecompute';
import { AgentContextManager } from '../src/context/AgentContextManager';

function message(id: string, role: 'user' | 'assistant', content = 'x'.repeat(200)): any {
    return { id, role, content, createdAt: 1 };
}

function summarizer(texts: string[]) {
    return {
        async summarize(messages: any[]): Promise<string> {
            texts.push(messages.map(item => item.id).join(','));
            return 'SUMMARY';
        }
    } as any;
}

@Suite('compaction precompute')
export class CompactionPrecomputeTest {
    @Test('exact cache hit reuses the scheduled summary')
    async exactHit() {
        const calls: string[] = [];
        const precompute = new CompactionPrecompute();
        const messages = [message('a', 'user'), message('b', 'assistant')];
        precompute.schedule(messages, summarizer(calls));
        const summary = await precompute.summary(messages, summarizer(calls));
        expect(summary).toEqual('SUMMARY');
        expect(calls).toEqual(['a,b']);
    }

    @Test('a cached prefix summarizes only the suffix and appends it')
    async prefixIncremental() {
        const calls: string[] = [];
        const precompute = new CompactionPrecompute();
        const base = [message('a', 'user'), message('b', 'assistant')];
        const extended = [...base, message('c', 'user'), message('d', 'assistant')];
        const active = summarizer(calls);
        precompute.schedule(base, active);
        const summary = await precompute.summary(extended, active);
        expect(summary).toEqual('SUMMARY\nSUMMARY');
        expect(calls).toEqual(['a,b', 'c,d']);
    }

    @Test('a mismatched cache falls back to a full summary')
    async mismatchFallback() {
        const calls: string[] = [];
        const precompute = new CompactionPrecompute();
        const active = summarizer(calls);
        precompute.schedule([message('a', 'user')], active);
        const summary = await precompute.summary([message('z', 'user')], active);
        expect(summary).toEqual('SUMMARY');
        expect(calls).toEqual(['a', 'z']);
    }

    @Test('a failed precompute still produces a full summary')
    async failedPrecompute() {
        const precompute = new CompactionPrecompute();
        precompute.schedule([message('a', 'user')], { summarize: async () => { throw new Error('boom'); } } as any);
        const summary = await precompute.summary([message('a', 'user')], summarizer([]));
        expect(summary).toEqual('SUMMARY');
    }

    @Test('the context manager consumes the scheduled summary when compacting')
    async managerIntegration() {
        const calls: string[] = [];
        const manager = new AgentContextManager().configure({
            maxHistoryTokens: 600,
            compactionMinTokens: 100,
            recentMessageWindow: 2
        } as any).setSummarizer(summarizer(calls) as any);
        const messages = [
            message('m1', 'user'), message('m2', 'assistant'),
            message('m3', 'user'), message('m4', 'assistant'),
            message('m5', 'user'), message('m6', 'assistant'),
            message('m7', 'user'), message('m8', 'assistant')
        ];
        manager.precomputeCompaction(messages);
        expect(calls.length).toEqual(1);
        const prepared = await manager.compactNow(messages);
        expect(calls.length).toEqual(1);
        expect(prepared.report.summaryInserted).toEqual(true);
        expect(prepared.messages.some(item => String(item.content).includes('SUMMARY'))).toEqual(true);
    }
}
