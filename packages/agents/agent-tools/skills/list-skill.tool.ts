import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { LocalSkillRegistry } from './LocalSkillRegistry';
import { AgentSkillDefinition } from './types';

@Injectable()
export class ListSkillTool implements AgentTool {
    name = 'skill_list';
    description = 'List registered skills with summaries, aliases, tools, and source metadata.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' }
        }
    };
    toolset = 'skills';
    source = 'skill';
    execution = { readOnly: true };
    activation = { kind: 'always' as const, scope: 'global' as const };
    provenance = { origin: 'skill' as const, providerId: '@tsdi/agent-tools/skills' };

    constructor(private skills: LocalSkillRegistry) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const query = this.resolveQuery(input?.query);
        const skills = this.skills.list()
            .filter(skill => !query || this.matches(skill, query))
            .map(skill => ({
                id: skill.id,
                title: skill.title,
                summary: skill.summary,
                aliases: skill.aliases ? skill.aliases.slice() : [],
                tools: skill.tools ? skill.tools.map(tool => ({ ...tool })) : [],
                category: skill.metadata?.category,
                source: skill.metadata?.source
            }));
        return { skills };
    }

    private resolveQuery(value: unknown): string {
        if (value == null) {
            return '';
        }
        if (typeof value !== 'string') {
            throw new Error('Invalid skill_list input: query must be a string.');
        }
        return value.trim().toLowerCase();
    }

    private matches(skill: AgentSkillDefinition, query: string): boolean {
        const fields = [
            skill.id,
            skill.title,
            skill.summary,
            skill.metadata?.category,
            skill.metadata?.source,
            ...(skill.aliases ?? []),
            ...(skill.tools ?? []).map(tool => tool.name)
        ];
        return fields.some(value => typeof value === 'string' && value.toLowerCase().includes(query));
    }
}
