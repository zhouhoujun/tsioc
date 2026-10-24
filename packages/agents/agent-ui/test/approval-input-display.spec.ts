import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { formatAgentConsoleApprovalInput } from '../src/AgentConsoleApprovalInput';
import { selectApprovalRequest } from '../src/AgentConsoleApprovalView';

/**
 * Real run finding: the approval panel dumped the serialized tool input —
 * `$ {"command":"…"}` — instead of the command the user was being asked to run.
 * The same raw JSON also appeared as `Input: {...}` in the multi-approval menu.
 */
@Suite('approval panel shows a human-readable command or path')
export class ApprovalInputDisplayTest {
    @Test('shell approvals show the command, not the JSON envelope')
    shellCommand() {
        expect(formatAgentConsoleApprovalInput('shell', '{"command":"npm test -- --runInBand"}'))
            .toEqual('$ npm test -- --runInBand');
        expect(formatAgentConsoleApprovalInput('run_command', '{"cmd":"ls -la"}'))
            .toEqual('$ ls -la');
        expect(formatAgentConsoleApprovalInput('terminal', '{"script":"bash scripts/agents-gate.sh"}'))
            .toEqual('$ bash scripts/agents-gate.sh');
    }

    @Test('file approvals show the path')
    filePath() {
        expect(formatAgentConsoleApprovalInput('read_file', '{"path":"packages/agents/agent-ui/src/index.ts"}'))
            .toEqual('packages/agents/agent-ui/src/index.ts');
        expect(formatAgentConsoleApprovalInput('write_file', '{"path":"todo.md","content":"long body"}'))
            .toEqual('todo.md');
        expect(formatAgentConsoleApprovalInput('list_dir', '{"directory":"packages/agents"}'))
            .toEqual('packages/agents');
    }

    @Test('search approvals show the query')
    searchQuery() {
        expect(formatAgentConsoleApprovalInput('content_search', '{"query":"approval inputSummary"}'))
            .toEqual('approval inputSummary');
        expect(formatAgentConsoleApprovalInput('glob_search', '{"pattern":"**/*.spec.ts"}'))
            .toEqual('**/*.spec.ts');
    }

    @Test('plain text and unknown payloads keep their original wording')
    fallbacks() {
        expect(formatAgentConsoleApprovalInput('shell', 'npm run build')).toEqual('$ npm run build');
        expect(formatAgentConsoleApprovalInput('some_tool', 'do the thing')).toEqual('do the thing');
        // No known field to extract: the original text is better than an empty row.
        expect(formatAgentConsoleApprovalInput('some_tool', '{"opaque":true}')).toEqual('{"opaque":true}');
        expect(formatAgentConsoleApprovalInput('shell', '   ')).toEqual('');
        expect(formatAgentConsoleApprovalInput('shell', undefined)).toEqual('');
    }

    @Test('multi-line payloads collapse to one row')
    multiline() {
        expect(formatAgentConsoleApprovalInput('shell', '{"command":"echo a\\necho b"}'))
            .toEqual('$ echo a echo b');
    }

    @Test('the multi-approval menu detail uses the human-readable value')
    async multiApprovalDetail() {
        let captured: any[] = [];
        await selectApprovalRequest(
            async (_title: string, options: any[]) => {
                captured = options;
                return options[0].value;
            },
            { consoleOptions: {} },
            [
                { id: '11111111-aaaa', toolName: 'shell', reason: 'write access', inputSummary: '{"command":"rm -rf build"}', timeoutMs: 1000 },
                { id: '22222222-bbbb', toolName: 'read_file', reason: 'read access', inputSummary: '{"path":"README.md"}', timeoutMs: 1000 }
            ]
        );
        expect(captured.length).toEqual(2);
        expect(captured[0].detail).toContain('$ rm -rf build');
        expect(captured[0].detail).not.toContain('{"command"');
        expect(captured[1].detail).toContain('README.md');
        expect(captured[1].detail).not.toContain('{"path"');
    }
}
