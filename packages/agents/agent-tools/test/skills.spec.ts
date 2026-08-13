import expect = require('expect');
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { Suite, Test } from '@tsdi/unit';
import { RemoteSkillManager, RemoteSkillProcessRunner } from '../skills/remote-skill-manager';
import { AgentSkillDefinition } from '../skills/types';
import { AgentPluginManager } from '../skills/plugin-manager';

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
            expect(plugins.length).toEqual(1);
            expect(plugins[0].manifest.version).toEqual('2.0.0');
            const contributions = manager.contributions(plugins);
            expect(contributions.skills.map(skill => skill.id)).toContain('demo-skill');
            expect(contributions.mcpServers.map(server => server.id)).toEqual(['demo-mcp']);
            expect(contributions.connectors[0].plugin).toEqual('demo');
            expect((contributions.hooks.beforeTurn as any[]).length).toEqual(1);
            expect(contributions.agentsDocs[0].path).toEqual(path.join(local, 'demo', 'AGENTS.md'));
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

    private async writePlugin(root: string, id: string, version: string, body: string, extra: Record<string, any> = {}) {
        const plugin = path.join(root, id);
        await fs.mkdir(path.join(plugin, 'skills', 'demo-skill'), { recursive: true });
        await fs.writeFile(path.join(plugin, 'plugin.json'), JSON.stringify({ name: id, version, skills: ['skills'], ...extra }));
        await fs.writeFile(path.join(plugin, 'skills', 'demo-skill', 'SKILL.md'), `---\nname: demo-skill\ndescription: Plugin skill.\n---\n${body}`);
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
