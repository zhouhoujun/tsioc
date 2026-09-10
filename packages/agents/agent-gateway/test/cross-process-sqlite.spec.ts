/// <reference types="node" />
import { AgentModule, CommandExchangeStaleError, TypeOrmCommandExchangeStore, provideAgentOrm } from '@tsdi/agent';
import { Application } from '@tsdi/core';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';

const CHILD_SCRIPT = join(__dirname, 'cross-process-sqlite.child.ts');

interface ChildResult {
    kind: string;
    seqs?: number[];
    seenSeqs?: number[];
    queryCount?: number;
    error?: string;
}

/**
 * v19-B await item: 跨进程 SQLite append→query→replay 验收.
 *
 * Proves the durable command-exchange store stays consistent ACROSS real
 * process boundaries (gateway restart / reconnect replay idempotency):
 *  - records appended in child process A are visible to a fresh store in
 *    process B (and vice versa) via replay/query;
 *  - the per-session seq counter re-seeds from the SQLite file instead of
 *    restarting at 0 or colliding (append in B continues the monotonic series);
 *  - re-appending an existing record id from a different process is
 *    idempotent (returns the stored row, no duplicate);
 *  - stale sessionEpoch appends are rejected in a fresh process because
 *    maxEpochs re-seeds from the file;
 *  - cleanup in one process is durable and visible to the next process.
 */
@Suite('Gateway 跨进程 SQLite append→query→replay 验收 (v19-B)')
export class CrossProcessSqliteTest {
    private root!: string;
    private dbPath!: string;
    private sessionId = 'xp-session';

    protected spawnChild(mode: string, epoch: number, resultFile: string): ChildResult {
        const child = resolve(CHILD_SCRIPT);
        const res = spawnSync(process.execPath, [
            '-r', 'ts-node/register',
            '-r', 'tsconfig-paths/register',
            child, this.dbPath, this.sessionId, String(epoch), mode, resultFile
        ], { cwd: resolve(__dirname, '..'), encoding: 'utf8', timeout: 120000 });
        if (res.status !== 0) {
            throw new Error(`child ${mode} failed (exit ${res.status}): ${res.stderr || res.stdout}`);
        }
        if (!existsSync(resultFile)) {
            throw new Error(`child ${mode} did not write result file`);
        }
        return JSON.parse(readFileSync(resultFile, 'utf8'));
    }

    protected async openStore() {
        const context = await Application.run({
            module: AgentModule,
            providers: provideAgentOrm({
                type: 'sqljs' as any,
                location: this.dbPath,
                autoSave: true,
                autoLoadEntities: false as any,
                synchronize: true,
                entities: [] as any
            } as any)
        });
        const store = context.get(TypeOrmCommandExchangeStore);
        return { context, store };
    }

    private baseRecord(id: string, content: string, epoch: number, sequence: number) {
        return {
            id, sessionId: this.sessionId, sessionEpoch: epoch,
            kind: 'command', key: 'bash', content, sequence, timestamp: Date.now()
        };
    }

    @Test('append in child process A is queryable/replayable from a fresh store, with seq continuation, cross-process idempotency and stale rejection')
    async durabilityAcrossProcesses() {
        this.root = mkdtempSync(join(tmpdir(), 'tsioc-gateway-xproc-'));
        this.dbPath = join(this.root, 'agent.db');
        const resultA = join(this.root, 'child-a.json');
        const resultB = join(this.root, 'child-b.json');
        let parentA: { context: any; store: TypeOrmCommandExchangeStore } | undefined;
        let parentB: { context: any; store: TypeOrmCommandExchangeStore } | undefined;
        let childB: ChildResult | undefined;
        try {
            // Phase A: child process appends 3 records (epoch 7) to a file-backed SQLite.
            const childA = this.spawnChild('append', 7, resultA);
            expect(childA.error).toBeUndefined();
            expect(childA.seqs).toEqual([0, 1, 2]);

            // Phase B: a FRESH store in THIS process reads the same file.
            parentA = await this.openStore();
            const { store: storeA } = parentA;

            const replayA = await storeA.replay(this.sessionId, -1);
            expect(replayA.map((r) => r.seq)).toEqual([0, 1, 2]);
            expect(replayA.map((r) => r.content)).toEqual(['child-0', 'child-1', 'child-2']);

            // Seq continuation: the in-memory seq counter re-seeds from the file.
            const appended = await storeA.append(this.baseRecord('p-3', 'parent-0', 7, 3));
            expect(appended.seq).toBe(3);

            // Cross-process idempotency: re-append a record id written by child A.
            const dup = await storeA.append(this.baseRecord('xp-0', 'RE-APPENDED', 7, 99));
            expect(dup.seq).toBe(0);
            expect(dup.content).toBe('child-0');
            const afterDup = await storeA.query(this.sessionId);
            expect(afterDup.records.length).toBe(4);

            // Stale epoch rejection in a fresh process: maxEpochs re-seeds from file (=7).
            let staleRejected = false;
            try {
                await storeA.append(this.baseRecord('xp-stale', 'stale', 2, 5));
            } catch (err) {
                staleRejected = err instanceof CommandExchangeStaleError;
            }
            expect(staleRejected).toBe(true);

            // Query cursor walk must cover every record exactly once.
            const seen: number[] = [];
            let cursor: string | undefined;
            let guard = 0;
            do {
                const page = await storeA.query(this.sessionId, { limit: 2, ...(cursor ? { cursor } : {}) });
                seen.push(...page.records.map((r) => r.seq));
                cursor = page.nextCursor;
                guard++;
            } while (cursor && guard < 10);
            expect(seen).toEqual([0, 1, 2, 3]);
            expect(guard).toBe(2); // 4 records / limit 2 → 2 pages
            await parentA.context.close();
            parentA = undefined;

            // Phase C: a THIRD process (child B) opens the same file and must see the
            // parent's append too, with replay cursor semantics.
            childB = this.spawnChild('replay', 7, resultB);
            expect(childB.error).toBeUndefined();
            expect(childB.seenSeqs).toEqual([2, 3]);
            expect(childB.queryCount).toBe(4);

            // Phase D: cleanup durability — a fresh store in this process removes
            // seqs <= 2, and seq continuation re-seeds after the cleanup.
            parentB = await this.openStore();
            const { store: storeB } = parentB;
            const removed = await storeB.cleanup(this.sessionId, 2);
            expect(removed).toBe(3);
            const afterCleanup = await storeB.replay(this.sessionId, -1);
            expect(afterCleanup.map((r) => r.seq)).toEqual([3]);
            const next = await storeB.append(this.baseRecord('p-4', 'parent-cleanup', 7, 4));
            expect(next.seq).toBe(4);
            const finalReplay = await storeB.replay(this.sessionId, -1);
            expect(finalReplay.map((r) => r.seq)).toEqual([3, 4]);
        } finally {
            if (parentA) await parentA.context.close().catch(() => undefined);
            if (parentB) await parentB.context.close().catch(() => undefined);
            rmSync(this.root, { recursive: true, force: true });
        }
    }
}