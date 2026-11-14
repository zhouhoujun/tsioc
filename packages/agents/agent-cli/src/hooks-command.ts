import type { Command } from 'commander';
import { writeAgentHookTrust } from './hooks-trust';

export interface AgentHooksTrustOptions {
    root?: string;
}

/**
 * Persist a hash manifest for the project's `hooks.json`. Once the manifest
 * exists, `resolveCliHooks` requires every hook to match its recorded hash.
 */
export async function runAgentHooksTrust(options: AgentHooksTrustOptions = {}): Promise<void> {
    const result = writeAgentHookTrust(options.root);
    console.log(`Trusted ${result.count} hook(s). Manifest: ${result.path}`);
}

/** Register `tsdi-agent hooks ...` on the shared commander program. */
export function registerHooksCli(program: Command): void {
    const hooks = program
        .command('hooks')
        .description('Manage lifecycle hooks: trust the current hooks.json definitions.');

    hooks
        .command('trust')
        .description('Write hooks.trusted.json for every hook in hooks.json (edits invalidate trust).')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .action(async (options: any) => {
            await runAgentHooksTrust(options);
        });
}
