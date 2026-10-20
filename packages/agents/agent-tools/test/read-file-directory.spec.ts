import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ReadFileTool } from '../files/read-file.tool';

/**
 * A read_file call aimed at a directory leaked Node's raw `EISDIR` message,
 * which is not actionable for the model or the user (AGENTS.md §9).
 */
@Suite('read_file directory errors are actionable')
export class ReadFileDirectoryTest {
    @Test('reading a directory points at list_dir instead of EISDIR')
    async directoryIsActionable() {
        const root = mkdtempSync(join(tmpdir(), 'read-file-dir-'));
        try {
            mkdirSync(join(root, 'src'));
            const tool = new ReadFileTool({ file: { rootDir: root } } as any);
            let caught: any;
            try {
                await tool.invoke({ path: 'src' }, { sessionId: 's1' } as any);
            } catch (error) {
                caught = error;
            }
            expect(!!caught).toBe(true);
            expect(String(caught?.message)).toContain("Path 'src' is a directory");
            expect(String(caught?.message)).toContain('list_dir');
            expect(String(caught?.message)).not.toContain('EISDIR');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }
}
