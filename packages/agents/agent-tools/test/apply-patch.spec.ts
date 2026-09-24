import { RandomUuidGenerator } from '@tsdi/core';
import expect = require('expect');
import * as os from 'os';
import * as path from 'path';
import { promises as fs, existsSync, readFileSync } from 'fs';
import { symlinkSync } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter } from '@tsdi/common';
import { DefaultAgentRuntime, EchoModelAdapter, FileSnapshotStore, LLMSessionSummarizer, LocalToolRegistry, defaultAgentOptions } from '@tsdi/agent';
import { TestMemoryStore, TestSessionStore, TestActivationStore } from './test-stores';
import { ApplyPatchTool } from '../files/apply-patch.tool';

class FsFileAdapter extends FileAdapter {
    isAbsolute(target: string): boolean {
        return path.isAbsolute(target);
    }
    normalize(target: string): string {
        return path.normalize(target);
    }
    join(...paths: string[]): string {
        return path.join(...paths);
    }
    resolve(...paths: string[]): string {
        return path.resolve(...paths);
    }
    extname(target: string): string {
        return path.extname(target);
    }
    existsSync(target: string): boolean {
        return existsSync(target);
    }
    read(): any {
        return null;
    }
    find(): Promise<any> {
        return Promise.resolve(null);
    }
    async readText(target: string): Promise<string> {
        return fs.readFile(target, 'utf8');
    }
    readTextSync(target: string): string {
        return readFileSync(target, 'utf8');
    }
    async readJSON(target: string): Promise<any> {
        return JSON.parse(await fs.readFile(target, 'utf8'));
    }
    readJSONSync(target: string): any {
        return JSON.parse(readFileSync(target, 'utf8'));
    }
    async writeText(target: string, content: string): Promise<void> {
        await fs.writeFile(target, content, 'utf8');
    }
    async mkdir(target: string): Promise<void> {
        await fs.mkdir(target, { recursive: true });
    }
    async remove(target: string): Promise<void> {
        await fs.rm(target, { force: true });
    }
}

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

