import type { Command } from 'commander';
import { runAgentConsole } from './run-console';

/** `tsdi-agent chat` (TUI) including the remote-approval flags. */
export function registerChatCli(program: Command): void {
    program
        .command('chat')
        .description('Start Agent UI in TUI mode.')
        .option('--session <id>', 'Session ID for conversation continuity.')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .option('--workspace <dir>', 'Workspace directory for file tools.')
        .option('--tools <items>', 'Comma-separated tool names or groups to enable.')
        .option('--no-default-tools', 'Disable default tool groups.')
        .option('--provider <name>', 'Model provider (deepseek, openai, etc.)')
        .option('--model <name>', 'Model name.')
        .option('--base-url <url>', 'API base URL.')
        .option('--api-key <key>', 'API key.')
        .option('--api-key-env <name>', 'Env var name for API key.')
        .option('--timeout <ms>', 'Request timeout in ms.')
        .option('--gateway-port <port>', 'Expose pending approvals over loopback HTTP for third-party systems.')
        .option('--gateway-host <host>', 'Bind host for the approvals API (default 127.0.0.1).')
        .option('--gateway-token <token>', 'Owner bearer token for the approvals API.')
        .action(async (options: any) => {
            await runAgentConsole(options);
        });
}
