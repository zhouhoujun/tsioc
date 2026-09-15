import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    resolveTimelineToolCategory,
    resolveToolEventTarget,
    resolveToolEventSummary,
    buildToolEventDetail,
    presentTimelineToolEvent,
    formatTimelineEventLine,
    TimelineToolEventPresentation
} from '../src/AgentConsoleTimelineEventPresenter';

// ── Table-driven: resolveTimelineToolCategory ───────────────────────────────

@Suite('resolveTimelineToolCategory (P300)')
export class ResolveCategoryTest {

    @Test('read tools map to read category')
    testRead() {
        expect(resolveTimelineToolCategory('read_file')).toBe('read');
        expect(resolveTimelineToolCategory('read_file_lines')).toBe('read');
        expect(resolveTimelineToolCategory('read')).toBe('read');
        expect(resolveTimelineToolCategory('view')).toBe('read');
        expect(resolveTimelineToolCategory('get_file_contents')).toBe('read');
        expect(resolveTimelineToolCategory('list_dir')).toBe('read');
        expect(resolveTimelineToolCategory('glob')).toBe('read');
    }

    @Test('edit tools map to edit category')
    testEdit() {
        expect(resolveTimelineToolCategory('edit_file')).toBe('edit');
        expect(resolveTimelineToolCategory('apply_patch')).toBe('edit');
        expect(resolveTimelineToolCategory('replace_in_file')).toBe('edit');
    }

    @Test('write tools map to write category')
    testWrite() {
        expect(resolveTimelineToolCategory('write_file')).toBe('write');
        expect(resolveTimelineToolCategory('create_file')).toBe('write');
        expect(resolveTimelineToolCategory('new_file')).toBe('write');
        expect(resolveTimelineToolCategory('overwrite')).toBe('write');
    }

    @Test('search tools map to search category')
    testSearch() {
        expect(resolveTimelineToolCategory('search')).toBe('search');
        expect(resolveTimelineToolCategory('search_files')).toBe('search');
        expect(resolveTimelineToolCategory('grep')).toBe('search');
        expect(resolveTimelineToolCategory('find')).toBe('search');
        expect(resolveTimelineToolCategory('web_search')).toBe('search');
    }

    @Test('shell tools map to shell category')
    testShell() {
        expect(resolveTimelineToolCategory('shell')).toBe('shell');
        expect(resolveTimelineToolCategory('terminal')).toBe('shell');
        expect(resolveTimelineToolCategory('run_command')).toBe('shell');
        expect(resolveTimelineToolCategory('exec')).toBe('shell');
        expect(resolveTimelineToolCategory('bash')).toBe('shell');
        expect(resolveTimelineToolCategory('execute_command')).toBe('shell');
    }

    @Test('git tools map to git category')
    testGit() {
        expect(resolveTimelineToolCategory('git')).toBe('git');
        expect(resolveTimelineToolCategory('git_operations')).toBe('git');
        expect(resolveTimelineToolCategory('git_status')).toBe('git');
        expect(resolveTimelineToolCategory('git_diff')).toBe('git');
        expect(resolveTimelineToolCategory('git_commit')).toBe('git');
    }

    @Test('mcp tools map to mcp category')
    testMcp() {
        expect(resolveTimelineToolCategory('mcp')).toBe('mcp');
        expect(resolveTimelineToolCategory('mcp_call')).toBe('mcp');
        expect(resolveTimelineToolCategory('mcp_tool')).toBe('mcp');
        expect(resolveTimelineToolCategory('tool_call')).toBe('mcp');
    }

    @Test('background tools map to background category')
    testBackground() {
        expect(resolveTimelineToolCategory('background_task')).toBe('background');
        expect(resolveTimelineToolCategory('subagent')).toBe('background');
        expect(resolveTimelineToolCategory('subtask')).toBe('background');
    }

    @Test('prefix-based classification for unknown tool names')
    testPrefixFallback() {
        expect(resolveTimelineToolCategory('read_custom_thing')).toBe('read');
        expect(resolveTimelineToolCategory('git_push_origin')).toBe('git');
        expect(resolveTimelineToolCategory('shell_exec_custom')).toBe('shell');
        expect(resolveTimelineToolCategory('mcp_foo_bar')).toBe('mcp');
    }

