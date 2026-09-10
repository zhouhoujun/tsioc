/// <reference types="node" />
import { AgentModule, TypeOrmCommandExchangeStore, provideAgentOrm } from '@tsdi/agent';
import { Application } from '@tsdi/core';
import { writeFileSync } from 'fs';

/**
 * Child-process helper for the cross-process SQLite acceptance spec
 * (test/cross-process-sqlite.spec.ts). Runs as a real separate Node process
 * with ts-node + tsconfig-paths so it opens the SAME file-backed SQLite as the
 * parent, with its own fresh TypeOrmCommandExchangeStore (empty in-memory
 * seqCounters / byId / maxEpochs maps).
 *
 * Usage:
 *   node -r ts-node/register -r tsconfig-paths/register cross-process-sqlite.child.ts \
 *        <dbPath> <sessionId> <epoch> <mode> <resultFile>
 *
 * Modes:
 *   append  — open the file, append 3 records (ids xp-0..xp-2, given epoch),
 *             write { seqs: [0,1,2] } to resultFile.
 *   replay  — open the file, replay(sessionId, 1) and query(sessionId),
 *             write { seenSeqs, queryCount } to resultFile.
 */
async function main(): Promise<void> {
    const [dbPath, sessionId, epochRaw, mode, resultFile] = process.argv.slice(2);
    if (!dbPath || !sessionId || !epochRaw || !mode || !resultFile) {
        throw new Error('usage: cross-process-sqlite.child.ts <dbPath> <sessionId> <epoch> <append|replay> <resultFile>');
    }
    const epoch = Number(epochRaw);

    const context = await Application.run({
        module: AgentModule,
        providers: provideAgentOrm({
            type: 'sqljs' as any,
            location: dbPath,
            autoSave: true,
            autoLoadEntities: false as any,
            synchronize: true,
            entities: [] as any
        } as any)
    });
    try {
        const store = context.get(TypeOrmCommandExchangeStore);
        if (mode === 'append') {
            const seqs: number[] = [];
            for (let i = 0; i < 3; i++) {
                const saved = await store.append({
                    id: `xp-${i}`,
                    sessionId,
                    sessionEpoch: epoch,
                    kind: 'command',
                    key: 'bash',
                    content: `child-${i}`,
                    sequence: i,
                    timestamp: Date.now()
                });
                seqs.push(saved.seq);
            }
            writeFileSync(resultFile, JSON.stringify({ kind: 'append', seqs }));
        } else if (mode === 'replay') {
            const replayed = await store.replay(sessionId, 1);
            const page = await store.query(sessionId);
            writeFileSync(resultFile, JSON.stringify({
                kind: 'replay',
                seenSeqs: replayed.map((r) => r.seq),
                queryCount: page.records.length
            }));
        } else {
            throw new Error(`unknown mode: ${mode}`);
        }
    } finally {
        await context.close();
    }
}

main().then(
    () => process.exit(0),
    (err: unknown) => {
        const message = err instanceof Error ? err.stack || err.message : String(err);
        process.stderr.write(`CHILD-FAIL ${message}\n`);
        process.exit(1);
    }
);