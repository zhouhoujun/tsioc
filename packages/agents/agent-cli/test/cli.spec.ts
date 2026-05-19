import expect = require('expect');
import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { createAgentCli, resolveCliConfig, runAgentPrompt, loadCliSkills } from '../src';

@Suite('Agent CLI')
export class AgentCliTest {
    private async createWorkspaceWithHermesSkills(): Promise<{ cwd: string; hermesRoot: string; customRoot: string; }> {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-cli-'));
        const cwd = path.join(workspace, 'repo');
        const hermesRoot = path.join(workspace, 'ai', 'hermes-agent', 'skills');
        const customRoot = path.join(workspace, 'custom-skills');
        await fs.mkdir(cwd, { recursive: true });
        await fs.mkdir(path.join(hermesRoot, 'software-development', 'writing-plans'), { recursive: true });
        await fs.mkdir(path.join(hermesRoot, 'software-development', 'random-internal'), { recursive: true });
        await fs.mkdir(path.join(customRoot, 'random-internal'), { recursive: true });
        await fs.writeFile(path.join(hermesRoot, 'software-development', 'writing-plans', 'SKILL.md'), `---\nname: writing-plans\ndescription: "Write implementation plans."\n---\n\n# Writing Plans\n\nWrite plans first.\n`, 'utf8');
        await fs.writeFile(path.join(hermesRoot, 'software-development', 'random-internal', 'SKILL.md'), `---\nname: random-internal\ndescription: "Not on the safe allowlist."\n---\n\n# Random Internal\n\nInternal only.\n`, 'utf8');
        await fs.writeFile(path.join(customRoot, 'random-internal', 'SKILL.md'), `---\nname: random-internal\ndescription: "Custom explicit skill root entry."\n---\n\n# Random Internal\n\nExplicit custom root.\n`, 'utf8');
        return { cwd, hermesRoot, customRoot };
    }
    @Test('resolves cli config for tools and channels')
    resolvesCliConfig() {
        const resolved = resolveCliConfig({
            session: 's1',
            cwd: '/tmp/work',
            tools: 'filesystem,http_fetch',
            channels: 'local,wechat',
            defaultTools: false,
            defaultChannels: false
        });
        expect(resolved.sessionId).toBe('s1');
        expect(resolved.tools.file?.rootDir).toBe('/tmp/work');
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

    @Test('resolves explicit skill roots')
    resolvesExplicitSkillRoots() {
        const resolved = resolveCliConfig({ skillRoots: '/tmp/skills-a,/tmp/skills-b' });
        expect(resolved.skillRoots).toEqual(['/tmp/skills-a', '/tmp/skills-b']);
    }

    @Test('resolves Hermes skills preset flag')
    resolvesHermesSkillsPresetFlag() {
        const resolved = resolveCliConfig({ withHermesSkills: true });
        expect(resolved.withHermesSkills).toBe(true);
    }

    @Test('creates cli commands')
    createsCliCommands() {
        const cli = createAgentCli();
        expect(cli.commands.some(cmd => cmd.name() === 'run')).toBe(true);
        expect(cli.commands.some(cmd => cmd.name() === 'tools')).toBe(true);
        expect(cli.commands.some(cmd => cmd.name() === 'chat')).toBe(true);
    }

    @Test('loads only safe Hermes preset skills')
    async loadsOnlySafeHermesPresetSkills() {
        const { cwd } = await this.createWorkspaceWithHermesSkills();
        const skills = await loadCliSkills({ cwd, withHermesSkills: true });
        expect(skills.map(skill => skill.id)).toEqual(['writing-plans']);
        expect(skills[0].metadata).toEqual({ source: 'hermes-safe', category: 'software-development' });
    }

    @Test('ignores invalid non-allowlisted Hermes skills')
    async ignoresInvalidNonAllowlistedHermesSkills() {
        const { cwd, hermesRoot } = await this.createWorkspaceWithHermesSkills();
        await fs.writeFile(path.join(hermesRoot, 'software-development', 'random-internal', 'SKILL.md'), `---\nname: random-internal\naliases:\n  - broken\n---\n\n# Random Internal\n\nBroken.\n`, 'utf8');
        const skills = await loadCliSkills({ cwd, withHermesSkills: true });
        expect(skills.map(skill => skill.id)).toEqual(['writing-plans']);
    }

    @Test('explicit skill roots stay unrestricted')
    async explicitSkillRootsStayUnrestricted() {
        const { customRoot } = await this.createWorkspaceWithHermesSkills();
        const skills = await loadCliSkills({ skillRoots: customRoot });
        expect(skills.map(skill => skill.id)).toEqual(['random-internal']);
        expect(skills[0].metadata).toEqual({ source: 'explicit-root', category: 'random-internal' });
    }

    @Test('runs prompt through echo model runtime')
    async runsPromptThroughEchoModelRuntime() {
        const output = await runAgentPrompt('hello cli', { session: 'cli-1' });
        expect(output).toBe('Echo: hello cli');
    }

    @Test('accepts tool item names without treating them as groups')
    async acceptsToolItemNamesWithoutTreatingThemAsGroups() {
        const resolved = resolveCliConfig({ tools: 'http_fetch' });
        expect((resolved.tools.registration?.items as any).http_fetch).toBe(true);
        expect((resolved.tools.registration?.groups as any).http_fetch).toBe(undefined);
        const output = await runAgentPrompt('hello item tool', { session: 'cli-2', tools: 'http_fetch' });
        expect(output).toBe('Echo: hello item tool');
    }
}