    @Test('unknown tools fall back to generic')
    testGeneric() {
        expect(resolveTimelineToolCategory('custom_unknown_tool')).toBe('generic');
        expect(resolveTimelineToolCategory('weather')).toBe('generic');
        expect(resolveTimelineToolCategory('location')).toBe('generic');
        expect(resolveTimelineToolCategory('')).toBe('generic');
        expect(resolveTimelineToolCategory('foo_bar_baz')).toBe('generic');
    }
}

// ── Table-driven: resolveToolEventTarget ────────────────────────────────────

@Suite('resolveToolEventTarget (P300)')
export class ResolveTargetTest {

    @Test('extracts path from JSON input for read/edit/write')
    testReadPathExtraction() {
        expect(resolveToolEventTarget('{"path":"src/index.ts"}', 'read')).toBe('src/index.ts');
        expect(resolveToolEventTarget('{"file":"lib/main.ts"}', 'edit')).toBe('lib/main.ts');
        expect(resolveToolEventTarget('{"filePath":"/tmp/out.txt"}', 'write')).toBe('/tmp/out.txt');
        expect(resolveToolEventTarget('{"dir":"packages"}', 'read')).toBe('packages');
        expect(resolveToolEventTarget('{"directory":"dist"}', 'edit')).toBe('dist');
    }

    @Test('extracts paths array from JSON input')
    testPathsArray() {
        expect(resolveToolEventTarget('{"paths":["a.ts","b.ts"]}', 'read')).toBe('a.ts, b.ts');
    }

    @Test('extracts command from JSON input for shell category')
    testCommandExtraction() {
        expect(resolveToolEventTarget('{"command":"npm test"}', 'shell')).toBe('npm test');
        expect(resolveToolEventTarget('{"cmd":"ls -la"}', 'shell')).toBe('ls -la');
    }

    @Test('extracts pattern from JSON input for search')
    testSearchExtraction() {
        expect(resolveToolEventTarget('{"pattern":"TODO"}', 'search')).toBe('TODO');
        expect(resolveToolEventTarget('{"query":"find bugs"}', 'search')).toBe('find bugs');
    }

    @Test('falls back to label/name for generic tools')
    testGenericLabel() {
        expect(resolveToolEventTarget('{"label":"my tool"}', 'generic')).toBe('my tool');
        expect(resolveToolEventTarget('{"name":"helper"}', 'generic')).toBe('helper');
    }

    @Test('falls back to URL for any category')
    testUrlFallback() {
        expect(resolveToolEventTarget('{"url":"https://example.com"}', 'generic')).toBe('https://example.com');
    }

    @Test('plain string input returned as-is')
    testPlainString() {
        expect(resolveToolEventTarget('/tmp/demo.txt', 'read')).toBe('/tmp/demo.txt');
        expect(resolveToolEventTarget('npm test', 'shell')).toBe('npm test');
        expect(resolveToolEventTarget('TODO', 'search')).toBe('TODO');
    }

    @Test('empty or missing returns empty string')
    testEmpty() {
        expect(resolveToolEventTarget(undefined, 'read')).toBe('');
        expect(resolveToolEventTarget('', 'read')).toBe('');
        expect(resolveToolEventTarget('  ', 'read')).toBe('');
    }

    @Test('empty JSON object returns empty string')
    testEmptyJson() {
        expect(resolveToolEventTarget('{}', 'read')).toBe('');
    }
}

// ── Table-driven: resolveToolEventSummary ───────────────────────────────────

@Suite('resolveToolEventSummary (P300)')
export class ResolveSummaryTest {

    @Test('plain text output returned as-is when short')
    testShortOutput() {
        expect(resolveToolEventSummary('12 lines', undefined)).toBe('12 lines');
        expect(resolveToolEventSummary('ok', undefined)).toBe('ok');
    }

    @Test('long text is truncated to budget')
    testTruncation() {
        const long = 'x'.repeat(200);
        const result = resolveToolEventSummary(long, undefined);
        expect(result.length).toBeLessThan(long.length);
        expect(result).toContain('...');
    }

