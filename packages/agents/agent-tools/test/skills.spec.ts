import expect = require('expect');
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { Suite, Test } from '@tsdi/unit';
import { RemoteSkillManager, RemoteSkillProcessRunner } from '../skills/remote-skill-manager';
import { AgentSkillDefinition } from '../skills/types';
import { AgentPluginManager } from '../skills/plugin-manager';
import { ActiveSkillsSection } from '../skills/ActiveSkillsSection';
import { SkillsCatalogSection } from '../skills/SkillsCatalogSection';
import { LocalSkillRegistry } from '../skills/LocalSkillRegistry';
import { SkillSessionStore } from '../skills/SkillSessionStore';

async function runGit(dir: string, args: string[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        execFile('git', args, { cwd: dir }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`git ${args.join(' ')} failed: ${stderr || error.message}`));
                return;
            }
            resolve(String(stdout || '').trim());
        });
    });
}

@Suite('AgentPluginManager')
export class AgentPluginManagerTest {
    @Test('discovers layered plugins with local precedence and aggregates contributions')
    async layeredDiscoveryAndContributions() {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugins-'));
        try {
            const remote = path.join(root, 'remote');
            const local = path.join(root, 'local');
            await this.writePlugin(remote, 'demo', '1.0.0', 'Remote body');
            await this.writePlugin(local, 'demo', '2.0.0', 'Local body', {
                mcpServers: [{ id: 'demo-mcp', command: 'demo' }],
                connectors: [{ id: 'demo-connector', type: 'http' }],
                hooks: { beforeTurn: { command: 'echo', args: ['plugin'] } },
                agentsDoc: 'AGENTS.md'
            });
            await fs.writeFile(path.join(local, 'demo', 'AGENTS.md'), '# Plugin instructions');
            const manager = new AgentPluginManager(fakeRunner({}));
            const plugins = manager.discover({ remote, local });
            const asyncPlugins = await manager.discoverAsync({ remote, local });
            expect(plugins.length).toEqual(1);
            expect(plugins[0].manifest.version).toEqual('2.0.0');
            expect(asyncPlugins.map(plugin => [plugin.id, plugin.manifest.version])).toEqual([['demo', '2.0.0']]);
            const contributions = manager.contributions(plugins);
            const asyncContributions = await manager.contributionsAsync(asyncPlugins);
            expect(contributions.skills.map(skill => skill.id)).toContain('demo-skill');
            expect(contributions.mcpServers.map(server => server.id)).toEqual(['demo-mcp']);
            expect(contributions.connectors[0].plugin).toEqual('demo');
            expect((contributions.hooks.beforeTurn as any[]).length).toEqual(1);
            expect(contributions.agentsDocs[0].path).toEqual(path.join(local, 'demo', 'AGENTS.md'));
            expect(asyncContributions.skills.map(skill => skill.id)).toEqual(contributions.skills.map(skill => skill.id));
            expect(asyncContributions.agentsDocs).toEqual(contributions.agentsDocs);
        } finally { await fs.rm(root, { recursive: true, force: true }); }
    }

    @Test('installs registry plugins and persists analytics')
    async registryInstallAndAnalytics() {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-install-'));
        try {
            const manager = new AgentPluginManager(fakeRunner({ name: 'Demo', version: '1.2.3', mcpServers: [{ id: 'm', command: 'm' }] }));
            const plugin = await manager.install({ id: 'demo', type: 'registry', url: 'https://example.test/plugin.json' }, root);
            expect(plugin.manifest.version).toEqual('1.2.3');
            manager.activate(plugin);
            manager.recordCall(plugin);
            const loaded = manager.discover({ remote: root })[0];
            expect(loaded.analytics).toEqual({ installs: 1, activations: 1, calls: 1 });
        } finally { await fs.rm(root, { recursive: true, force: true }); }
    }

