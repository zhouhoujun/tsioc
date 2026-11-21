import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter } from '@tsdi/common';
import { parseImportedSession, runImportCommand } from '../src/AgentConsoleSessionImport';

function buildContext(fileText: string | Error) {
    const notices: string[] = [];
    const imported: Array<{ messages: any[]; options: any }> = [];
    const opened: Array<string | undefined> = [];
    let refreshed = 0;
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
            exportSession: async () => { throw new Error('unused'); },
            importSession: async (messages: any[], options: any) => {
                imported.push({ messages, options });
                return { sessionId: 'chat-imported', messageCount: messages.length };
            }
        },
        app: {
            get: (token: any, fallback?: any) => token === FileAdapter
                ? {
                    isAbsolute: (value: string) => value.startsWith('/'),
                    normalize: (value: string) => value,
                    resolve: (...parts: string[]) => parts.join('/'),
                    join: (...parts: string[]) => parts.join('/'),
                    readText: async () => {
                        if (fileText instanceof Error) throw fileText;
                        return fileText;
                    }
                }
                : fallback
        },
        workspace: '/ws',
        notify: (message: string) => notices.push(message),
        refreshSessions: async () => { refreshed += 1; },
        openSession: async (id?: string) => { opened.push(id); }
    };
    return { ctx, notices, imported, opened, refreshed: () => refreshed };
}

/**
 * `/import` accepts both export shapes (json object / jsonl) and always creates
 * a new session instead of writing into the current one.
 */
@Suite('session import command')
export class SessionImportCommandTest {
    @Test('parses JSON and JSONL exports')
    parse() {
        expect(parseImportedSession(JSON.stringify({
            type: 'session_export',
            session: { title: 'T', summary: 'S' },
            messages: [{ role: 'user', content: 'hi' }]
        }))).toEqual({ messages: [{ role: 'user', content: 'hi' }], title: 'T', summary: 'S' });

        const jsonl = [
            JSON.stringify({ type: 'session', session: { summary: 'line summary' } }),
            JSON.stringify({ type: 'message', message: { role: 'user', content: 'a' } }),
            JSON.stringify({ type: 'message', message: { role: 'assistant', content: 'b' } })
        ].join('\n');
        expect(parseImportedSession(jsonl)).toEqual({
            messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }],
            title: undefined,
            summary: 'line summary'
        });
        expect(parseImportedSession('not json')).toBeUndefined();
        expect(parseImportedSession('{"messages":[]}')).toBeUndefined();
    }

    @Test('imports a file into a new session and opens it')
    async imports() {
        const { ctx, notices, imported, opened, refreshed } = buildContext(JSON.stringify({
            session: { title: 'Old chat', summary: 'Summary' },
            messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }]
        }));
        await runImportCommand(ctx, 'export.json');
        expect(imported.length).toEqual(1);
        expect(imported[0].messages.length).toEqual(2);
        expect(imported[0].options).toEqual({ title: 'Old chat', summary: 'Summary' });
        expect(refreshed()).toEqual(1);
        expect(opened).toEqual(['chat-imported']);
        expect(notices[notices.length - 1]).toContain('chat-imported');
    }

    @Test('missing path, unreadable file and empty exports stay actionable')
    async failures() {
        const noPath = buildContext('');
        await runImportCommand(noPath.ctx, '');
        expect(noPath.notices[noPath.notices.length - 1]).toContain('Usage: /import');

        const unreadable = buildContext(new Error('ENOENT: no such file'));
        await runImportCommand(unreadable.ctx, 'missing.json');
        expect(unreadable.notices[unreadable.notices.length - 1]).toContain('ENOENT');
        expect(unreadable.imported).toEqual([]);

        const empty = buildContext('{"messages":[]}');
        await runImportCommand(empty.ctx, 'empty.json');
        expect(empty.notices[empty.notices.length - 1]).toContain('No messages found');
        expect(empty.imported).toEqual([]);
    }
}