    @Test('error takes priority over output')
    testErrorPriority() {
        expect(resolveToolEventSummary('ok', 'permission denied')).toBe('permission denied');
    }

    @Test('JSON with summary field extracts it')
    testJsonSummaryField() {
        expect(resolveToolEventSummary('{"summary":"updated 3 files"}', undefined)).toBe('updated 3 files');
        expect(resolveToolEventSummary('{"result":"pass"}', undefined)).toBe('pass');
        expect(resolveToolEventSummary('{"message":"done"}', undefined)).toBe('done');
    }

    @Test('JSON without summary fields returns empty (raw in detail)')
    testJsonNoSummaryField() {
        expect(resolveToolEventSummary('{"path":"a.ts","truncated":false}', undefined)).toBe('');
        expect(resolveToolEventSummary('{"location":"Chengdu"}', undefined)).toBe('');
    }

    @Test('empty or whitespace returns empty')
    testEmpty() {
        expect(resolveToolEventSummary(undefined, undefined)).toBe('');
        expect(resolveToolEventSummary('', undefined)).toBe('');
        expect(resolveToolEventSummary('{}', undefined)).toBe('');
        expect(resolveToolEventSummary('[]', undefined)).toBe('');
    }

    @Test('no location or weather business hardcoding')
    testNoBusinessHardcoding() {
        // These used to be special-cased in summarizeToolEventDetail.
        // Now the presenter returns the raw JSON as-is (no special parsing).
        expect(resolveToolEventSummary('{"location":"Chengdu, Sichuan, CN","temperature":41.3}', undefined)).toBe('');
        expect(resolveToolEventSummary('{"label":"Beijing"}', undefined)).toBe('Beijing');
    }
}

// ── Table-driven: buildToolEventDetail ──────────────────────────────────────

@Suite('buildToolEventDetail (P300)')
export class BuildDetailTest {

    @Test('joins input, output, and error with newlines')
    testJoinsAll() {
        expect(buildToolEventDetail('input', 'output', 'err')).toBe('input\noutput\nerr');
    }

    @Test('skips empty fields')
    testSkipsEmpty() {
        expect(buildToolEventDetail('input', '', 'err')).toBe('input\nerr');
        expect(buildToolEventDetail(undefined, 'output', undefined)).toBe('output');
        expect(buildToolEventDetail(undefined, undefined, undefined)).toBe('');
    }

    @Test('preserves full raw content for inspector')
    testPreservesRaw() {
        const big = 'x'.repeat(500);
        expect(buildToolEventDetail(big, undefined, undefined)).toBe(big);
    }
}

// ── Table-driven: presentTimelineToolEvent ──────────────────────────────────

@Suite('presentTimelineToolEvent (P300)')
export class PresentTest {

    @Test('read_file invoked shows title + target, no summary')
    testReadInvoked() {
        const p = presentTimelineToolEvent({
            eventType: 'tool_invoked',
            toolName: 'read_file',
            inputSummary: '{"path":"src/index.ts"}',
            status: 'running',
        });
        expect(p.title).toBe('Read');
        expect(p.target).toBe('src/index.ts');
        expect(p.category).toBe('read');
        expect(p.summary).toBe('');
        expect(p.detail).toContain('src/index.ts');
    }

    @Test('read_file completed shows title + target + summary')
    testReadCompleted() {
        const p = presentTimelineToolEvent({
            eventType: 'tool_completed',
            toolName: 'read_file',
            inputSummary: '{"path":"src/index.ts"}',
            outputSummary: '120 lines',
            status: 'success',
        });
        expect(p.title).toBe('Read');
        expect(p.target).toBe('src/index.ts');
        expect(p.summary).toBe('120 lines');
    }

    @Test('shell invoked shows title + truncated command')
    testShellInvoked() {
        const p = presentTimelineToolEvent({
            eventType: 'tool_invoked',
            toolName: 'shell',
            inputSummary: '{"command":"npm test"}',
            status: 'running',
        });
        expect(p.title).toBe('Run');
        expect(p.target).toBe('npm test');
        expect(p.category).toBe('shell');
    }

