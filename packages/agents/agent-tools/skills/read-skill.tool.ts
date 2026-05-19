import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { LocalSkillRegistry } from './LocalSkillRegistry';

@Injectable()
export class ReadSkillTool implements AgentTool {
    name = 'read_skill';
    description = 'Read the full prompt and metadata for a registered skill.';
    inputSchema = {
        type: 'object',
        properties: {
            name: { type: 'string' }
        },
        required: ['name']
    };
    toolset = 'skills';
    source = 'skill';
    execution = { readOnly: true };
    activation = { kind: 'always' as const, scope: 'global' as const };
    provenance = { origin: 'skill' as const, providerId: '@tsdi/agent-tools/skills' };

    constructor(private skills: LocalSkillRegistry) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const name = typeof input?.name === 'string' ? input.name.trim() : '';
        if (!name) {
            throw new Error('Invalid read_skill input: name must be a non-empty string.');
        }
        const skill = this.skills.get(name);
        if (!skill) {
            throw new Error(`Skill '${name}' not found.`);
        }
        return skill;
    }
}
