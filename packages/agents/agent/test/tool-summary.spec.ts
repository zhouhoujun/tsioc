import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { summarizeToolDisplayText } from '../src';

@Suite('tool display summary')
export class ToolDisplaySummaryTest {
    @Test('glob_search match counts pluralize correctly')
    globSearchPluralizesMatches() {
        expect(summarizeToolDisplayText('glob_search', { matches: ['a.ts'] })).toContain('1 match');
        expect(summarizeToolDisplayText('glob_search', { matches: ['a.ts', 'b.ts'] })).toContain('2 matches');
        expect(summarizeToolDisplayText('glob_search', { matches: ['a.ts', 'b.ts'] })).not.toContain('matchs');
    }

    @Test('glob_search input shows the pattern, not the match count')
    globSearchInputShowsPattern() {
        const summary = summarizeToolDisplayText('glob_search', { pattern: '**/*.ts', matches: [] }, 'input');
        expect(summary).toEqual('**/*.ts');
        expect(summary).not.toContain('0 matches');
    }

    @Test('list_dir input shows the directory, not the entry count')
    listDirInputShowsDirectory() {
        expect(summarizeToolDisplayText('list_dir', { path: 'test', entries: [] }, 'input')).toEqual('test');
        expect(summarizeToolDisplayText('list_dir', { path: 'test', entries: [] }, 'input')).not.toContain('0 entries');
    }

    @Test('content_search input shows the query, not the searched directory')
    contentSearchInputShowsQuery() {
        // `path` used to win the generic preferred-key scan, so the timeline showed
        // the directory ("test") instead of what was actually searched for.
        expect(summarizeToolDisplayText('content_search', { path: 'test', query: 'scorePaper', regex: false }, 'input')).toEqual('scorePaper');
    }

    @Test('content_search output summarizes matches as path:line')
    contentSearchOutputSummarizesMatches() {
        const summary = summarizeToolDisplayText('content_search', {
            matches: [
                { path: 'src/cli.ts', line: 12, column: 1, preview: 'const token = argv[index];' },
                { path: 'src/cli.ts', line: 40, column: 3, preview: 'return token;' }
            ]
        });
        expect(summary).toContain('2 matches');
        expect(summary).toContain('src/cli.ts:12');
        expect(summary).not.toContain('field(s)');
        expect(summary).not.toContain('content_search');
    }

    @Test('terminal input shows the command only')
    terminalInputShowsCommand() {
        const summary = summarizeToolDisplayText('terminal', {
            command: "sed -n '1,120p' dist/src/cli.js",
            timeoutMs: 30000
        }, 'input');
        expect(summary).toContain('sed -n');
        expect(summary).not.toContain('timeoutMs');
        expect(summary).not.toContain('=');
    }

    @Test('terminal input collapses multi-line commands to one line')
    terminalInputCollapsesNewlines() {
        const summary = summarizeToolDisplayText('terminal', { command: 'npm test\n&& npm run build' }, 'input');
        expect(summary).toEqual('npm test && npm run build');
    }

    @Test('terminal output reports exit status and first line without the raw envelope')
    terminalOutputKeepsExitStatus() {
        const summary = summarizeToolDisplayText('terminal', {
            stdout: 'const token = argv[index];\nconst other = 1;\n',
            stderr: '',
            exitCode: 0,
            timedOut: false,
            cwd: '/workspace'
        });
        expect(summary).toEqual('exit 0 · const token = argv[index];');
        expect(summary).not.toContain('stdout=');
        expect(summary).not.toContain('\n');
    }

    @Test('terminal output prefers stderr and keeps a non-zero exit code')
    terminalOutputPrefersStderr() {
        const summary = summarizeToolDisplayText('terminal', {
            stdout: 'ignored output',
            stderr: 'ENOENT: no such file or directory',
            exitCode: 1,
            timedOut: false
        });
        expect(summary).toEqual('exit 1 · ENOENT: no such file or directory');
    }

    @Test('terminal output surfaces the assertion instead of a runtime stack frame')
    terminalOutputSurfacesAssertion() {
        const summary = summarizeToolDisplayText('terminal', {
            stdout: '',
            stderr: [
                'node:internal/modules/run_main:107',
                '    triggerUncaughtException(',
                '',
                'node:assert:152',
                '  throw new AssertionError(obj);',
                '  ^',
                '',
                'AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:',
                '',
                '1 !== 2',
                '',
                '    at [eval]:1:52',
                '    at node:internal/main/eval_string:71:3'
            ].join('\n'),
            exitCode: 1,
            timedOut: false
        });

        expect(summary).toContain('AssertionError');
        expect(summary).toContain('1 !== 2');
        expect(summary).not.toContain('node:internal');
        expect(summary).not.toContain('throw new AssertionError');
    }

    @Test('terminal output marks timeouts')
    terminalOutputMarksTimeout() {
        expect(summarizeToolDisplayText('terminal', { stdout: '', stderr: '', exitCode: 124, timedOut: true })).toEqual('timed out');
    }

    @Test('generic payloads never leak process plumbing keys')
    genericPayloadStripsEnvelopeKeys() {
        const summary = summarizeToolDisplayText('mystery_tool', {
            stdout: 'noise',
            stderr: 'noise',
            exitCode: 1,
            timeoutMs: 1000,
            goal: 'do the thing'
        });
        expect(summary).toEqual('do the thing');
    }

    @Test('summarizeValue collapses multiline strings')
    genericPayloadCollapsesMultilineValues() {
        const summary = summarizeToolDisplayText('mystery_tool', { note: 'first line\nsecond line' });
        expect(summary).toEqual('first line second line');
        expect(summary).not.toContain('\n');
    }
}
