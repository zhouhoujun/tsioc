import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter } from '@tsdi/common';
import { runExportCommand, tryWriteSessionExport } from '../src/AgentConsoleExportHandlers';

function buildCtx(adapter: any, notices: string[], previews: number[]) {
    return {
        translator: null,
        state: {
            sessionId: 's1',
            pendingAttachments: [],
            openSelectMenu: () => { previews.push(1); },
            clearPendingAttachments: () => undefined,
            setPendingAttachments: () => undefined
        },
        sessionService: {
            exportSession: async () => ({
                format: 'json',
                fileName: 's1.json',
                content: '{"type":"session_export"}',
                messages: [],
                toolCalls: [],
                session: { messageCount: 0, toolCallCount: 0 }
            })
        },
        app: { get: (token: any, fallback?: any) => token === FileAdapter ? adapter : fallback },
        workspace: '/ws',
        notify: (message: string) => { notices.push(message); }
    } as any;
}

function adapter(write: (path: string, content: string) => Promise<void>): any {
    return {
        isAbsolute: () => true,
        normalize: (value: string) => value,
        resolve: (...parts: string[]) => parts.join('/'),
        join: (...parts: string[]) => parts.join('/'),
        mkdir: async () => undefined,
        writeText: write
    };
}

/**
 * `/export json <path>` to an unwritable path used to fall back to the preview
 * with no error, so the user believed the file had been saved.
 */
@Suite('export write failures')
export class ExportWriteFailureTest {

    @Test('a failed write reports the path and the reason')
    async failedWriteIsReported() {
        const notices: string[] = [];
        const previews: number[] = [];
        const ctx = buildCtx(adapter(async () => { throw new Error('EACCES: permission denied'); }), notices, previews);
        let thrown: any = null;
        try {
            await runExportCommand(ctx, 'json /nope/out.json');
        } catch (error) {
            thrown = error;
        }
        expect(previews.length).toEqual(0);
        expect(String(thrown?.message)).toContain('/nope/out.json');
        expect(String(thrown?.message)).toContain('EACCES');
        // No preview is produced, so the message must not claim one; it should
        // tell the user how to fix the path instead.
        expect(String(thrown?.message)).not.toContain('preview');
        expect(String(thrown?.message)).toContain('writable path');
    }

    @Test('a successful write reports the target path')
    async successReportsPath() {
        const notices: string[] = [];
        const previews: number[] = [];
        const written: string[] = [];
        const ctx = buildCtx(adapter(async (path: string) => { written.push(path); }), notices, previews);
        await runExportCommand(ctx, 'json /tmp/out.json');
        expect(written).toEqual(['/tmp/out.json']);
        expect(notices.join(' ')).toContain('/tmp/out.json');
        expect(notices.join(' ')).not.toContain('Could not write');
        expect(previews.length).toEqual(0);
    }

    @Test('the write helper returns the error instead of swallowing it')
    async helperReturnsError() {
        const ctx = buildCtx(adapter(async () => { throw new Error('ENOSPC'); }), [], []);
        const outcome = await tryWriteSessionExport(ctx, { format: 'json', fileName: 's1.json', content: '{}', messages: [], toolCalls: [], session: {} } as any, '/nope/out.json');
        expect(outcome.path).toBeUndefined();
        expect(outcome.error).toContain('ENOSPC');
    }
}
