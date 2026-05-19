export type AgentSkillToolActivation = 'always' | 'deferred';

export interface AgentSkillToolRef {
    name: string;
    activation?: AgentSkillToolActivation;
}

export interface AgentSkillMetadata {
    source?: string;
    category?: string;
}

export interface AgentSkillDefinition {
    id: string;
    title: string;
    summary: string;
    promptFull: string;
    aliases?: string[];
    tools?: AgentSkillToolRef[];
    metadata?: AgentSkillMetadata;
}
