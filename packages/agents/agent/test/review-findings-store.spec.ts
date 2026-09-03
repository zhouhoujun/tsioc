import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ReviewFinding, ReviewFindingsStore, ReviewRun } from '../src/harness/ReviewFindingsStore';
import { AuditSink, AgentAuditRecord } from '../src/harness/AuditSink';
import { runAgentOrmApp } from './helpers/agent-orm';

function run(partial: Partial<ReviewRun>): ReviewRun {
    return {
        id: partial.id ?? `review-${Math.random().toString(36).slice(2)}`,
        sessionId: partial.sessionId ?? 's1',
        base: partial.base ?? 'HEAD',
        range: partial.range,
        paths: partial.paths,
        commitSha: partial.commitSha,
        files: partial.files ?? ['src/a.ts'],
        diffSummary: partial.diffSummary,
        createdAt: partial.createdAt ?? Date.now(),
        findings: partial.findings ?? []
    };
}

function finding(partial: Partial<ReviewFinding>): ReviewFinding {
    return {
        id: partial.id ?? `f-${Math.random().toString(36).slice(2)}`,
        category: partial.category ?? 'risk',
        severity: partial.severity ?? 'warning',
        summary: partial.summary ?? 'sample finding',
        detail: partial.detail,
        anchor: partial.anchor,
        suggestion: partial.suggestion
    };
}

@Suite('ReviewFindingsStore (P80)')
export class ReviewFindingsStoreTest {
    @Test('save appends a synthetic audit record with the run in metadata')
    async saveAppendsAuditRecord() {
        const ctx = await runAgentOrmApp();
        try {
            const audit = ctx.get(AuditSink);
            const store = new ReviewFindingsStore(audit);
            const runData = run({
                id: 'review-1',
                sessionId: 's1',
                base: 'HEAD',
                files: ['src/a.ts', 'src/b.ts'],
                commitSha: 'abc123',
                findings: [finding({ id: 'f1', category: 'correctness', severity: 'error', summary: 'null deref', anchor: { file: 'src/a.ts', line: 10 }, suggestion: 'guard with ?.' })]
            });
            const saved = await store.save(runData);
            expect(saved.id).toEqual('review-1');

            const records = await audit.list('s1');
            expect(records.length).toEqual(1);
            const record = records[0];
            expect(record.toolName).toEqual('review_diff');
            expect(record.toolCallId).toEqual('review:review-1');
            expect(record.status).toEqual('success');
            expect(record.id).toEqual('review-1');
            expect(record.inputSummary).toEqual('review HEAD: 2 files, 1 findings');
            expect(record.outputSummary).toEqual(runData.diffSummary);
            expect(record.metadata?.reviewRun?.id).toEqual('review-1');
            expect(record.metadata?.reviewRun?.findings[0].summary).toEqual('null deref');
        } finally { await ctx.close(); }
    }

    @Test('save requires an audit sink')
    async saveRequiresAuditSink() {
        const store = new ReviewFindingsStore(null);
        let rejected: Error | undefined;
        try {
            await store.save(run({}));
        } catch (err) {
            rejected = err as Error;
        }
        expect(rejected?.message).toContain('AuditSink');
    }

    @Test('list filters by session and commit and ignores other tool records')
    async listFiltersBySessionAndCommit() {
        const ctx = await runAgentOrmApp();
        try {
            const audit = ctx.get(AuditSink);
            const store = new ReviewFindingsStore(audit);
            await store.save(run({ id: 'r1', sessionId: 's1', commitSha: 'sha-1' }));
            await store.save(run({ id: 'r2', sessionId: 's1', commitSha: 'sha-2' }));
            await store.save(run({ id: 'r3', sessionId: 's2', commitSha: 'sha-1' }));
            await audit.append({
                id: 'other',
                sessionId: 's1',
                toolName: 'terminal',
                toolCallId: 'tc-other',
                status: 'success',
                createdAt: Date.now()
            } as AgentAuditRecord);

            const allS1 = await store.list('s1');
            expect(allS1.map(item => item.id).sort()).toEqual(['r1', 'r2']);

            const byCommit = await store.list('s1', 'sha-1');
            expect(byCommit.map(item => item.id)).toEqual(['r1']);

            const all = await store.list();
            expect(all.length).toEqual(3);
        } finally { await ctx.close(); }
    }

    @Test('get returns the run by id or null when missing')
    async getReturnsRunById() {
        const ctx = await runAgentOrmApp();
        try {
            const audit = ctx.get(AuditSink);
            const store = new ReviewFindingsStore(audit);
            await store.save(run({ id: 'r1', sessionId: 's1' }));

            const found = await store.get('r1');
            expect(found?.id).toEqual('r1');
            expect(await store.get('missing')).toBeNull();
            expect(await store.get('')).toBeNull();
        } finally { await ctx.close(); }
    }

    @Test('list deep-clones metadata so callers cannot mutate stored runs')
    async listDeepClonesMetadata() {
        const ctx = await runAgentOrmApp();
        try {
            const audit = ctx.get(AuditSink);
            const store = new ReviewFindingsStore(audit);
            await store.save(run({ id: 'r1', sessionId: 's1', findings: [finding({ id: 'f1', summary: 'original' })] }));

            const listed = await store.list('s1');
            const listedFinding = listed[0].findings[0];
            listedFinding.summary = 'mutated';

            const again = await store.list('s1');
            expect(again[0].findings[0].summary).toEqual('original');
        } finally { await ctx.close(); }
    }
}
