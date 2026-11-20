import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { applyConsoleUiSettings, readConsoleStore, readConsoleUiSettings, writeConsoleStore } from '../src/app-rpc/console-ui-settings';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

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

    @Test('persists the security level and yolo flag and rejects unknown levels')
    securityLevel() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const file = path.join(workspace, '.tsdi-agent', 'settings.json');
        try {
            const options: any = { workspace, ui: {} };
            const applied = applyConsoleUiSettings(options, { securityLevel: 'full', yoloMode: true });
            expect(applied.securityLevel).toEqual('full');
            expect(applied.yoloMode).toEqual(true);
            const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
            expect(stored.securityLevel).toEqual('full');
            expect(stored.yoloMode).toEqual(true);
            expect(readConsoleUiSettings(workspace)).toMatchObject({ securityLevel: 'full', yoloMode: true });

            applyConsoleUiSettings(options, { securityLevel: 'bogus' });
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).securityLevel).toEqual('full');
            expect(readConsoleUiSettings(workspace).securityLevel).toEqual('full');

            const thinking = applyConsoleUiSettings(options, { thinkingLevel: 'high' });
            expect(thinking.thinkingLevel).toEqual('high');
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).thinkingLevel).toEqual('high');
            expect(readConsoleUiSettings(workspace).thinkingLevel).toEqual('high');
            applyConsoleUiSettings(options, { thinkingLevel: 'ultra' });
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).thinkingLevel).toEqual('high');

            const profile = applyConsoleUiSettings(options, { modelProfile: 'deepseek-fast' });
            expect(profile.modelProfile).toEqual('deepseek-fast');
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).modelProfile).toEqual('deepseek-fast');
            expect(readConsoleUiSettings(workspace).modelProfile).toEqual('deepseek-fast');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('applies and persists the opt-in read-only shell scanner')
    readOnlyShell() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const file = path.join(workspace, '.tsdi-agent', 'settings.json');
        try {
            const options: any = { workspace, ui: {} };
            const applied = applyConsoleUiSettings(options, { readOnlyShell: true });
            expect(applied.readOnlyShell).toEqual(true);
            expect(options.policy.approval.readOnlyShell).toEqual(true);
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).readOnlyShell).toEqual(true);
            expect(readConsoleUiSettings(workspace).readOnlyShell).toEqual(true);

            applyConsoleUiSettings(options, { readOnlyShell: false });
            expect(options.policy.approval.readOnlyShell).toEqual(false);
            expect(readConsoleUiSettings(workspace).readOnlyShell).toEqual(false);

            // Non-boolean values are ignored, not coerced truthy.
            applyConsoleUiSettings(options, { readOnlyShell: 'yes' as any });
            expect(options.policy.approval.readOnlyShell).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('applies and persists the default agent profile')
    defaultArchetype() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const file = path.join(workspace, '.tsdi-agent', 'settings.json');
        try {
            const options: any = { workspace, ui: {} };
            const applied = applyConsoleUiSettings(options, { defaultArchetype: 'plan' });
            expect(applied.defaultArchetype).toEqual('plan');
            expect(options.policy.defaultArchetype).toEqual('plan');
            expect(options.defaultArchetype).toEqual('plan');
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).defaultArchetype).toEqual('plan');
            expect(readConsoleUiSettings(workspace).defaultArchetype).toEqual('plan');

            // Empty values are ignored instead of clearing silently.
            applyConsoleUiSettings(options, { defaultArchetype: '   ' });
            expect(readConsoleUiSettings(workspace).defaultArchetype).toEqual('plan');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('creates the settings file when the workspace has none yet')
    createsMissingFile() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const file = path.join(workspace, '.tsdi-agent', 'settings.json');
        try {
            const options: any = { workspace, ui: {} };
            applyConsoleUiSettings(options, { personality: 'terse', memoryInjection: false });
            expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ personality: 'terse', memoryInjection: false });
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('console stores are allowlisted and round-trip through the workspace')
    storeRoundTrip() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        try {
            writeConsoleStore(workspace, 'theme.json', { version: 1, theme: 'light' });
            expect(readConsoleStore(workspace, 'theme.json')).toEqual({ version: 1, theme: 'light' });
            writeConsoleStore(workspace, 'settings.json', { language: 'zh' });
            expect(readConsoleStore(workspace, 'settings.json')).toEqual({ language: 'zh' });
            expect(readConsoleStore(workspace, 'title.json')).toEqual(null);
            expect(() => readConsoleStore(workspace, 'missing.json')).toThrow();
            expect(() => writeConsoleStore(workspace, '../evil.json', {})).toThrow();
            expect(() => writeConsoleStore(workspace, 'theme.json', { big: 'x'.repeat(300 * 1024) })).toThrow();
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
            fs.writeFileSync(file, JSON.stringify({ personality: '  concise ', memoryInjection: false, thinkingLevel: 'max' }));
            expect(readConsoleUiSettings(workspace)).toMatchObject({ personality: 'concise', memoryInjection: false, thinkingLevel: 'max' });

            fs.writeFileSync(file, JSON.stringify({ personality: 42, memoryInjection: 'no', thinkingLevel: 'ultra' }));
            expect(readConsoleUiSettings(workspace)).toMatchObject({ personality: undefined, memoryInjection: undefined, thinkingLevel: undefined });
            expect(readConsoleUiSettings(path.join(workspace, 'missing'))).toEqual({});
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('persists the approval timeout for serve startup and clamps it')
    approvalTimeout() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const file = path.join(workspace, '.tsdi-agent', 'settings.json');
        const options: any = { workspace };
        try {
            expect(applyConsoleUiSettings(options, { approvalTimeoutMs: 45000 }).approvalTimeoutMs).toEqual(45000);
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).approvalTimeoutMs).toEqual(45000);
            expect(applyConsoleUiSettings(options, { approvalTimeoutMs: 1 }).approvalTimeoutMs).toEqual(1000);
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).approvalTimeoutMs).toEqual(1000);
            expect(applyConsoleUiSettings(options, { approvalTimeoutMs: 'nope' as any }).approvalTimeoutMs).toEqual(undefined);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('persists and restores the project approval allow rules')
    approvalAllowRules() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const file = path.join(workspace, '.tsdi-agent', 'settings.json');
        try {
            const options: any = { workspace, ui: {} };
            const applied = applyConsoleUiSettings(options, {
                approvalAllowRules: [' terminal ', 'terminal', 'write_file', '', 7 as any]
            });
            expect(applied.approvalAllowRules).toEqual(['terminal', 'write_file']);
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).approvalAllowRules).toEqual(['terminal', 'write_file']);
            expect(readConsoleUiSettings(workspace).approvalAllowRules).toEqual(['terminal', 'write_file']);

            applyConsoleUiSettings(options, { approvalAllowRules: [] });
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).approvalAllowRules).toEqual(undefined);
            expect(readConsoleUiSettings(workspace).approvalAllowRules).toEqual(undefined);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('settings.ui.set applies allow rules to the runtime approval manager')
    async dispatchAppliesRules() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-ui-settings-'));
        const applied: string[][] = [];
        try {
            const server = new AppRpcServer(
                { approvalManager: { setAllowRules: (rules: string[]) => { applied.push([...rules]); } } } as any,
                new RandomUuidGenerator(),
                { has: async () => true } as any,
                {} as any,
                {} as any,
                { authorize: async () => 'anonymous' } as any,
                { track: () => undefined } as any,
                {} as any,
                { workspace } as any
            );
            await (server as any).dispatch('settings.ui.set', { approvalAllowRules: ['terminal'] }, {});
            expect(applied).toEqual([['terminal']]);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
