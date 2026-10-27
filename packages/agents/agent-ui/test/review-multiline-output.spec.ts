import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { COMMAND_HANDLERS } from '../src/AgentConsoleCommandHandlers';

function metaFor(command: string) {
    return { command, matches: [command] };
}

function createCtx(summary: string[], report: string[], stateOverrides: Record<string, any> = {}) {
    const notices: string[] = [];
    const outputs: Array<{ command: string; text: string }> = [];
    const ctx: any = {
        isTurnInProgress: () => false,
        notifyBusyState: () => undefined,
        notify: (message: string) => notices.push(message),
        pushCommandOutput: (command: string, text: string) => outputs.push({ command, text }),
        translator: null,
        state: {
            getReviewAnnotationSummary: () => summary,
            getReviewExportReport: () => report,
            reviewFileSections: [],
            reviewFileAnnotations: {},
            computeFileRiskScore: () => ({ score: 1, level: 'low' }),
            ...stateOverrides
        }
    };
    return { ctx, notices, outputs };
}

@Suite('/review multi-line output stays readable')
export class ReviewMultiLineOutputTest {

    @Test('/review summary is emitted as one block, not a series of single-line notices')
    async summaryIsOneBlock() {
        const { ctx, notices, outputs } = createCtx(
            ['File Annotations: 1 approved, 1 rejected', '  ✓ src/a.ts', '  ✗ src/b.ts'],
            []
        );
        await COMMAND_HANDLERS['/review'](ctx, 'summary', metaFor('/review'));
        expect(outputs).toEqual([]);
        expect(notices.length).toEqual(1);
        expect(notices[0].split('\n')).toEqual([
            'File Annotations: 1 approved, 1 rejected',
            '  ✓ src/a.ts',
            '  ✗ src/b.ts'
        ]);
    }

    @Test('/review export is emitted as one block so the report is not truncated')
    async exportIsOneBlock() {
        const { ctx, notices, outputs } = createCtx([], ['# Review Report', 'Task: t1', 'Status: completed']);
        await COMMAND_HANDLERS['/review'](ctx, 'export', metaFor('/review'));
        expect(outputs).toEqual([]);
        expect(notices.length).toEqual(1);
        expect(notices[0].split('\n').length).toEqual(3);
    }

    @Test('/review risk emits the whole table at once')
    async riskTableIsOneBlock() {
        const { ctx, notices } = createCtx([], [], {
            reviewFileSections: [
                { path: 'src/a.ts', additions: 3, deletions: 1 },
                { path: 'src/b.ts', additions: 0, deletions: 7 }
            ],
            computeFileRiskScore: (section: any) => ({ score: section.path.endsWith('a.ts') ? 4 : 9, level: section.path.endsWith('a.ts') ? 'medium' : 'high' })
        });
        await COMMAND_HANDLERS['/review'](ctx, 'risk', metaFor('/review'));
        expect(notices.length).toEqual(1);
        expect(notices[0]).toContain('src/a.ts');
        expect(notices[0]).toContain('src/b.ts');
    }

    @Test('review run list emits every run summary in one block')
    async runListIsOneBlock() {
        const { listReviewFindings } = require('../src/AgentConsoleReviewHandlers');
        const notices: string[] = [];
        const ctx: any = {
            translator: null,
            notify: (message: string) => notices.push(message),
            state: { sessionId: 'session-1' },
            appRpc: {
                request: async () => ({ runs: [
                    { id: 'run-1', base: 'main', files: [1, 2], findings: [1] },
                    { id: 'run-2', base: 'dev', files: [1], findings: [1, 2, 3] }
                ] })
            }
        };
        await listReviewFindings(ctx);
        expect(notices.length).toEqual(1);
        expect(notices[0]).toContain('run-1');
        expect(notices[0]).toContain('run-2');
    }

    @Test('review run findings emit every finding and suggestion in one block')
    async runFindingsAreOneBlock() {
        const { showReviewRun } = require('../src/AgentConsoleReviewHandlers');
        const notices: string[] = [];
        const ctx: any = {
            translator: null,
            notify: (message: string) => notices.push(message),
            state: { sessionId: 'session-1' },
            appRpc: {
                request: async () => ({ run: { base: 'main', findings: [
                    { category: 'bug', severity: 'high', anchor: { file: 'src/a.ts', line: 3 }, summary: 'first issue', suggestion: 'fix first' },
                    { category: 'style', severity: 'info', anchor: { file: 'src/b.ts' }, summary: 'second issue' }
                ] } })
            }
        };
        await showReviewRun(ctx, 'run-1');
        expect(notices.length).toEqual(1);
        expect(notices[0]).toContain('src/a.ts');
        expect(notices[0]).toContain('fix first');
        expect(notices[0]).toContain('src/b.ts');
    }
}
