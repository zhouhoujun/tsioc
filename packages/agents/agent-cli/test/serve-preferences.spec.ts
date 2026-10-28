import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { applyPersistedPreferences } from '@tsdi/agent-ui';
import { readConsoleUiSettings } from '@tsdi/agent-gateway';

@Suite('serve console preferences')
export class ServePreferencesTest {
    @Test('serve boot applies personality, memory injection and thinking level from the workspace')
    appliesPreferences() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-serve-prefs-'));
        try {
            fs.mkdirSync(path.join(workspace, '.tsdi-agent'), { recursive: true });
            fs.writeFileSync(path.join(workspace, '.tsdi-agent', 'settings.json'), JSON.stringify({
                personality: 'terse',
                memoryInjection: false,
                thinkingLevel: 'max',
                securityLevel: 'full'
            }));
            const options: any = { ui: {}, model: { model: 'gpt-6.1-sol' } };
            applyPersistedPreferences(options, readConsoleUiSettings(workspace));
            expect(options.ui.personality).toEqual('terse');
            expect(options.ui.memoryInjection).toEqual(false);
            expect(options.model.reasoningEffort).toEqual('max');
            expect(options.model.model).toEqual('gpt-6.1-sol');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