    @Test('loads Agent Plugins 1.0 manifest skills mcp transports and client namespaces')
    async standardManifest() {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-standard-'));
        try {
            const plugin = path.join(root, 'portable');
            await fs.mkdir(path.join(plugin, 'skills', 'portable-skill'), { recursive: true });
            await fs.writeFile(path.join(plugin, 'skills', 'portable-skill', 'SKILL.md'), '---\nname: portable-skill\ndescription: Portable.\n---\nBody');
            await fs.writeFile(path.join(plugin, 'plugin.json'), JSON.stringify({
                name: 'Portable', version: '1.0.0', manifestVersion: '1.0.0', mcp: 'mcp.json',
                'com.openai.codex': { scope: 'workspace' }, 'com.example.simple': { enabled: true }
            }));
            await fs.writeFile(path.join(plugin, 'mcp.json'), JSON.stringify({ servers: {
                local: { transport: { type: 'stdio', command: 'demo', args: ['serve'], env: { PORT: 42 } } },
                remote: { transport: { type: 'streamable-http', url: 'https://example.test/mcp', headers: { Authorization: 'Bearer test' } } },
                legacy: { type: 'http+sse', url: 'https://example.test/sse' }
            } }));
            const manager = new AgentPluginManager(fakeRunner({}));
            const loaded = manager.discover({ local: root })[0];
            expect(loaded.standard).toEqual({ format: 'agentplugins', manifestVersion: '1.0.0', clientNamespaces: ['com.example.simple', 'com.openai.codex'], mcpConfig: 'mcp.json' });
            expect(loaded.manifest.clientExtensions?.['com.openai.codex']).toEqual({ scope: 'workspace' });
            const contributions = manager.contributions([loaded]);
            expect(contributions.skills.map(skill => skill.id)).toEqual(['portable-skill']);
            expect(contributions.mcpServers).toEqual([
                { id: 'local', command: 'demo', args: ['serve'], env: { PORT: '42' } },
                { id: 'remote', url: 'https://example.test/mcp', headers: { Authorization: 'Bearer test' } },
                { id: 'legacy', url: 'https://example.test/sse' }
            ]);
        } finally { await fs.rm(root, { recursive: true, force: true }); }
    }

    @Test('rolls back an invalid plugin manifest')
    async invalidManifestRollsBack() {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-invalid-'));
        try {
            const manager = new AgentPluginManager(fakeRunner({ name: 'Missing version' }));
            let error: Error | undefined;
            try { await manager.install({ id: 'bad', type: 'registry', url: 'https://example.test/plugin.json' }, root); } catch (err) { error = err as Error; }
            expect(error?.message).toContain('valid plugin.json');
            expect(await fs.stat(path.join(root, 'bad')).then(() => true).catch(() => false)).toEqual(false);
        } finally { await fs.rm(root, { recursive: true, force: true }); }
    }

    @Test('installs a standard registry plugin with its relative mcp config')
    async standardRegistryInstall() {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-standard-install-'));
        try {
            const requested: string[] = [];
            const runner: RemoteSkillProcessRunner = {
                run: async () => ({ code: 0, stdout: '', stderr: '' }),
                fetchText: async url => {
                    requested.push(url);
                    return url.endsWith('/mcp.json')
                        ? JSON.stringify({ mcpServers: { demo: { command: 'demo' } } })
                        : JSON.stringify({ name: 'Portable', version: '1.0.0', manifestVersion: '1.0.0', mcp: './mcp.json' });
                }
            };
            const manager = new AgentPluginManager(runner);
            const plugin = await manager.install({ id: 'portable', type: 'registry', url: 'https://example.test/plugins/plugin.json' }, root);
            expect(requested).toEqual(['https://example.test/plugins/plugin.json', 'https://example.test/plugins/mcp.json']);
            expect(plugin.standard.format).toEqual('agentplugins');
            expect(plugin.manifest.mcpServers).toEqual([{ id: 'demo', command: 'demo' }]);
        } finally { await fs.rm(root, { recursive: true, force: true }); }
    }

    private async writePlugin(root: string, id: string, version: string, body: string, extra: Record<string, any> = {}) {
        const plugin = path.join(root, id);
        await fs.mkdir(path.join(plugin, 'skills', 'demo-skill'), { recursive: true });
        await fs.writeFile(path.join(plugin, 'plugin.json'), JSON.stringify({ name: id, version, skills: ['skills'], ...extra }));
        await fs.writeFile(path.join(plugin, 'skills', 'demo-skill', 'SKILL.md'), `---\nname: demo-skill\ndescription: Plugin skill.\n---\n${body}`);
    }
}

