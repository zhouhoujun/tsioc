import { Application } from '@tsdi/core';
import * as path from 'path';
import { promises as fs } from 'fs';
import { AgentModule, EchoModelAdapter, AGENT_MODEL_ADAPTER, AGENT_OPTIONS, mergeAgentOptions } from '@tsdi/agent';
import { AgentSkillDefinition, provideTools, provideSkills, loadAgentSkillsFromRoots, loadAgentSkillFile } from '@tsdi/agent-tools';
import { provideChannels } from '@tsdi/agent-channels';
import { AgentCliOptions, resolveCliConfig } from './config';

const HERMES_SAFE_SKILL_FILES = [
    'software-development/writing-plans/SKILL.md',
    'software-development/systematic-debugging/SKILL.md',
    'software-development/test-driven-development/SKILL.md',
    'software-development/requesting-code-review/SKILL.md',
    'software-development/spike/SKILL.md'
] as const;

async function resolveHermesSkillsRoot(fromDir: string): Promise<string> {
    let current = path.resolve(fromDir || process.cwd());
    while (true) {
        const candidate = path.resolve(current, '../ai/hermes-agent/skills');
        try {
            const stat = await fs.stat(candidate);
            if (stat.isDirectory()) {
                return candidate;
            }
        } catch {
            // continue upward
        }
        const parent = path.dirname(current);
        if (parent === current) {
            throw new Error('Hermes skills preset requested, but ../ai/hermes-agent/skills was not found from the current workspace ancestry.');
        }
        current = parent;
    }
}

function mergeSkills(...groups: AgentSkillDefinition[][]): AgentSkillDefinition[] {
    const merged = new Map<string, AgentSkillDefinition>();
    groups.flat().forEach(skill => {
        const existing = merged.get(skill.id);
        if (existing) {
            throw new Error(`Duplicate skill id '${skill.id}' encountered while preparing CLI skills.`);
        }
        merged.set(skill.id, skill);
    });
    return Array.from(merged.values()).sort((left, right) => left.id.localeCompare(right.id));
}

async function loadHermesSafeSkills(root: string): Promise<AgentSkillDefinition[]> {
    const skills: AgentSkillDefinition[] = [];
    for (const relativeFile of HERMES_SAFE_SKILL_FILES) {
        const filePath = path.resolve(root, relativeFile);
        try {
            const stat = await fs.stat(filePath);
            if (!stat.isFile()) {
                continue;
            }
        } catch {
            continue;
        }
        skills.push(await loadAgentSkillFile(filePath, { source: 'hermes-safe' }, root));
    }
    return skills;
}

export async function loadCliSkills(options: AgentCliOptions = {}): Promise<AgentSkillDefinition[]> {
    const resolved = resolveCliConfig(options);
    const explicitSkills = resolved.skillRoots.length
        ? await loadAgentSkillsFromRoots(resolved.skillRoots, { source: 'explicit-root' })
        : [];
    if (!resolved.withHermesSkills) {
        return explicitSkills;
    }
    const hermesRoot = await resolveHermesSkillsRoot(options.cwd || process.cwd());
    const hermesSkills = await loadHermesSafeSkills(hermesRoot);
    return mergeSkills(explicitSkills, hermesSkills);
}

export async function runAgentPrompt(prompt: string, options: AgentCliOptions = {}): Promise<string> {
    const resolved = resolveCliConfig(options);
    const skills = await loadCliSkills(options);
    const agentOptions = mergeAgentOptions({
        bootstrapTurn: {
            enabled: true,
            sessionId: resolved.sessionId,
            input: prompt,
            output: ''
        }
    });
    const ctx = await Application.run(AgentModule, {
        providers: [
            ...provideTools(resolved.tools),
            ...provideChannels(resolved.channels),
            ...provideSkills({ skills }),
            { provide: AGENT_OPTIONS, useValue: agentOptions },
            { provide: AGENT_MODEL_ADAPTER, useClass: EchoModelAdapter }
        ]
    });
    try {
        return agentOptions.bootstrapTurn?.output ?? '';
    } finally {
        await ctx.close();
    }
}
