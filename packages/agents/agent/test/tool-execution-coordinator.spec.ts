import { Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { extractLspDiagnostics } from '../src/harness/ToolExecutionCoordinator';

@Suite('Tool execution coordinator LSP extraction')
export class ToolExecutionCoordinatorLspTest {

    @Test('extracts lspDiagnostics from write_file / edit_file style output')
    async extractsFlatDiagnostics() {
        const diagnostics = extractLspDiagnostics({
            ok: true,
            lspDiagnostics: [
                { message: 'Cannot find name "x"', severity: 1, code: 2304, startLine: 3 },
                { message: 'unused variable', severity: 2 }
            ]
        });

        expect(diagnostics).not.toBeUndefined();
        expect(diagnostics!.length).toEqual(2);
        expect(diagnostics![0].message).toEqual('Cannot find name "x"');
        expect(diagnostics![0].severity).toEqual(1);
        expect(diagnostics![0].code).toEqual(2304);
        expect(diagnostics![0].startLine).toEqual(3);
    }

    @Test('flattens apply_patch style { path, diagnostics } entries')
    async flattensApplyPatchShape() {
        const diagnostics = extractLspDiagnostics({
            ok: true,
            lspDiagnostics: [
                { path: '/w/a.ts', diagnostics: [{ message: 'Type error', severity: 1 }] },
                { path: '/w/b.ts', diagnostics: [{ message: 'warning here', severity: 2 }] }
            ]
        });

        expect(diagnostics!.length).toEqual(2);
        expect(diagnostics![0].path).toEqual('/w/a.ts');
        expect(diagnostics![0].message).toEqual('Type error');
        expect(diagnostics![1].path).toEqual('/w/b.ts');
        expect(diagnostics![1].message).toEqual('warning here');
    }

    @Test('returns undefined when output has no lspDiagnostics')
    async returnsUndefinedWithoutLspField() {
        expect(extractLspDiagnostics({ ok: true })).toBeUndefined();
        expect(extractLspDiagnostics('plain string')).toBeUndefined();
        expect(extractLspDiagnostics(null)).toBeUndefined();
        expect(extractLspDiagnostics(undefined)).toBeUndefined();
    }

    @Test('returns undefined when lspDiagnostics is an empty array')
    async returnsUndefinedForEmptyList() {
        const diagnostics = extractLspDiagnostics({ ok: true, lspDiagnostics: [] });
        expect(diagnostics).toBeUndefined();
    }

    @Test('skips malformed entries without a string message')
    async skipsMalformedEntries() {
        const diagnostics = extractLspDiagnostics({
            ok: true,
            lspDiagnostics: [
                { severity: 1 },
                'garbage',
                { message: 'valid one', severity: 1 }
            ]
        });

        expect(diagnostics!.length).toEqual(1);
        expect(diagnostics![0].message).toEqual('valid one');
    }
}
