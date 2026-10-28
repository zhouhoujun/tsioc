import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { applyPersistedModelProfile, applyPersistedPreferences } from '@tsdi/agent-ui';
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
                securityLevel: 'full',
                modelProfile: 'deepseek-fast'
            }));
            const options: any = {
                ui: {},
                model: {
                    model: 'gpt-6.1-sol',
                    profiles: { 'deepseek-fast': { provider: 'deepseek', model: 'deepseek-flash', baseUrl: 'https://api.deepseek.com' } }
                }
            };
            const persisted = readConsoleUiSettings(workspace);
            applyPersistedPreferences(options, persisted);
            applyPersistedModelProfile(options, persisted.modelProfile);
            expect(options.ui.personality).toEqual('terse');
            expect(options.ui.memoryInjection).toEqual(false);
            expect(options.model.reasoningEffort).toEqual('max');
            expect(options.model.defaultProfile).toEqual('deepseek-fast');
            expect(options.model.model).toEqual('deepseek-flash');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
