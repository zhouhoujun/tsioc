import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { WeaknessMiner, mineWeaknesses, normalizeErrorSignature, buildSuggestionHarnessProfilePatch } from '../src/harness/WeaknessMiner';
import { TurnDiagnosticsStore, TurnDiagnosticsRecord } from '../src/harness/TurnDiagnosticsStore';
import { AuditSink, AgentAuditRecord } from '../src/harness/AuditSink';
import { Application } from '@tsdi/core';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

function record(partial: Partial<TurnDiagnosticsRecord>): TurnDiagnosticsRecord {
    return {
        id: partial.id ?? `r-${Math.random().toString(36).slice(2)}`,
        sessionId: partial.sessionId ?? 's1',
        createdAt: partial.createdAt ?? Date.now(),
        emptyResponseRetryCount: 0,
        followUpRecoveryCount: 0,
        followUpContextRewritten: false,
        finalAssistantWasClarification: false,
        repeatedClarificationDetected: false,
        compactionCount: 0,
        totalTokenSavings: 0,
        evidence: partial.evidence,
        metadata: partial.metadata
    };
}

function audit(partial: Partial<AgentAuditRecord>): AgentAuditRecord {
    return {
        id: partial.id ?? `a-${Math.random().toString(36).slice(2)}`,
        sessionId: partial.sessionId ?? 's1',
        toolName: partial.toolName ?? 'terminal',
        toolCallId: partial.toolCallId ?? `tc-${Math.random().toString(36).slice(2)}`,
        status: partial.status ?? 'success',
        createdAt: partial.createdAt ?? Date.now(),
        error: partial.error,
        metadata: partial.metadata
    };
}

@Suite('WeaknessMiner (B3)')
export class WeaknessMinerTest {
    @Test('normalizes error signatures to stable codes')
    normalizeErrorSignatures() {
        expect(normalizeErrorSignature('Error: connect ECONNREFUSED 127.0.0.1:3000')).toEqual('ECONNREFUSED');
        expect(normalizeErrorSignature('Cannot find module /x (ERR_MODULE_NOT_FOUND)')).toEqual('ERR_MODULE_NOT_FOUND');
        expect(normalizeErrorSignature('permission denied')).toEqual('permission denied');
        expect(normalizeErrorSignature(undefined)).toEqual('(unknown error)');
        expect(normalizeErrorSignature('TypeError: x is not a function')).toEqual('typeerror: x is not a function');
    }

    @Test('clusters failed evidence entries into tool stats and signatures')
    mineClustersFailedEntries() {
        const now = Date.now();
        const report = mineWeaknesses([
            record({
                sessionId: 's1',
                createdAt: now,
                evidence: {
                    turnId: 't1', sessionId: 's1',
                    entries: [
                        { id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'terminal', status: 'error', error: 'connect ECONNREFUSED 127.0.0.1:80', exitCode: 1, createdAt: now },
                        { id: 'e2', turnId: 't1', sessionId: 's1', toolName: 'terminal', status: 'error', error: 'connect ECONNREFUSED 127.0.0.1:81', exitCode: 1, createdAt: now },
                        { id: 'e3', turnId: 't1', sessionId: 's1', toolName: 'web_search', status: 'success', createdAt: now },
                        { id: 'e4', turnId: 't1', sessionId: 's1', toolName: 'write_file', status: 'error', error: 'ENOENT: no such file', exitCode: 1, createdAt: now }
                    ],
                    successCount: 1, errorCount: 3, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: now
                }
            })
        ], []);

        expect(report.totalTurns).toEqual(1);
        expect(report.totalToolAttempts).toEqual(4);
        expect(report.failureTurnRate).toEqual(100);
        expect(report.topFailingTools.length).toEqual(2);
        expect(report.topFailingTools[0].toolName).toEqual('terminal');
        expect(report.topFailingTools[0].attempts).toEqual(2);
        expect(report.topFailingTools[0].failures).toEqual(2);
        expect(report.topFailingTools[0].failureRate).toEqual(100);

        const clusters = report.errorClusters;
        expect(clusters.length).toEqual(2);
        expect(clusters[0].signature).toEqual('ECONNREFUSED');
        expect(clusters[0].count).toEqual(2);
        expect(clusters[0].examples.length).toEqual(2);
        expect(clusters[0].toolNames).toEqual(['terminal']);
        expect(clusters[0].suggestedPolicy).toContain('networkAllowlist');
        expect(clusters[1].signature).toEqual('ENOENT');
    }