@Suite('ActiveSkillsSection compaction')
export class ActiveSkillsSectionCompactionTest {
    @Test('uses summaries for remote skills only during compacted turns')
    async remoteSummaryDuringCompaction() {
        const registry = new LocalSkillRegistry([
            { id: 'remote', title: 'Remote', summary: 'Remote summary.', promptFull: 'REMOTE FULL', metadata: { source: 'remote' } },
            { id: 'local', title: 'Local', summary: 'Local summary.', promptFull: 'LOCAL FULL', metadata: { source: 'workspace' } }
        ]);
        const sessions = new SkillSessionStore();
        sessions.activate('s1', 'remote');
        sessions.activate('s1', 'local');
        const section = new ActiveSkillsSection(registry, sessions);

        const compacted = section.render({ sessionId: 's1', extra: { contextPreparation: { compactionTriggered: true } } } as any);
        expect(compacted).toContain('Remote summary.');
        expect(compacted).not.toContain('REMOTE FULL');
        expect(compacted).toContain('LOCAL FULL');

        const normal = section.render({ sessionId: 's1' } as any);
        expect(normal).toContain('REMOTE FULL');
    }
}

@Suite('ActiveSkillsSection skill token budget')
export class ActiveSkillsSectionTokenBudgetTest {
    @Test('compacts all skills to summary when maxChars is very small')
    compactAllWhenOverBudget() {
        const registry = new LocalSkillRegistry([
            { id: 'a', title: 'Skill A', summary: 'Summary A.', promptFull: 'FULL A BODY' },
            { id: 'b', title: 'Skill B', summary: 'Summary B.', promptFull: 'FULL B BODY' }
        ]);
        const sessions = new SkillSessionStore();
        sessions.activate('s1', 'a');
        sessions.activate('s1', 'b');
        const section = new ActiveSkillsSection(registry, sessions);

        const result = section.render({ sessionId: 's1', extra: { skillTokenBudget: { maxChars: 10 } } } as any);
        expect(result).toContain('Summary A.');
        expect(result).toContain('Summary B.');
        expect(result).not.toContain('FULL A BODY');
        expect(result).not.toContain('FULL B BODY');
    }

    @Test('keeps full prompt for first skill when budget allows')
    keepsFirstSkillFull() {
        const registry = new LocalSkillRegistry([
            { id: 'a', title: 'Skill A', summary: 'Summary A.', promptFull: 'FULL A' },
            { id: 'b', title: 'Skill B', summary: 'Summary B.', promptFull: 'FULL B' }
        ]);
        const sessions = new SkillSessionStore();
        sessions.activate('s1', 'a');
        sessions.activate('s1', 'b');
        const section = new ActiveSkillsSection(registry, sessions);

        const result = section.render({ sessionId: 's1', extra: { skillTokenBudget: { maxChars: 200 } } } as any);
        expect(result).toContain('FULL A');
        expect(result).toContain('FULL B');
    }

    @Test('respects compactActive=false to disable budget-based compaction')
    respectsCompactActiveFalse() {
        const registry = new LocalSkillRegistry([
            { id: 'a', title: 'Skill A', summary: 'Summary A.', promptFull: 'FULL A' },
            { id: 'b', title: 'Skill B', summary: 'Summary B.', promptFull: 'FULL B' }
        ]);
        const sessions = new SkillSessionStore();
        sessions.activate('s1', 'a');
        sessions.activate('s1', 'b');
        const section = new ActiveSkillsSection(registry, sessions);

        const result = section.render({ sessionId: 's1', extra: { skillTokenBudget: { maxChars: 10, compactActive: false } } } as any);
        expect(result).toContain('FULL A');
        expect(result).toContain('FULL B');
    }

    @Test('without budget config renders full prompts as before')
    noBudgetRendersFull() {
        const registry = new LocalSkillRegistry([
            { id: 'a', title: 'Skill A', summary: 'Summary A.', promptFull: 'FULL A' }
        ]);
        const sessions = new SkillSessionStore();
        sessions.activate('s1', 'a');
        const section = new ActiveSkillsSection(registry, sessions);

        const result = section.render({ sessionId: 's1' } as any);
        expect(result).toContain('FULL A');
    }
}

