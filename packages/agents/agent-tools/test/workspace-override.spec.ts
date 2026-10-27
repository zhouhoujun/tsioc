import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { mkdtempSync, rmSync, existsSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveFilePolicy } from '../files/path-policy';
import { WriteFileTool } from '../files/write-file.tool';
import { ListDirTool } from '../files/list-dir.tool';

/**
 * A console `/cd` makes the active workspace part of each invocation. Tools must
 * resolve their root from the invocation context, falling back to the configured
 * root only when the host does not provide one.
 */
@Suite('file tools honour the invocation workspace')
export class WorkspaceOverrideTest {

    @Test('resolveFilePolicy prefers the invocation workspace')
    async policyOverride() {
        const rootA = mkdtempSync(join(tmpdir(), 'tsdi-ws-a-'));
        const rootB = mkdtempSync(join(tmpdir(), 'tsdi-ws-b-'));
        try {
            expect(resolveFilePolicy({ file: { rootDir: rootA } } as any).rootDir).toEqual(rootA);
            expect(resolveFilePolicy({ file: { rootDir: rootA } } as any, rootB).rootDir).toEqual(rootB);
            expect(resolveFilePolicy({ file: { rootDir: rootA } } as any, '   ').rootDir).toEqual(rootA);
        } finally {
            rmSync(rootA, { recursive: true, force: true });
            rmSync(rootB, { recursive: true, force: true });
        }
    }

    @Test('write_file writes under the invocation workspace, not the configured root')
    async writeUsesInvocationWorkspace() {
        const rootA = mkdtempSync(join(tmpdir(), 'tsdi-ws-a-'));
        const rootB = mkdtempSync(join(tmpdir(), 'tsdi-ws-b-'));
        try {
            const tool = new WriteFileTool({ file: { rootDir: rootA } } as any);
            const context: any = { sessionId: 's1', memory: null, workspace: rootB };
            await tool.invoke({ path: 'probe.txt', content: 'hello' }, context);
            expect(existsSync(join(rootB, 'probe.txt'))).toEqual(true);
            expect(existsSync(join(rootA, 'probe.txt'))).toEqual(false);
        } finally {
            rmSync(rootA, { recursive: true, force: true });
            rmSync(rootB, { recursive: true, force: true });
        }
    }

    @Test('list_dir reads the invocation workspace')
    async listUsesInvocationWorkspace() {
        const rootA = mkdtempSync(join(tmpdir(), 'tsdi-ws-a-'));
        const rootB = mkdtempSync(join(tmpdir(), 'tsdi-ws-b-'));
        try {
            const tool = new WriteFileTool({ file: { rootDir: rootA } } as any);
            await tool.invoke({ path: 'only-b.txt', content: 'x' }, { sessionId: 's1', memory: null, workspace: rootB } as any);
            const lister = new ListDirTool({ file: { rootDir: rootA } } as any);
            const result: any = await lister.invoke({ path: '.' }, { sessionId: 's1', memory: null, workspace: rootB } as any);
            const names = JSON.stringify(result);
            expect(names).toContain('only-b.txt');
        } finally {
            rmSync(rootA, { recursive: true, force: true });
            rmSync(rootB, { recursive: true, force: true });
        }
    }
}
