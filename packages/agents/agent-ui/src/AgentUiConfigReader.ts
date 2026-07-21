export interface AgentUiSavedModelProfile {
    name: string;
    provider: string;
    flashModel: string;
    strongModel: string;
    baseUrl?: string;
    apiKey?: string;
}

export interface AgentUiResolvedModelProfile {
    provider: string;
    model: string;
    baseUrl?: string;
    apiKey?: string;
    apiKeyEnv?: string;
    timeoutMs?: number;
    temperature?: number;
    maxTokens?: number;
    headers?: Record<string, string>;
    thinkingBudget?: number;
    reasoning?: boolean;
    defaultProfile?: string;
    profiles?: Record<string, AgentUiResolvedModelProfile>;
    routes?: Array<Record<string, any>>;
    complexityRouting?: Partial<Record<'simple' | 'moderate' | 'complex', string | AgentUiResolvedModelProfile>>;
    complexityThresholds?: {
        simpleMaxScore?: number;
        moderateMaxScore?: number;
    };
    savedProfiles?: Record<string, AgentUiSavedModelProfile>;
    activeSavedProfile?: string;
}

export interface AgentUiResolvedConfig {
    sessionId: string;
    root: string;
    settingsPath: string;
    workspace: string;
    skillRoots: string[];
    tools: Record<string, any>;
    channels: Record<string, any>;
    providerProfile?: AgentUiResolvedModelProfile;
    settingsModel?: Partial<AgentUiResolvedModelProfile>;
    model: AgentUiResolvedModelProfile;
}

export abstract class AgentUiConfigReader {
    abstract resolve(options: Record<string, any>): AgentUiResolvedConfig;
    abstract ensureWorkspaceConfig(root: string, workspaceDirName?: string): string;
    abstract writeModelProfile(root: string, profile: Partial<AgentUiResolvedModelProfile>): string;
    abstract resolveProviderApiKeyEnv(provider: string): string | undefined;
    abstract resolveProviderBaseUrl(provider: string): string | undefined;
}
