import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { createAgentCli, resolveCliConfig, runAgentPrompt } from '../src';

@Suite('Agent CLI')
export class AgentCliTest {
    private async createRoot(): Promise<string> {
        return fs.promises.mkdtemp(path.join(os.tmpdir(), 'agent-cli-root-'));
    }

    @Test('resolves cli config for tools and channels')
    async resolvesCliConfig() {
        const root = await this.createRoot();
        const resolved = resolveCliConfig({
            root,
            session: 's1',
            tools: 'filesystem,http_fetch',
            channels: 'local,wechat',
            defaultTools: false,
            defaultChannels: false
        });
        expect(resolved.sessionId).toBe('s1');
        expect(resolved.workspace).toBe(path.resolve(root, 'workspace'));
        expect(resolved.tools.file?.rootDir).toBe(path.resolve(root, 'workspace'));
        expect(resolved.tools.registration?.preset).toBe('none');
        expect((resolved.tools.registration?.groups as any).filesystem).toBe(true);
        expect((resolved.tools.registration?.items as any).http_fetch).toBe(true);
        expect((resolved.tools.registration?.groups as any).http_fetch).toBe(undefined);
        expect(resolved.channels.registration?.preset).toBe('none');
        expect((resolved.channels.registration?.groups as any).local).toBe(true);
        expect((resolved.channels.registration?.items as any).wechat).toBe(true);
        expect((resolved.channels.registration?.groups as any).wechat).toBe(undefined);
        expect(resolved.channels.defaultChannel).toBe('local');
    }

    @Test('resolves workspace skill roots and tools root from settings as configuration only')
    async resolvesWorkspaceSkillRootsAndToolsRootFromSettingsAsConfigurationOnly() {
        const root = await this.createRoot();
        const settingsPath = path.join(root, 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify({
            session: 's-from-settings',
            workspace: 'custom-workspace',
            tools: {
                root: 'tools'
            },
            skills: {
                roots: ['skills', 'custom-skills']
            },
            channels: {
                values: ['local'],
                defaultEnabled: false
            }
        }), 'utf8');
        const resolved = resolveCliConfig({ root });
        expect(resolved.sessionId).toBe('s-from-settings');
        expect(resolved.root).toBe(path.resolve(root));
        expect(resolved.settingsPath).toBe(settingsPath);
        expect(resolved.workspace).toBe(path.resolve(root, 'custom-workspace'));
        expect(resolved.tools.file?.rootDir).toBe(path.resolve(root, 'custom-workspace', 'tools'));
        expect(resolved.tools.roots).toEqual([
            path.resolve(root, 'custom-workspace', 'tools')
        ]);
        expect(resolved.skillRoots).toEqual([
            path.resolve(root, 'custom-workspace', 'skills'),
            path.resolve(root, 'custom-workspace', 'custom-skills')
        ]);
        expect(resolved.channels.registration?.preset).toBe('none');
        expect(resolved.channels.defaultChannel).toBe('local');
    }

    @Test('defaults workspace to root workspace directory')
    async defaultsWorkspaceToRootWorkspaceDirectory() {
        const root = await this.createRoot();
        const resolved = resolveCliConfig({ root });
        expect(resolved.root).toBe(path.resolve(root));
        expect(resolved.settingsPath).toBe(path.resolve(root, 'settings.json'));
        expect(resolved.workspace).toBe(path.resolve(root, 'workspace'));
        expect(resolved.tools.file?.rootDir).toBe(path.resolve(root, 'workspace'));
    }

    @Test('creates cli commands with run and chat subcommands')
    createsCliCommands() {
        const cli = createAgentCli();
        const commandNames = cli.commands.map(cmd => cmd.name());
        expect(commandNames.includes('run')).toBe(true);
        expect(commandNames.includes('chat')).toBe(true);
        const hasToolsCmd = commandNames.some(name => name.startsWith('tools'));
        expect(hasToolsCmd).toBe(true);
    }

    @Test('rejects API call without configured key')
    async rejectsApiCallWithoutKey() {
        const root = await this.createRoot();
        try {
            await runAgentPrompt('test', { root, session: 'no-key' });
            expect(false).toBe(true);
        } catch (error: any) {
            expect(error.message).toContain('API key');
        }
    }

    @Test('accepts tool item names without treating them as groups')
    async acceptsToolItemNamesWithoutTreatingThemAsGroups() {
        const root = await this.createRoot();
        const resolved = resolveCliConfig({ root, tools: 'http_fetch' });
        expect((resolved.tools.registration?.items as any).http_fetch).toBe(true);
        expect((resolved.tools.registration?.groups as any).http_fetch).toBe(undefined);
    }

    @Test('workspace from CLI options overrides settings workspace')
    async workspaceFromCliOverridesSettings() {
        const root = await this.createRoot();
        const settingsPath = path.join(root, 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify({
            workspace: 'from-settings'
        }), 'utf8');
        const resolved = resolveCliConfig({ root, workspace: '/custom/workspace' });
        expect(resolved.workspace).toBe('/custom/workspace');
        expect(resolved.tools.file?.rootDir).toBe('/custom/workspace');
    }
}
