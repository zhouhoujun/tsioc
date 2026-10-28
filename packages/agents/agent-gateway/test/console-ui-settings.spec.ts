import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { applyConsoleUiSettings, readConsoleUiSettings } from '../src/app-rpc/console-ui-settings';

@Suite('gateway console UI settings (web/attach runtime)')
export class ConsoleUiSettingsTest {
    @Test('applies personality/memory injection to the runtime options and persists them')
    appliesAndPersists() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const file = path.join(workspace, '.tsdi-agent', 'settings.json');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify({ language: 'zh', personality: 'friendly' }));
        const options: any = { workspace, ui: { theme: 'dark' } };
        try {
            expect(applyConsoleUiSettings(options, { personality: 'terse', memoryInjection: false }))
                .toEqual({ personality: 'terse', memoryInjection: false });
            expect(options.ui.personality).toEqual('terse');
            expect(options.ui.memoryInjection).toEqual(false);
            expect(options.ui.theme).toEqual('dark');

            const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
            expect(stored.personality).toEqual('terse');
            expect(stored.memoryInjection).toEqual(false);
            expect(stored.language).toEqual('zh');

            expect(applyConsoleUiSettings(options, { personality: null }).personality).toEqual(undefined);
            expect(options.ui.personality).toEqual(undefined);
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).personality).toEqual(undefined);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('reads persisted preferences for serve startup and ignores invalid values')
    reads() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const file = path.join(workspace, '.tsdi-agent', 'settings.json');
        try {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, JSON.stringify({ personality: '  concise ', memoryInjection: false }));
            expect(readConsoleUiSettings(workspace)).toEqual({ personality: 'concise', memoryInjection: false });

            fs.writeFileSync(file, JSON.stringify({ personality: 42, memoryInjection: 'no' }));
            expect(readConsoleUiSettings(workspace)).toEqual({ personality: undefined, memoryInjection: undefined });
            expect(readConsoleUiSettings(path.join(workspace, 'missing'))).toEqual({});
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
