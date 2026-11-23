import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { restoreSettings } from '../src/AgentConsoleSettingsRuntime';
import { sanitizeRecentCommands, sanitizeSessionApprovalRules } from '../src/AgentConsoleSettingsStore';

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

    @Test('sanitizes per-session approval overrides')
    sanitizeSessionRules() {
        expect(sanitizeSessionApprovalRules(undefined)).toEqual(undefined);
        expect(sanitizeSessionApprovalRules({ '': ['x'], a: 'nope' })).toEqual(undefined);
        expect(sanitizeSessionApprovalRules({
            a: ['terminal', { category: 'fs', action: 'deny' }, { bogus: true }],
            b: []
        })).toEqual({ a: ['terminal', { category: 'fs', action: 'deny' }] });
    }

    @Test('restoring settings loads per-session rules into state and the manager')
    async restoreSessionRules() {
        const applied: Array<{ sessionId: string; rules: any[] }> = [];
        const self: any = {
            settingsStore: { load: async () => ({
                sessionApprovalRules: { s1: [{ category: 'sandbox', action: 'allow' }] }
            }) },
            resolveHistoryWorkspace: () => '/work/app',
            resolvedApprovalManager: {
                setSessionRules: (sessionId: string, rules: any[]) => { applied.push({ sessionId, rules }); }
            },
            translator: null,
            state: {},
            options: { model: { explicitModel: true } },
            updateTerminalTitle: () => undefined
        };
        await restoreSettings(self);
        expect(self.state.sessionApprovalRules).toEqual({ s1: [{ category: 'sandbox', action: 'allow' }] });
        expect(applied).toEqual([{ sessionId: 's1', rules: [{ category: 'sandbox', action: 'allow' }] }]);
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
