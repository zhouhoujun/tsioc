import { Application } from '@tsdi/core';
import { AgentModule, EchoModelAdapter, AGENT_OPTIONS, ModelAdapter, mergeAgentOptions } from '@tsdi/agent';
import { provideSkills, provideTools } from '@tsdi/agent-tools';
import { provideChannels } from '@tsdi/agent-channels';
import { AgentCliOptions, resolveCliConfig } from './config';

export async function runAgentPrompt(prompt: string, options: AgentCliOptions = {}): Promise<string> {
    const resolved = resolveCliConfig(options);
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
            ...provideSkills({ root: resolved.root }),
            ...provideChannels(resolved.channels),
            { provide: AGENT_OPTIONS, useValue: agentOptions },
            { provide: ModelAdapter, useClass: EchoModelAdapter }
        ]
    });
    try {
        return agentOptions.bootstrapTurn?.output ?? '';
    } finally {
        await ctx.close();
    }
}
