import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter } from '@tsdi/common';
import { runExportCommand, parseExportArgs } from '../src/AgentConsoleExportHandlers';
import {
    createExportResult,
    serializeSessionExportHtml
} from '../src/AgentConsoleSessionExport';

@Suite('session HTML export')
export class SessionHtmlExportTest {
    @Test('parses the html format and an .html path')
    parse() {
        expect(parseExportArgs('html')).toEqual({ format: 'html' });
        expect(parseExportArgs('html report.html')).toEqual({ format: 'html', path: 'report.html' });
        expect(parseExportArgs('html s1 out/report.html')).toEqual({ format: 'html', sessionId: 's1', path: 'out/report.html' });
    }

    @Test('the artifact is standalone, inert and names the session')
    artifact() {
        const html = serializeSessionExportHtml(
            Date.UTC(2026, 10, 21, 8, 0, 0),
            { id: 's1', summary: 'Release <review>' },
            [
                { id: 'm1', role: 'user', content: 'ship <script>alert(1)</script>', createdAt: 1 } as any,
                {
                    id: 'm2',
                    role: 'assistant',
                    content: 'done & dusted',
                    createdAt: 2,
                    metadata: { toolCalls: [{ id: 't1', name: 'terminal' }] }
                } as any
            ],
            [{ id: 't1', name: 'terminal' }]
        );
        expect(html.startsWith('<!doctype html>')).toEqual(true);
        expect(html).toContain('Release &lt;review&gt;');
        expect(html).toContain('ship &lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('done &amp; dusted');
        expect(html).toContain('<span class="role">You</span>');
        expect(html).toContain('<span class="role">Assistant</span>');
        expect(html).toContain('<code>terminal</code>');
        // Model/tool text can never inject a live script tag.
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).not.toContain('<script src=');
    }

    @Test('createExportResult names and types the html file')
    result() {
        const result = createExportResult('s/1', 'html', Date.UTC(2026, 10, 21), { id: 's/1' }, [], []);
        expect(result.fileName.endsWith('.html')).toEqual(true);
        expect(result.contentType).toEqual('text/html; charset=utf-8');
        expect(result.content).toContain('<!doctype html>');
    }

    @Test('the command writes the HTML artifact to the requested path')
    async writes() {
        const notices: string[] = [];
        const writes: Array<{ path: string; content: string }> = [];
        const ctx: any = {
            translator: null,
            state: {
                sessionId: 's1',
                pendingAttachments: [],
                openSelectMenu: () => undefined,
                clearPendingAttachments: () => undefined,
                setPendingAttachments: () => undefined
            },
            sessionService: {
                exportSession: async (_id: string, options: { format: string }) => {
                    expect(options.format).toEqual('html');
                    return createExportResult('s1', 'html', 1234, { id: 's1', messageCount: 1 }, [
                        { id: 'm1', role: 'user', content: '<b>hello</b>', createdAt: 1 } as any
                    ], []);
                }
            },
            app: {
                get: (token: any, fallback?: any) => token === FileAdapter
                    ? {
                        isAbsolute: () => true,
                        normalize: (value: string) => value,
                        resolve: (...parts: string[]) => parts.join('/'),
                        join: (...parts: string[]) => parts.join('/'),
                        mkdir: async () => undefined,
                        writeText: async (path: string, content: string) => { writes.push({ path, content }); }
                    }
                    : fallback
            },
            workspace: '/ws',
            notify: (message: string) => notices.push(message)
        };
        await runExportCommand(ctx, 'html /tmp/report.html');
        expect(writes.length).toEqual(1);
        expect(writes[0].path).toEqual('/tmp/report.html');
        expect(writes[0].content).toContain('&lt;b&gt;hello&lt;/b&gt;');
        expect(notices[notices.length - 1]).toContain('/tmp/report.html');
    }
}