    @Test('git tool shows stable Git title')
    testGit() {
        const p = presentTimelineToolEvent({
            eventType: 'tool_completed',
            toolName: 'git_operations',
            inputSummary: '{"command":"git status"}',
            outputSummary: 'On branch main',
            status: 'success',
        });
        expect(p.title).toBe('Git');
        expect(p.target).toBe('git status');
        expect(p.category).toBe('git');
    }

    @Test('failed tool shows error in summary')
    testFailed() {
        const p = presentTimelineToolEvent({
            eventType: 'tool_failed',
            toolName: 'shell',
            inputSummary: '{"command":"bad"}',
            error: 'command not found',
            status: 'error',
        });
        expect(p.title).toBe('Run');
        expect(p.summary).toBe('command not found');
    }

    @Test('unknown tool uses humanized title fallback')
    testGenericFallback() {
        const p = presentTimelineToolEvent({
            eventType: 'tool_invoked',
            toolName: 'weather',
            inputSummary: '{"location":"Chengdu"}',
            status: 'running',
        });
        expect(p.category).toBe('generic');
        expect(p.title).toBe('Weather');
        expect(p.target).toBe('Chengdu');
        // No business hardcoding — raw goes to detail, not summary
        expect(p.summary).toBe('');
    }

    @Test('background task event with taskId')
    testBackgroundTask() {
        const p = presentTimelineToolEvent({
            eventType: 'background_task_started',
            toolName: 'subagent',
            taskId: 'bg-42',
            status: 'running',
        });
        expect(p.category).toBe('background');
        expect(p.title).toBe('Background task');
    }

    @Test('plain string inputSummary used as target')
    testPlainInput() {
        const p = presentTimelineToolEvent({
            eventType: 'tool_invoked',
            toolName: 'read_file',
            inputSummary: '/tmp/demo.txt',
            status: 'running',
        });
        expect(p.target).toBe('/tmp/demo.txt');
    }

    @Test('no location or weather special-casing in presentation')
    testNoBusinessHardcoding() {
        const p = presentTimelineToolEvent({
            eventType: 'tool_completed',
            toolName: 'weather',
            inputSummary: '{"location":"Chengdu, Sichuan, CN","temperature":41.3}',
            outputSummary: '{"location":"Chengdu","temperature":41.3,"description":"Mainly clear"}',
            status: 'success',
        });
        // Summary must NOT be the old hardcoded "Chengdu, Sichuan, CN 41.3°C Mainly clear"
        expect(p.summary).not.toContain('°');
        expect(p.summary).not.toContain('Mainly clear');
        // Target uses generic field fallback
        expect(p.target).toBe('Chengdu, Sichuan, CN');
    }

    @Test('empty toolName with background_task_* event type falls back to background')
    testBackgroundEventType() {
        const p = presentTimelineToolEvent({
            eventType: 'background_task_started',
            taskId: 'bg-1',
        });
        expect(p.category).toBe('background');
        expect(p.title).toBe('Background task');
    }
}

// ── formatTimelineEventLine ─────────────────────────────────────────────────

@Suite('formatTimelineEventLine (P300)')
export class FormatLineTest {

    @Test('title + target = main line')
    testTitleTarget() {
        expect(formatTimelineEventLine({
            title: 'Read', target: 'src/index.ts', summary: '', detail: '', category: 'read'
        })).toBe('Read src/index.ts');
    }

    @Test('title + target + summary = main line with short result')
    testTitleTargetSummary() {
        expect(formatTimelineEventLine({
            title: 'Read', target: 'src/index.ts', summary: '120 lines', detail: '', category: 'read'
        })).toBe('Read src/index.ts · 120 lines');
    }

    @Test('title only when target is empty')
    testTitleOnly() {
        expect(formatTimelineEventLine({
            title: 'Background task', target: '', summary: '', detail: '', category: 'background'
        })).toBe('Background task');
    }

    @Test('no summary when empty')
    testNoSummary() {
        expect(formatTimelineEventLine({
            title: 'Git', target: 'status', summary: '', detail: '', category: 'git'
        })).toBe('Git status');
    }
}