    @Test('suggests approval gating for high-failure shell tools')
    suggestApprovalForHighFailureShellTools() {
        const now = Date.now();
        const report = mineWeaknesses([
            record({
                sessionId: 's1',
                createdAt: now,
                evidence: {
                    turnId: 't1', sessionId: 's1',
                    entries: [
                        { id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'terminal', status: 'error', error: 'boom', exitCode: 1, createdAt: now },
                        { id: 'e2', turnId: 't1', sessionId: 's1', toolName: 'terminal', status: 'error', error: 'boom', exitCode: 1, createdAt: now }
                    ],
                    successCount: 0, errorCount: 2, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: now
                }
            })
        ], []);

        const suggestion = report.suggestions.find(s => s.kind === 'approval');
        expect(suggestion).toBeDefined();
        expect(suggestion!.toolName).toEqual('terminal');
        expect(suggestion!.message).toContain('requireApproval');
    }

    @Test('reports falsified distribution and verification suggestions')
    reportsFalsifiedDistribution() {
        const now = Date.now();
        const report = mineWeaknesses([
            record({
                sessionId: 's1',
                createdAt: now,
                evidence: {
                    turnId: 't1', sessionId: 's1',
                    entries: [
                        { id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'write_file', status: 'success', falsified: true, falsificationReason: 'no diff', createdAt: now },
                        { id: 'e2', turnId: 't1', sessionId: 's1', toolName: 'write_file', status: 'success', falsified: true, falsificationReason: 'no diff', createdAt: now },
                        { id: 'e3', turnId: 't1', sessionId: 's1', toolName: 'write_file', status: 'success', createdAt: now }
                    ],
                    successCount: 3, errorCount: 0, skippedCount: 0, falsifiedCount: 2, totalDurationMs: 0, createdAt: now
                }
            })
        ], []);

        expect(report.falsifiedDistribution).toEqual([{ toolName: 'write_file', falsifiedCount: 2, falsifiedRate: 66.7 }]);
        const suggestion = report.suggestions.find(s => s.kind === 'verification');
        expect(suggestion).toBeDefined();
        expect(suggestion!.toolName).toEqual('write_file');
        expect(suggestion!.message).toContain('verificationWriteTools');
    }

    @Test('empty input yields an empty report')
    emptyInputYieldsEmptyReport() {
        const report = mineWeaknesses([], []);
        expect(report.empty).toEqual(true);
        expect(report.totalTurns).toEqual(0);
        expect(report.totalToolAttempts).toEqual(0);
        expect(report.topFailingTools).toEqual([]);
        expect(report.errorClusters).toEqual([]);
        expect(report.suggestions).toEqual([]);
    }

    @Test('legacy records without evidence fall back to the audit sink')
    legacyRecordsFallBackToAudit() {
        const now = Date.now();
        const report = mineWeaknesses(
            [record({ sessionId: 's1', createdAt: now })],
            [
                audit({ sessionId: 's1', toolName: 'web_search', status: 'success', createdAt: now }),
                audit({ sessionId: 's1', toolName: 'web_search', status: 'error', error: 'ECONNREFUSED', createdAt: now })
            ]
        );

        expect(report.empty).toEqual(false);
        expect(report.totalToolAttempts).toEqual(2);
        expect(report.topFailingTools[0].toolName).toEqual('web_search');
        expect(report.topFailingTools[0].failureRate).toEqual(50);
        expect(report.errorClusters[0].signature).toEqual('ECONNREFUSED');
    }

    @Test('scope restricts mining to the given sessions')
    scopeRestrictsMiningToSessions() {
        const now = Date.now();
        const scoped = mineWeaknesses(
            [
                record({ sessionId: 's1', createdAt: now, evidence: { turnId: 't1', sessionId: 's1', entries: [{ id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'a', status: 'error', error: 'x', exitCode: 1, createdAt: now }], successCount: 0, errorCount: 1, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: now } }),
                record({ sessionId: 's2', createdAt: now, evidence: { turnId: 't2', sessionId: 's2', entries: [{ id: 'e2', turnId: 't2', sessionId: 's2', toolName: 'b', status: 'error', error: 'y', exitCode: 1, createdAt: now }], successCount: 0, errorCount: 1, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: now } })
            ],
            [],
            { sessionIds: ['s1'] }
        );

        expect(scoped.scopedSessionIds).toEqual(['s1']);
        expect(scoped.totalTurns).toEqual(1);
        expect(scoped.topFailingTools.length).toEqual(1);
        expect(scoped.topFailingTools[0].toolName).toEqual('a');
    }

    @Test('since filter excludes older records')
    sinceFilterExcludesOlderRecords() {
        const now = Date.now();
        const report = mineWeaknesses(
            [
                record({ sessionId: 's1', createdAt: now - 100_000, evidence: { turnId: 't1', sessionId: 's1', entries: [{ id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'a', status: 'error', error: 'old', exitCode: 1, createdAt: now - 100_000 }], successCount: 0, errorCount: 1, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: now - 100_000 } }),
                record({ sessionId: 's1', createdAt: now, evidence: { turnId: 't2', sessionId: 's1', entries: [{ id: 'e2', turnId: 't2', sessionId: 's1', toolName: 'b', status: 'success', createdAt: now }], successCount: 1, errorCount: 0, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: now } })
            ],
            [],
            { since: now - 10_000 }
        );

        expect(report.totalTurns).toEqual(1);
        expect(report.topFailingTools).toEqual([]);
    }

