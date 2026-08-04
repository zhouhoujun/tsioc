import expect = require('expect');
import * as os from 'os';
import * as path from 'path';
import { promises as fs, readFileSync } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { WriteFileTool } from '../files/write-file.tool';
import { EditFileTool } from '../files/edit-file.tool';
import { ApplyPatchTool } from '../files/apply-patch.tool';
import { runFormatter } from '../files/formatter';

const FORMAT_MARKER = '// formatted by A7 test';

@Suite('Agent tools formatter')
export class FormatterTest {
    private async createFormatterScript(workspace: string): Promise<string> {
        const script = path.join(workspace, 'format.sh');
        const content = `#!/bin/sh\necho '${FORMAT_MARKER}' >> "$1"\n`;
        await fs.writeFile(script, content, 'utf8');
        await fs.chmod(script, 0o755);
        return script;
    }

    @Test('formatter runs when extension matches, content semantics preserved')
    async formatsOnMatchingExtension() {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-match-'));
        try {
            const script = await this.createFormatterScript(workspace);
            const tool = new WriteFileTool({
                file: { rootDir: workspace },
                format: { command: script, extensions: ['.ts'] }
            });
            const result = await tool.invoke({ path: 'src/a.ts', content: 'export const a = 1;' }, {} as any);
            expect(result.formatted).toBeTruthy();
            const content = readFileSync(path.join(workspace, 'src', 'a.ts'), 'utf8');
            expect(content).toContain('export const a = 1;');
            expect(content).toContain(FORMAT_MARKER);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('formatter is skipped when extension does not match')
    async skipsNonMatchingExtension() {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-skip-'));
        try {
            const script = await this.createFormatterScript(workspace);
            const tool = new WriteFileTool({
                file: { rootDir: workspace },
                format: { command: script, extensions: ['.ts'] }
            });
            const result = await tool.invoke({ path: 'src/a.txt', content: 'plain text' }, {} as any);
            expect(result.formatted).toBeUndefined();
            const content = readFileSync(path.join(workspace, 'src', 'a.txt'), 'utf8');
            expect(content).toBe('plain text');
            expect(content).not.toContain(FORMAT_MARKER);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('formatter failure falls back to warning without blocking the write')
    async failureFallsBack() {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-fail-'));
        try {
            const tool = new WriteFileTool({
                file: { rootDir: workspace },
                format: { command: 'definitely-not-a-real-formatter-command', extensions: ['.ts'] }
            });
            const result = await tool.invoke({ path: 'src/a.ts', content: 'export const a = 1;' }, {} as any);
            expect(result.formatted).toBeNull();
            expect(result.formatFailure).toBeTruthy();
            const content = readFileSync(path.join(workspace, 'src', 'a.ts'), 'utf8');
            expect(content).toBe('export const a = 1;');
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('edit_file runs the formatter after a successful replacement')
    async formatsAfterEdit() {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-edit-'));
        try {
            await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
            await fs.writeFile(path.join(workspace, 'src', 'b.ts'), 'export const b = 1;\n', 'utf8');
            const script = await this.createFormatterScript(workspace);
            const tool = new EditFileTool({
                file: { rootDir: workspace },
                format: { command: script, extensions: ['.ts'] }
            });
            const result = await tool.invoke({ path: 'src/b.ts', oldString: 'b = 1', newString: 'b = 2' }, {} as any);
            expect(result.formatted).toBeTruthy();
            const content = readFileSync(path.join(workspace, 'src', 'b.ts'), 'utf8');
            expect(content).toContain('export const b = 2;');
            expect(content).toContain(FORMAT_MARKER);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch runs the formatter on touched files with matching extensions')
    async formatsAfterPatch() {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-patch-'));
        try {
            await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
            await fs.writeFile(path.join(workspace, 'src', 'c.ts'), 'export const c = 1;\n', 'utf8');
            const script = await this.createFormatterScript(workspace);
            const tool = new ApplyPatchTool({
                file: { rootDir: workspace },
                format: { command: script, extensions: ['.ts'] }
            });
            const patch = [
                '*** Begin Patch',
                '*** Update File: src/c.ts',
                '@@',
                '-export const c = 1;',
                '+export const c = 2;',
                '*** End Patch'
            ].join('\n');
            const result = await tool.invoke({ patch }, {} as any);
            expect(result.formatted).toBeTruthy();
            expect(result.formatted.length).toBe(1);
            const content = readFileSync(path.join(workspace, 'src', 'c.ts'), 'utf8');
            expect(content).toContain('export const c = 2;');
            expect(content).toContain(FORMAT_MARKER);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('runFormatter does nothing when no formatter is configured')
    async noConfigIsNoop() {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-none-'));
        try {
            const result = await runFormatter(path.join(workspace, 'a.ts'), undefined);
            expect(result.attempted).toBe(false);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('settings discovery propagates tools.format into AgentToolsOptions')
    async settingsDiscoveryPropagatesFormat() {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fmt-settings-'));
        try {
            const settingsPath = path.join(root, 'settings.json');
            await fs.writeFile(settingsPath, JSON.stringify({
                tools: { format: { command: 'prettier', extensions: ['.ts', '.tsx'] } }
            }), 'utf8');
            const { resolveAgentToolDiscovery } = require('../src/settings');
            const resolved = resolveAgentToolDiscovery(root);
            expect(resolved.tools.format).toBeTruthy();
            expect(resolved.tools.format!.command).toBe('prettier');
            expect(resolved.tools.format!.extensions).toEqual(['.ts', '.tsx']);
        } finally {
            await fs.rm(root, { recursive: true, force: true });
        }
    }
}
