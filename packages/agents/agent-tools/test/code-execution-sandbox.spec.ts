import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { LocalCodeExecutionAdapter } from '../code-execution/local-code-execution.adapter';
import { ExecuteCodeTool } from '../code-execution/execute-code.tool';

@Suite('execute_code sandbox')
export class CodeExecutionSandboxTest {
    @Test('the tool forwards the session sandbox mode to the adapter')
    async forwardsSandboxMode() {
        let seen: string | undefined;
        const tool = new ExecuteCodeTool({
            execute: async (request: any) => {
                seen = request.sandboxMode;
                return { stdout: '', stderr: '', exitCode: 0 };
            }
        } as any);
        await tool.invoke(
            { language: 'javascript', code: '1' },
            { sessionId: 's1', memory: {} as any, sandboxMode: 'workspace' } as any
        );
        expect(seen).toEqual('workspace');
    }

    @Test('workspace mode blocks writes outside the workspace')
    async workspaceBlocksEscape() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'execute-sandbox-'));
        const escaped = path.join(os.homedir(), `.tsdi-execute-escape-${Date.now()}`);
        try {
            const adapter = new LocalCodeExecutionAdapter({ file: { rootDir: workspace } } as any);
            const result = await adapter.execute({
                language: 'javascript',
                code: [
                    "const fs = require('fs');",
                    `try { fs.writeFileSync(${JSON.stringify(escaped)}, 'escaped'); console.log('wrote'); }`,
                    "catch (error) { console.log('blocked'); }"
                ].join('\n'),
                workspace,
                sandboxMode: 'workspace'
            } as any);
            expect(result.sandboxApplied).toEqual(true);
            expect(fs.existsSync(escaped)).toEqual(false);
            expect(result.stdout).toContain('blocked');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
            fs.rmSync(escaped, { force: true });
        }
    }

    @Test('workspace mode keeps normal node execution working')
    async workspaceAllowsWorkspaceCode() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'execute-sandbox-'));
        try {
            const adapter = new LocalCodeExecutionAdapter({ file: { rootDir: workspace } } as any);
            const result = await adapter.execute({
                language: 'javascript',
                code: "console.log('sandbox-ok')",
                workspace,
                sandboxMode: 'workspace'
            } as any);
            expect(result.exitCode).toEqual(0);
            expect(result.sandboxApplied).toEqual(true);
            expect(result.stdout).toContain('sandbox-ok');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('blocked environment secrets are not visible to execute_code')
    async blockedEnvIsHidden() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'execute-sandbox-'));
        const key = 'TSDI_EXECUTE_TEST_SECRET';
        const previous = process.env[key];
        process.env[key] = 'top-secret-value';
        try {
            const adapter = new LocalCodeExecutionAdapter({
                file: { rootDir: workspace },
                sandbox: { blockedEnv: [key] }
            } as any);
            const result = await adapter.execute({
                language: 'javascript',
                code: `console.log(String(process.env.${key}))`,
                workspace,
                sandboxMode: 'workspace'
            } as any);
            expect(result.stdout).toContain('undefined');
            expect(result.stdout).not.toContain('top-secret-value');
        } finally {
            if (previous === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = previous;
            }
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
