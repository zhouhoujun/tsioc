import type { Command } from 'commander';
import { runAgentServe } from './serve';

/** `tsdi-agent serve` — headless agent + web console (no terminal UI). */
export function registerServeCli(program: Command): void {
    program
        .command('serve')
        .description('Run the agent web console without the terminal UI.')
        .option('--host <host>', 'Bind host (default 127.0.0.1).', '127.0.0.1')
        .option('--port <port>', 'HTTP port (default 3100).', '3100')
        .option('--token <token>', 'Bearer token required by the browser and API clients (generated for non-loopback binds).')
        .option('--mdns', 'Advertise the gateway through multicast DNS for `tsdi-agent attach --mdns`.')
        .option('--static <dir>', 'Web assets directory (defaults to @tsdi/agent-ui/web).')
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
        .action(async (options: any) => {
            await runAgentServe({ ...options, webHost: options.host, webPort: options.port });
        });
}
