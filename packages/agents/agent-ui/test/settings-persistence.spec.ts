import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSettingsStore } from '../src/AgentConsoleSettingsStore';
import { persistSettings } from '../src/AgentConsoleSettingsRuntime';
import { TestFileAdapter } from './_helpers';

@Suite('console settings persistence')
export class SettingsPersistenceTest {
    @Test('overlapping saves are serialized so both patches survive')
    async serializesOverlappingSaves() {
        let saved: any = {};
        let active = 0;
        const store = {
            async load() {
                return { ...saved };
            },
            async save(_workspace: string, value: any) {
                active += 1;
                expect(active).toEqual(1);
                // Hold the write long enough for a concurrent caller to start.
                await new Promise<void>(resolve => setTimeout(resolve, 20));
                saved = { ...value };
                active -= 1;
            }
        };
        const self: any = {
            settingsStore: store,
            resolveHistoryWorkspace: () => '/ws'
        };
        await Promise.all([
            persistSettings(self, { touchMode: true }),
            persistSettings(self, { lastSessionId: 'session-1' })
        ]);
        expect(saved).toEqual({ touchMode: true, lastSessionId: 'session-1' });
    }

    @Test('concurrent saves keep a real settings file valid and complete')
    async concurrentSavesRealFile() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-settings-'));
        try {
            const adapter = new TestFileAdapter();
            const directory = path.join(workspace, '.tsdi-agent');
            const file = path.join(directory, 'settings.json');
            const store = new AgentConsoleSettingsStore(adapter, {
                dotDirectory: () => directory,
                storeFile: () => file
            } as any);
            const self: any = {
                settingsStore: store,
                resolveHistoryWorkspace: () => workspace
            };
            await Promise.all([
                persistSettings(self, { touchMode: true }),
                persistSettings(self, { lastSessionId: 'session-1' })
            ]);
            const raw = await adapter.readText(file);
            expect(JSON.parse(raw)).toEqual({ version: 2, touchMode: true, lastSessionId: 'session-1' });
            expect(raw.trim().endsWith('}')).toEqual(true);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('settings writes replace the file atomically when rename is available')
    async writesAtomically() {
        const calls: string[] = [];
        const adapter: any = {
            async mkdir() {},
            async writeText(path: string) {
                calls.push(`write:${path}`);
            },
            async rename(from: string, to: string) {
                calls.push(`rename:${from}->${to}`);
            },
            async remove() {}
        };
        const paths: any = {
            dotDirectory: () => '/ws/.tsdi-agent',
            storeFile: () => '/ws/.tsdi-agent/settings.json'
        };
        const store = new AgentConsoleSettingsStore(adapter, paths);
        await store.save('/ws', { touchMode: true });
        expect(calls).toEqual([
            'write:/ws/.tsdi-agent/settings.json.tmp',
            'rename:/ws/.tsdi-agent/settings.json.tmp->/ws/.tsdi-agent/settings.json'
        ]);
    }
}
