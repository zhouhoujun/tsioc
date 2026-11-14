import type { Command } from 'commander';
import { AcpServer } from '@tsdi/agent';
import { AgentRuntime } from '@tsdi/agent';
import { mergeAgentOptions } from '@tsdi/agent';
import { runAgentApplication } from './run-command';

export interface AgentAcpOptions {
    root?: string;
    workspace?: string;
    session?: string;
}

/**
 * Serve the agent over ACP on stdio. The process stays alive until stdin
 * closes; JSON-RPC frames are newline-delimited.
 */
export async function runAgentAcp(options: AgentAcpOptions = {}): Promise<void> {
    const ctx = await runAgentApplication(options as any, mergeAgentOptions({
        workspace: options.workspace
    }));
    const runtime = ctx.get(AgentRuntime);
    new AcpServer({
        read: listener => {
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', chunk => { listener(String(chunk)); });
        },
        write: payload => { process.stdout.write(payload); }
    }, { runtime, serverName: 'tsdi-agent', serverVersion: '6.0.31' });
    await new Promise<void>(resolve => {
        process.stdin.on('end', () => resolve());
        process.stdin.resume();
    });
    await (ctx as any).close?.();
}

/** Register `tsdi-agent acp` (ACP over stdio). */
export function registerAcpCli(program: Command): void {
    program
        .command('acp')
        .description('Serve the agent over the Agent Client Protocol on stdio.')
        .option('--root <dir>', 'Agent config root.')
        .option('--workspace <dir>', 'Workspace directory.')
        .option('--session <id>', 'Initial session id.')
        .action(async (options: any) => {
            await runAgentAcp(options);
        });
}
