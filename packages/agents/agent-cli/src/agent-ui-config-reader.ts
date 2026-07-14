import { Injectable } from '@tsdi/ioc';
import { AgentUiConfigReader, AgentUiResolvedConfig } from '@tsdi/agent';
import {
    AgentCliOptions,
    ensureAgentWorkspaceConfig,
    resolveCliConfig,
    resolveCliModelConfig,
    resolveProviderApiKeyEnv,
    resolveProviderBaseUrl,
    writeSettingsModelProfile
} from './config';

@Injectable()
export class CliAgentUiConfigReader extends AgentUiConfigReader {
    override resolve(options: Record<string, any>): AgentUiResolvedConfig {
        const cliOptions = options as AgentCliOptions;
        const resolved = resolveCliConfig(cliOptions);
        const model = resolveCliModelConfig(cliOptions, resolved.root);
        return {
            ...resolved,
            providerProfile: resolved.providerProfile,
            settingsModel: resolved.settingsModel,
            model
        };
    }

    override ensureWorkspaceConfig(root: string, workspaceDirName?: string): string {
        return ensureAgentWorkspaceConfig(root, workspaceDirName);
    }

    override writeModelProfile(root: string, profile: Record<string, any>): string {
        return writeSettingsModelProfile(root, profile);
    }

    override resolveProviderApiKeyEnv(provider: string): string | undefined {
        return resolveProviderApiKeyEnv(provider);
    }

    override resolveProviderBaseUrl(provider: string): string | undefined {
        return resolveProviderBaseUrl(provider);
    }
}