@Suite('SkillsCatalogSection skill token budget')
export class SkillsCatalogSectionTokenBudgetTest {
    @Test('truncates catalog when over budget')
    truncatesOverBudget() {
        const registry = new LocalSkillRegistry([
            { id: 'aaa', title: 'AAA', summary: 'First skill summary.' },
            { id: 'bbb', title: 'BBB', summary: 'Second skill summary.' },
            { id: 'ccc', title: 'CCC', summary: 'Third skill summary.' },
            { id: 'ddd', title: 'DDD', summary: 'Fourth skill summary.' }
        ]);
        const section = new SkillsCatalogSection(registry);

        const result = section.render({ extra: { skillTokenBudget: { maxChars: 80 } } } as any);
        expect(result).toContain('## Available Skills');
        expect(result).toContain('- aaa:');
        expect(result).toContain('...');
        expect(result).toContain('more');
        expect(result).not.toContain('- ddd:');
    }

    @Test('shows all skills when under budget')
    showsAllWhenUnderBudget() {
        const registry = new LocalSkillRegistry([
            { id: 'a', title: 'A', summary: 'Short.' },
            { id: 'b', title: 'B', summary: 'Short.' }
        ]);
        const section = new SkillsCatalogSection(registry);

        const result = section.render({ extra: { skillTokenBudget: { maxChars: 5000 } } } as any);
        expect(result).toContain('- a:');
        expect(result).toContain('- b:');
        expect(result).not.toContain('...');
    }

    @Test('respects truncateCatalog=false to disable catalog truncation')
    respectsTruncateCatalogFalse() {
        const registry = new LocalSkillRegistry([
            { id: 'aaa', title: 'AAA', summary: 'First skill summary.' },
            { id: 'bbb', title: 'BBB', summary: 'Second skill summary.' },
            { id: 'ccc', title: 'CCC', summary: 'Third skill summary.' },
            { id: 'ddd', title: 'DDD', summary: 'Fourth skill summary.' }
        ]);
        const section = new SkillsCatalogSection(registry);

        const result = section.render({ extra: { skillTokenBudget: { maxChars: 80, truncateCatalog: false } } } as any);
        expect(result).toContain('- aaa:');
        expect(result).toContain('- ddd:');
        expect(result).not.toContain('...');
    }

    @Test('without budget config renders full catalog as before')
    noBudgetRendersFull() {
        const registry = new LocalSkillRegistry([
            { id: 'a', title: 'A', summary: 'First.' },
            { id: 'b', title: 'B', summary: 'Second.' }
        ]);
        const section = new SkillsCatalogSection(registry);

        const result = section.render({} as any);
        expect(result).toContain('- a:');
        expect(result).toContain('- b:');
    }
}

async function createGitSkillRepo(root: string, skillName: string, content: string): Promise<string> {
    await fs.mkdir(path.join(root, skillName), { recursive: true });
    await fs.writeFile(
        path.join(root, skillName, 'SKILL.md'),
        `---\nname: ${skillName}\ndescription: Test skill from git source.\n---\n# ${skillName}\n\n${content}\n`,
        'utf8'
    );
    await runGit(root, ['init', '-q']);
    await runGit(root, ['config', 'user.email', 'test@example.com']);
    await runGit(root, ['config', 'user.name', 'Test']);
    await runGit(root, ['add', '.']);
    await runGit(root, ['commit', '-q', '-m', 'initial']);
    return runGit(root, ['rev-parse', '--short', 'HEAD']);
}

function fakeRunner(manifest: unknown): RemoteSkillProcessRunner {
    return {
        run: async () => ({ code: 0, stdout: '', stderr: '' }),
        fetchText: async () => JSON.stringify(manifest)
    };
}

@Suite('RemoteSkillManager')
export class RemoteSkillManagerTest {
    @Test('installs a git source and resolves the commit as version')
    async gitSourceInstallAndVersion() {
        const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-git-src-'));
        const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-git-cache-'));
        try {
            const shortHash = await createGitSkillRepo(sourceRoot, 'git-demo', 'Use this to test remote skills.');
            const manager = new RemoteSkillManager();
            const installed = await manager.install(
                { id: 'git-demo', type: 'git', url: `file://${sourceRoot}` },
                cacheDir
            );
            expect(installed.id).toEqual('git-demo');
            expect(installed.type).toEqual('git');
            expect(installed.skillIds).toContain('git-demo');
            expect(installed.version).toEqual(shortHash);
            expect(installed.installedAt).toBeGreaterThan(0);

            const listed = manager.list(cacheDir);
            expect(listed.length).toEqual(1);
            expect(listed[0].id).toEqual('git-demo');
            expect(listed[0].version).toEqual(shortHash);
        } finally {
            await fs.rm(sourceRoot, { recursive: true, force: true });
            await fs.rm(cacheDir, { recursive: true, force: true });
        }
    }

