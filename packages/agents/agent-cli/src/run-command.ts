import { Application } from '@tsdi/core';
import { AgentModule, AgentRuntime, EchoModelAdapter, AGENT_MODEL_ADAPTER } from '@tsdi/agent';
import { providerTools } from '@tsdi/agent-tools';
import { providerChannels } from '@tsdi/agent-channels';
import { AgentCliOptions, resolveCliConfig } from './config';

export async function runAgentPrompt(prompt: string, options: AgentCliOptions = {}): Promise<string> {
    const resolved = resolveCliConfig(options);
    const ctx = await Application.run({
        module: {
            imports: [
                AgentModule,
                providerTools(resolved.tools),
                providerChannels(resolved.channels)
            ],
            providers: [
                { provide: AGENT_MODEL_ADAPTER, useClass: EchoModelAdapter }
            ]
        }
    });
    try {
        const runtime = ctx.get(AgentRuntime);
        const result = await runtime.runTurn(resolved.sessionId, prompt);
        return result.message.content;
    } finally {
        await ctx.close();
    }
}
