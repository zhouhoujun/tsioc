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

    @Test('creates cli commands')
    createsCliCommands() {
        const cli = createAgentCli();
        expect(cli.commands.some(cmd => cmd.name() === 'run')).toBe(true);
        expect(cli.commands.some(cmd => cmd.name() === 'tools')).toBe(true);
        expect(cli.commands.some(cmd => cmd.name() === 'chat')).toBe(true);
        const run = cli.commands.find(cmd => cmd.name() === 'run');
        const tools = cli.commands.find(cmd => cmd.name() === 'tools');
        expect(run?.options.some(option => option.long === '--root')).toBe(true);
        expect(run?.options.some(option => option.long === '--workspace')).toBe(false);
        expect(run?.options.some(option => option.long === '--cwd')).toBe(false);
        expect(run?.options.some(option => option.long === '--tools-root')).toBe(false);
        expect(run?.options.some(option => option.long === '--skill-roots')).toBe(false);
        const list = tools?.commands.find(cmd => cmd.name() === 'list');
        expect(list?.options.some(option => option.long === '--root')).toBe(true);
        expect(list?.options.some(option => option.long === '--workspace')).toBe(false);
        expect(list?.options.some(option => option.long === '--tools-root')).toBe(false);
        expect(list?.options.some(option => option.long === '--skill-roots')).toBe(false);
    }

    @Test('runs prompt through echo model runtime')
    async runsPromptThroughEchoModelRuntime() {
        const root = await this.createRoot();
        const output = await runAgentPrompt('hello cli', { root, session: 'cli-1' });
        expect(output).toBe('Echo: hello cli');
    }

    @Test('accepts tool item names without treating them as groups')
    async acceptsToolItemNamesWithoutTreatingThemAsGroups() {
        const root = await this.createRoot();
        const resolved = resolveCliConfig({ root, tools: 'http_fetch' });
        expect((resolved.tools.registration?.items as any).http_fetch).toBe(true);
        expect((resolved.tools.registration?.groups as any).http_fetch).toBe(undefined);
        const output = await runAgentPrompt('hello item tool', { root, session: 'cli-2', tools: 'http_fetch' });
        expect(output).toBe('Echo: hello item tool');
    }
}