    @Test('detects conflicts against already-registered skill ids')
    async gitSourceConflictDetection() {
        const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-git-src-'));
        const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-git-cache-'));
        try {
            await createGitSkillRepo(sourceRoot, 'shared-skill', 'Shared skill body.');
            const manager = new RemoteSkillManager();
            const existing: AgentSkillDefinition[] = [{
                id: 'shared-skill',
                title: 'Shared Skill',
                summary: 'Already registered locally.',
                promptFull: '# Shared Skill\nExisting body.'
            }];
            let error: Error | undefined;
            try {
                await manager.install(
                    { id: 'remote-shared', type: 'git', url: `file://${sourceRoot}` },
                    cacheDir,
                    existing
                );
            } catch (err) {
                error = err as Error;
            }
            expect(error).toBeDefined();
            expect(error!.message).toContain('shared-skill');
            expect(manager.list(cacheDir).length).toEqual(0);

            const forced = await manager.install(
                { id: 'remote-shared', type: 'git', url: `file://${sourceRoot}` },
                cacheDir,
                existing,
                true
            );
            expect(forced.skillIds).toContain('shared-skill');
            expect(manager.list(cacheDir).length).toEqual(1);
        } finally {
            await fs.rm(sourceRoot, { recursive: true, force: true });
            await fs.rm(cacheDir, { recursive: true, force: true });
        }
    }

    @Test('materializes registry manifest skills with version tracking')
    async registrySourceInstallAndUpdate() {
        const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-reg-cache-'));
        try {
            const manifestV1 = {
                version: '1.2.3',
                skills: [
                    { name: 'reg-skill', description: 'From registry v1.', aliases: ['rs'], prompt: '# Reg Skill\nRegistry body.' }
                ]
            };
            const manager = new RemoteSkillManager(fakeRunner(manifestV1));
            const installed = await manager.install(
                { id: 'reg-source', type: 'registry', url: 'https://example.test/manifest.json' },
                cacheDir
            );
            expect(installed.version).toEqual('1.2.3');
            expect(installed.skillIds).toEqual(['reg-skill']);
            expect(installed.type).toEqual('registry');

            const loaded = manager.loadInstalledSkills(path.join(cacheDir, 'reg-source'));
            expect(loaded.length).toEqual(1);
            expect(loaded[0].id).toEqual('reg-skill');
            expect(loaded[0].aliases).toContain('rs');

            const manifestV2 = {
                version: '2.0.0',
                skills: [
                    { name: 'reg-skill', description: 'From registry v2.', prompt: '# Reg Skill\nUpdated body.' },
                    { name: 'reg-skill-two', description: 'Second skill.', prompt: '# Reg Skill Two\nMore body.' }
                ]
            };
            const updatedManager = new RemoteSkillManager(fakeRunner(manifestV2));
            const updated = await updatedManager.update(
                { id: 'reg-source', type: 'registry', url: 'https://example.test/manifest.json' },
                cacheDir
            );
            expect(updated.version).toEqual('2.0.0');
            expect(updated.skillIds).toEqual(['reg-skill', 'reg-skill-two']);
        } finally {
            await fs.rm(cacheDir, { recursive: true, force: true });
        }
    }

    @Test('removes an installed source and returns false for unknown ids')
    async removeSource() {
        const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-rm-cache-'));
        try {
            const manager = new RemoteSkillManager(fakeRunner({ version: '1.0.0', skills: [{ name: 'rm-skill', prompt: '# RM\nBody.' }] }));
            await manager.install({ id: 'rm-source', type: 'registry', url: 'https://example.test/m.json' }, cacheDir);
            expect(manager.remove('rm-source', cacheDir)).toEqual(true);
            expect(manager.list(cacheDir).length).toEqual(0);
            expect(manager.remove('rm-source', cacheDir)).toEqual(false);
        } finally {
            await fs.rm(cacheDir, { recursive: true, force: true });
        }
    }
}
