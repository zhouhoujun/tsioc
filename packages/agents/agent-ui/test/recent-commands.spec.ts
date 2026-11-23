import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { restoreSettings } from '../src/AgentConsoleSettingsRuntime';
import { sanitizeRecentCommands } from '../src/AgentConsoleSettingsStore';

@Suite('palette recent commands persistence')
export class RecentCommandsPersistenceTest {
    @Test('sanitizes slash commands, dedupes and bounds the list')
    sanitize() {
        expect(sanitizeRecentCommands(undefined)).toEqual(undefined);
        expect(sanitizeRecentCommands(['/a', 'plain', '/a', '/b', '', 4])).toEqual(['/a', '/b']);
        const many = Array.from({ length: 15 }, (_v, index) => `/c${index}`);
        expect(sanitizeRecentCommands(many)!.length).toEqual(10);
        expect(sanitizeRecentCommands(many)![0]).toEqual('/c0');
    }

    @Test('restoring settings loads the persisted recents')
    async restore() {
        const self: any = {
            settingsStore: { load: async () => ({ recentCommands: ['/undo', '/help'] }) },
            resolveHistoryWorkspace: () => '/work/app',
            translator: null,
            state: {},
            options: { model: { explicitModel: true } },
            updateTerminalTitle: () => undefined
        };
        await restoreSettings(self);
        expect(self.state.recentCommands).toEqual(['/undo', '/help']);
    }
}
