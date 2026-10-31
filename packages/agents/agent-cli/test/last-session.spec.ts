import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { resolveLastSessionId, resolveSessionOption } from '../src/last-session';

function workspaceWith(settings: Record<string, any> | null): string {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-last-session-'));
    if (settings) {
        fs.mkdirSync(path.join(workspace, '.tsdi-agent'), { recursive: true });
        fs.writeFileSync(path.join(workspace, '.tsdi-agent', 'settings.json'), JSON.stringify(settings));
    }
    return workspace;
}

@Suite('TUI startup session')
export class LastSessionTest {
    @Test('an explicit --session id wins over the recorded session')
    explicitWins() {
        const workspace = workspaceWith({ lastSessionId: 'chat-last', openSessionIds: ['chat-last'] });
        try {
            expect(resolveSessionOption('chat-explicit', workspace)).toEqual('chat-explicit');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a bare start restores the last active session and its tab set')
    bareStartRestoresLast() {
        const workspace = workspaceWith({ lastSessionId: 'chat-last', openSessionIds: ['chat-a', 'chat-last'] });
        try {
            expect(resolveSessionOption(undefined, workspace)).toEqual('chat-last');
            expect(resolveSessionOption(true, workspace)).toEqual('chat-last');
            expect(resolveLastSessionId(workspace)).toEqual('chat-last');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('falls back to the most recent recorded tab when lastSessionId is missing')
    openSetFallback() {
        const workspace = workspaceWith({ openSessionIds: ['chat-a', 'chat-b'] });
        try {
            expect(resolveSessionOption(undefined, workspace)).toEqual('chat-b');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('no record means a fresh session')
    noRecordStartsFresh() {
        const workspace = workspaceWith(null);
        try {
            expect(resolveSessionOption(undefined, workspace)).toBeUndefined();
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
