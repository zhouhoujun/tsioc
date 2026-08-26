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
    /** Full instructions; catalog-only definitions may provide summary only. */
    promptFull?: string;
    aliases?: string[];
    tools?: AgentSkillToolRef[];
    metadata?: AgentSkillMetadata;
}

export type RemoteSkillSourceType = 'git' | 'registry';

export interface RemoteSkillSource {
    id: string;
    type: RemoteSkillSourceType;
    url: string;
    /** Git branch/tag to pin (git sources). Defaults to the default branch. */
    ref?: string;
    /** Expected version from the registry manifest (registry sources). */
    version?: string;
}

export interface InstalledRemoteSkill {
    id: string;
    type: RemoteSkillSourceType;
    url: string;
    ref?: string;
    version?: string;
    installedAt: number;
    skillIds: string[];
}
