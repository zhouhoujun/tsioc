import type { Command } from 'commander';
import { runAgentJsonStream, runAgentPrompt, runAgentStreaming } from './run-command';

function collectValues(value: string, previous: string[]): string[] {
    return [...previous, value];
}

/** `tsdi-agent run` (non-interactive single-shot) including CI/scripting flags. */
export function registerRunCli(program: Command): void {
    program
        .command('run [prompt]')
        .description('Run a single prompt and return the response.')
        .option('--session <id>', 'Session ID.')
        .option('-c, --continue', 'Continue this workspace\'s last session.')
        .option('--auto', 'Auto-approve approvals that are not explicitly denied.')
        .option('--archived', 'Create the session archived so scripted runs stay out of lists.')
        .option('--agent <name>', 'Archetype used when the session has no explicit override.')
        .option('--file <path>', 'Attach a file to the message (repeatable).', collectValues, [])
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
        .option('-i, --image <path>', 'Attach an input image (repeatable).', collectValues, [])
        .option('--stream', 'Stream the response.')
        .option('--json', 'Output JSONL event stream.')
        .option('--output-last-message', 'Append a final JSONL compatibility event containing the last assistant message.')
        .action(async (prompt: string, options: any) => {
            if (options.json) {
                await runAgentJsonStream(prompt || '', options);
                return;
            }
            if (options.stream) {
                await runAgentStreaming(prompt || '', options);
                return;
            }
            const output = await runAgentPrompt(prompt || '', options);
            process.stdout.write(output + '\n');
        });
}