    @Test('WeaknessMiner service reads stores and scopes by sessions')
    async weaknessMinerServiceReadsStores() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        try {
            const store = ctx.get(TurnDiagnosticsStore);
            const sink = ctx.get(AuditSink);
            await store.append(record({ sessionId: 's1', evidence: { turnId: 't1', sessionId: 's1', entries: [{ id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'a', status: 'error', error: 'ECONNREFUSED', exitCode: 1, createdAt: Date.now() }], successCount: 0, errorCount: 1, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 0, createdAt: Date.now() } }));
            await sink.append(audit({ sessionId: 's1', toolName: 'a', status: 'error', error: 'ECONNREFUSED' }));

            const miner = new WeaknessMiner(store, sink);
            const all = await miner.mine();
            expect(all.totalTurns).toEqual(1);
            expect(all.topFailingTools[0].toolName).toEqual('a');

            const scoped = await miner.mine({ sessionIds: ['s-other'] });
            expect(scoped.totalTurns).toEqual(0);
            expect(scoped.empty).toEqual(true);
        } finally { await ctx.close(); }
    }
}

@Suite('Suggestion harness profile patch (P61)')
export class SuggestionHarnessProfilePatchTest {
    private suggestion(kind: 'approval' | 'sandbox' | 'verification' | 'tool', toolName?: string) {
        return { kind, toolName, message: `msg for ${kind}` } as any;
    }

    @Test('approval suggestions fold their tools into requireApproval on the default base')
    foldsApprovalSuggestionsIntoRequireApproval() {
        const patch = buildSuggestionHarnessProfilePatch([
            this.suggestion('approval', 'terminal'),
            this.suggestion('approval', 'shell.exec')
        ]);
        expect(patch.profile.requireApproval).toContain('terminal');
        expect(patch.profile.requireApproval).toContain('shell.exec');
        expect(patch.changes.some(line => line.startsWith('requireApproval:'))).toEqual(true);
    }

    @Test('tool suggestions also map to requireApproval as checkpoints')
    mapsToolSuggestionsToRequireApproval() {
        const patch = buildSuggestionHarnessProfilePatch([
            this.suggestion('tool', 'web_search')
        ]);
        expect(patch.profile.requireApproval).toContain('web_search');
    }

    @Test('sandbox suggestions tighten the mode to network-block')
    sandboxSuggestionTightensMode() {
        const patch = buildSuggestionHarnessProfilePatch([
            this.suggestion('sandbox')
        ]);
        expect(patch.profile.sandbox?.mode).toEqual('network-block');
        expect(patch.changes.some(line => line.startsWith('sandbox:'))).toEqual(true);
    }

    @Test('verification suggestions append tools to verificationWriteTools')
    verificationSuggestionAppendsWriteTools() {
        const patch = buildSuggestionHarnessProfilePatch([
            this.suggestion('verification', 'write_file')
        ]);
        expect(patch.profile.verificationWriteTools).toContain('write_file');
    }

    @Test('duplicate tools and existing rules are deduplicated')
    deduplicatesTools() {
        const base = {
            name: 'base',
            version: 1,
            requireApproval: ['terminal'],
            verificationWriteTools: ['write_file', 'edit_file'],
            granularCategories: ['sandbox']
        } as any;
        const patch = buildSuggestionHarnessProfilePatch([
            this.suggestion('approval', 'terminal'),
            this.suggestion('approval', 'terminal'),
            this.suggestion('verification', 'write_file')
        ], base);
        expect(patch.profile.requireApproval!.filter(rule => rule === 'terminal').length).toEqual(1);
        expect(patch.profile.verificationWriteTools!.filter(tool => tool === 'write_file').length).toEqual(1);
        expect(patch.changes.length).toEqual(0);
    }

    @Test('no suggestions leaves the base profile unchanged with an empty diff')
    noSuggestionsYieldsNoChanges() {
        const base = {
            name: 'custom',
            version: 1,
            maxRepairRounds: 3,
            granularCategories: []
        } as any;
        const patch = buildSuggestionHarnessProfilePatch([], base);
        expect(patch.profile.name).toEqual('custom');
        expect(patch.profile.maxRepairRounds).toEqual(3);
        expect(patch.changes).toEqual([]);
    }

    @Test('derived granular categories reflect the folded approval rules')
    derivesGranularCategoriesFromFoldedRules() {
        const patch = buildSuggestionHarnessProfilePatch([
            this.suggestion('approval', 'web_search'),
            this.suggestion('approval', 'terminal')
        ]);
        expect(patch.profile.granularCategories).toContain('network');
        expect(patch.profile.granularCategories).toContain('sandbox');
    }
}
