#!/usr/bin/env node
import { Command } from 'commander';
import { runAgentPrompt } from './run-command';
import { resolveCliConfig } from './config';

export function createAgentCli(): Command {
    const program = new Command();
    program.name('tsdi-agent');

    program
        .command('run [prompt]')
        .option('--session <id>')
        .option('--cwd <dir>')
        .option('--tools <items>')
        .option('--channels <items>')
        .option('--skill-roots <items>')
        .option('--with-hermes-skills')
        .option('--no-default-tools')
        .option('--no-default-channels')
        .option('--json')
        .action(async (prompt: string, options: any) => {
            const output = await runAgentPrompt(prompt || '', options);
            if (options.json) {
                process.stdout.write(JSON.stringify({ output }) + '\n');
                return;
            }
            process.stdout.write(output + '\n');
        });

    const tools = program.command('tools');
    tools
        .command('list')
        .option('--tools <items>')
        .option('--skill-roots <items>')
        .option('--with-hermes-skills')
        .option('--no-default-tools')
        .action((options: any) => {
            const resolved = resolveCliConfig(options);
            process.stdout.write(JSON.stringify(resolved.tools.registration ?? {}) + '\n');
        });

    program
        .command('chat')
        .option('--session <id>')
        .description('Starts a minimal interactive session placeholder.')
        .action((_options: any) => {
            process.stdout.write('chat mode is available in a minimal form via run command sessions\n');
        });

    return program;
}

if (require.main === module) {
    void createAgentCli().parseAsync(process.argv);
}