@Suite('Agent tools apply_patch')
export class ApplyPatchToolTest {
    private async createWorkspace(): Promise<string> {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'apply-patch-'));
        await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
        await fs.writeFile(path.join(workspace, 'src', 'alpha.txt'), 'alpha\nbeta\ngamma\n', 'utf8');
        await fs.writeFile(path.join(workspace, 'src', 'beta.ts'), 'export const value = 1;\nconst beta = value + 1;\n', 'utf8');
        await fs.writeFile(path.join(workspace, 'src', 'dup.txt'), 'line1\nline2\nline1\nline2\n', 'utf8');
        return workspace;
    }

    @Test('apply_patch applies multiple hunks to one file in sequence')
    async appliesMultipleHunksToSingleFile() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            const result = await tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: src/alpha.txt',
                    '@@',
                    '-alpha',
                    '+ALPHA',
                    ' beta',
                    '*** Update File: src/alpha.txt',
                    '@@',
                    '-gamma',
                    '+GAMMA',
                    '*** End Patch'
                ].join('\n')
            }, {} as any);

            expect(result.ok).toEqual(true);
            expect(result.summary).toEqual('0 file(s) added, 2 updated, 0 deleted, 0 moved');
            const content = await fs.readFile(path.join(workspace, 'src', 'alpha.txt'), 'utf8');
            expect(content).toEqual('ALPHA\nbeta\nGAMMA\n');
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch adds files including nested directories')
    async addsFilesWithNestedDirectories() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            const result = await tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Add File: nested/deep/new.txt',
                    '+first line',
                    '+second line',
                    '*** End Patch'
                ].join('\n')
            }, {} as any);

            expect(result.ok).toEqual(true);
            expect(result.summary).toEqual('1 file(s) added, 0 updated, 0 deleted, 0 moved');
            const content = await fs.readFile(path.join(workspace, 'nested', 'deep', 'new.txt'), 'utf8');
            expect(content).toEqual('first line\nsecond line');
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch deletes files')
    async deletesFiles() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            const result = await tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Delete File: src/alpha.txt',
                    '*** End Patch'
                ].join('\n')
            }, {} as any);

            expect(result.ok).toEqual(true);
            expect(result.summary).toEqual('0 file(s) added, 0 updated, 1 deleted, 0 moved');
            await expect(fs.access(path.join(workspace, 'src', 'alpha.txt'))).rejects.toBeTruthy();
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch moves a file and updates its content')
    async movesFileWithContentUpdate() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            const result = await tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: src/beta.ts',
                    '*** Move to: src/moved.ts',
                    '@@',
                    '-export const value = 1;',
                    '+export const value = 2;',
                    '*** End Patch'
                ].join('\n')
            }, {} as any);

            expect(result.ok).toEqual(true);
            expect(result.summary).toEqual('0 file(s) added, 0 updated, 0 deleted, 1 moved');
            await expect(fs.access(path.join(workspace, 'src', 'beta.ts'))).rejects.toBeTruthy();
            const content = await fs.readFile(path.join(workspace, 'src', 'moved.ts'), 'utf8');
            expect(content).toEqual('export const value = 2;\nconst beta = value + 1;\n');
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch rejects a hunk whose context does not match')
    async rejectsNonMatchingContext() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            await expect(tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: src/alpha.txt',
                    '@@',
                    '-missing-line',
                    '+replacement',
                    '*** End Patch'
                ].join('\n')
            }, {} as any)).rejects.toThrow(/does not match the file content/);
            const content = await fs.readFile(path.join(workspace, 'src', 'alpha.txt'), 'utf8');
            expect(content).toEqual('alpha\nbeta\ngamma\n');
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch tolerates trailing-whitespace drift in context')
    async toleratesTrailingWhitespaceDrift() {
        const workspace = await this.createWorkspace();
        try {
            await fs.writeFile(path.join(workspace, 'src', 'ws.txt'), 'alpha\t\nbeta\n', 'utf8');
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            const result = await tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: src/ws.txt',
                    '@@',
                    '-alpha',
                    '+ALPHA',
                    ' beta',
                    '*** End Patch'
                ].join('\n')
            }, {} as any);

            expect(result.ok).toEqual(true);
            const content = await fs.readFile(path.join(workspace, 'src', 'ws.txt'), 'utf8');
            expect(content).toEqual('ALPHA\nbeta\n');
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch rejects a hunk whose context is not unique')
    async rejectsAmbiguousContext() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            await expect(tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: src/dup.txt',
                    '@@',
                    '-line1',
                    '+changed',
                    ' line2',
                    '*** End Patch'
                ].join('\n')
            }, {} as any)).rejects.toThrow(/matches 2 locations/);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch requires Begin and End markers')
    async requiresBeginAndEndMarkers() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            await expect(tool.invoke({
                patch: '*** Update File: src/alpha.txt\n@@\n-alpha\n+ALPHA\n'
            }, {} as any)).rejects.toThrow(/Begin Patch/);
            await expect(tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: src/alpha.txt',
                    '@@',
                    '-alpha',
                    '+ALPHA'
                ].join('\n')
            }, {} as any)).rejects.toThrow(/End Patch/);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch rejects adding an existing file')
    async rejectsAddingExistingFile() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            await expect(tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Add File: src/alpha.txt',
                    '+content',
                    '*** End Patch'
                ].join('\n')
            }, {} as any)).rejects.toThrow(/already exists/);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch rejects paths outside the workspace root')
    async rejectsOutsideWorkspace() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            await expect(tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Delete File: ../outside.txt',
                    '*** End Patch'
                ].join('\n')
            }, {} as any)).rejects.toThrow(/outside the allowed workspace root/);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch rejects paths resolved through a symlink')
    async rejectsSymlinkedPaths() {
        const workspace = await this.createWorkspace();
        const outside = path.join(os.tmpdir(), `apply-patch-outside-${Date.now()}`);
        try {
            await fs.writeFile(outside, 'secret\n', 'utf8');
            symlinkSync(outside, path.join(workspace, 'link.txt'));
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            await expect(tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: link.txt',
                    '@@',
                    '-secret',
                    '+exposed',
                    '*** End Patch'
                ].join('\n')
            }, {} as any)).rejects.toThrow(/symbolic link/);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
            await fs.rm(outside, { force: true });
        }
    }

    @Test('apply_patch is atomic when a later hunk fails')
    async isAtomicOnFailure() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            await expect(tool.invoke({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: src/alpha.txt',
                    '@@',
                    '-alpha',
                    '+ALPHA',
                    ' beta',
                    '*** Update File: src/dup.txt',
                    '@@',
                    '-line1',
                    '+changed',
                    ' line2',
                    '*** End Patch'
                ].join('\n')
            }, {} as any)).rejects.toThrow(/matches 2 locations/);
            const content = await fs.readFile(path.join(workspace, 'src', 'alpha.txt'), 'utf8');
            expect(content).toEqual('alpha\nbeta\ngamma\n');
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('apply_patch captures a multi-file snapshot for undo')
    async capturesMultiFileSnapshot() {
        const workspace = await this.createWorkspace();
        try {
            const tool = new ApplyPatchTool({ file: { rootDir: workspace } });
            const captured = await tool.captureFileSnapshot({
                patch: [
                    '*** Begin Patch',
                    '*** Update File: src/alpha.txt',
                    '@@',
                    '-alpha',
                    '+ALPHA',
                    ' beta',
                    '*** Add File: src/new.txt',
                    '+created',
                    '*** End Patch'
                ].join('\n')
            }, {} as any);

            expect(captured).toBeTruthy();
            if (!captured) {
                throw new Error('expected a captured snapshot');
            }
            expect(captured.filePath).toEqual(path.join(workspace, 'src', 'alpha.txt'));
            expect(captured.before).toEqual('alpha\nbeta\ngamma\n');
            const files = captured.files ?? [];
            expect(files.length).toEqual(2);
            expect(files[0].filePath).toEqual(path.join(workspace, 'src', 'alpha.txt'));
            expect(files[0].before).toEqual('alpha\nbeta\ngamma\n');
            expect(files[1].filePath).toEqual(path.join(workspace, 'src', 'new.txt'));
            expect(files[1].before).toEqual(null);
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('runtime undo and redo restore every file of a multi-file snapshot')
    async runtimeRestoresMultiFileSnapshot() {
        const workspace = await this.createWorkspace();
        try {
            const fileOne = path.join(workspace, 'one.txt');
            const fileTwo = path.join(workspace, 'two.txt');
            await fs.writeFile(fileOne, 'one', 'utf8');
            await fs.writeFile(fileTwo, 'two', 'utf8');
            const snapshotStore = new FileSnapshotStore();
            const runtime = new DefaultAgentRuntime(
                new EchoModelAdapter(),
                new LocalToolRegistry([], new TestMemoryStore(), new TestSessionStore(), new TestActivationStore()),
                new TestSessionStore(),
                new TestMemoryStore(),
                new LLMSessionSummarizer(new EchoModelAdapter() as any),
                defaultAgentOptions,
                new FakeApp() as any,
                new RandomUuidGenerator(),
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                snapshotStore,
                undefined,
                undefined,
                new FsFileAdapter() as any
            );

            snapshotStore.push('s1', {
                filePath: fileOne,
                before: 'one',
                after: null,
                timestamp: Date.now(),
                files: [
                    { filePath: fileOne, before: 'one' },
                    { filePath: fileTwo, before: 'two' }
                ]
            });
            await fs.rm(fileOne, { force: true });
            await fs.writeFile(fileTwo, 'TWO', 'utf8');

            const undone = await runtime.undoFileChange('s1');
            expect(undone.restored).toEqual('content');
            expect(await fs.readFile(fileOne, 'utf8')).toEqual('one');
            expect(await fs.readFile(fileTwo, 'utf8')).toEqual('two');

            await runtime.redoFileChange('s1');
            await expect(fs.access(fileOne)).rejects.toBeTruthy();
            await expect(fs.access(fileTwo)).rejects.toBeTruthy();
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }
    }

    @Test('file snapshot store accounts for multi-file snapshots in byte limits')
    async snapshotStoreCountsMultiFileBytes() {
        const store = new FileSnapshotStore(10, 100);
        store.push('s1', {
            filePath: '/a.txt',
            before: 'x'.repeat(40),
            after: null,
            timestamp: 1,
            files: [
                { filePath: '/a.txt', before: 'x'.repeat(40) },
                { filePath: '/b.txt', before: 'y'.repeat(70) }
            ]
        });
        expect(store.list('s1').length).toEqual(0);
        expect(store.listRedo('s1').length).toEqual(0);
    }
}
