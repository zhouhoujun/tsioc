import { AgentUiConfigReader, AgentUiResolvedConfig, AgentUiResolvedModelProfile } from './AgentUiConfigReader';

export class AgentUiConfigService {
    constructor(
        protected reader: AgentUiConfigReader,
        protected options: Record<string, any> = {}
    ) {
    }

    resolve(options: Record<string, any> = this.options): AgentUiResolvedConfig {
        return resolveAgentUiConfig(this.reader, options);
    }

    resolveModel(options: Record<string, any> = this.options): AgentUiResolvedModelProfile {
        return this.resolve(options).model;
    }

    ensureWorkspaceConfig(root: string, workspaceDirName?: string): string {
        return this.reader.ensureWorkspaceConfig(root, workspaceDirName);
    }

    writeModelProfile(root: string, profile: Partial<AgentUiResolvedModelProfile>): string {
        return this.reader.writeModelProfile(root, profile);
    }

    resolveProviderBaseUrl(provider: string): string | undefined {
        return this.reader.resolveProviderBaseUrl(provider);
    }

    resolveProviderApiKeyEnv(provider: string): string | undefined {
        return this.reader.resolveProviderApiKeyEnv(provider);
    }
}

export function createAgentUiConfigService(
    reader: AgentUiConfigReader,
    options: Record<string, any> = {}
): AgentUiConfigService {
    return new AgentUiConfigService(reader, options);
}

export function resolveAgentUiConfig(
    reader: AgentUiConfigReader,
    options: Record<string, any>
): AgentUiResolvedConfig {
    return reader.resolve(options);
}

export function resolveAgentUiModelConfig(
    reader: AgentUiConfigReader,
    options: Record<string, any>
): AgentUiResolvedModelProfile {
    return reader.resolve(options).model;
}
