import { Injectable } from '@tsdi/ioc';
import { AgentTuiResolvedConfig, AgentUiConfigReader, AgentUiResolvedConfig } from '@tsdi/agent-ui';
import {
    AgentCliOptions,
    ensureAgentWorkspaceConfig,
    resolveCliConfig,
    resolveCliModelConfig,
    resolveCliTuiConfig,
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
            model,
            tui: this.resolveTuiConfig(cliOptions)
        };
    }

    override resolveTuiConfig(options: Record<string, any>): AgentTuiResolvedConfig {
        const cliOptions = options as AgentCliOptions;
        const resolved = resolveCliConfig(cliOptions);
        return resolveCliTuiConfig(cliOptions, resolved.root);
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
