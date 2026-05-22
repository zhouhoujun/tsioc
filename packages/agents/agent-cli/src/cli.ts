#!/usr/bin/env node
import { Command } from 'commander';
import * as readline from 'readline';
import { runAgentPrompt, runAgentStreaming } from './run-command';
import { resolveCliConfig } from './config';

function createAgentCli(): Command {
    const program = new Command();
    program.name('tsdi-agent');
    program.version('6.0.31');

    program
        .command('run [prompt]')
        .description('Run a single prompt and return the response.')
        .option('--session <id>', 'Session ID.')
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
        .option('--stream', 'Stream the response.')
        .option('--json', 'Output JSON.')
        .action(async (prompt: string, options: any) => {
            if (options.stream) {
                await runAgentStreaming(prompt || '', options);
                return;
            }
            const output = await runAgentPrompt(prompt || '', options);
            if (options.json) {
                process.stdout.write(JSON.stringify({ output }) + '\n');
                return;
            }
            process.stdout.write(output + '\n');
        });

    program
        .command('chat')
        .description('Start an interactive chat session with streaming responses.')
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
        .action(async (options: any) => {
            await runInteractiveChat(options);
        });

    program
        .command('tools list')
        .description('List resolved tool configuration.')
        .option('--root <dir>', 'Agent config root.')
        .option('--tools <items>', 'Comma-separated tool names.')
        .option('--no-default-tools', 'Disable defaults.')
        .action((options: any) => {
            const resolved = resolveCliConfig(options);
            process.stdout.write(JSON.stringify({
                root: resolved.root,
                settingsPath: resolved.settingsPath,
                workspace: resolved.workspace,
                skillRoots: resolved.skillRoots,
                tools: resolved.tools.registration ?? {}
            }, null, 2) + '\n');
        });

    return program;
}

async function runInteractiveChat(options: any): Promise<void> {
    const { Application } = require('@tsdi/core');
    const {
        AgentModule, AgentRuntime, AGENT_OPTIONS,
        ModelAdapter, OpenAICompatibleModelAdapter,
        mergeAgentOptions
    } = require('@tsdi/agent');
    const { provideTools } = require('@tsdi/agent-tools');
    const { resolveCliConfig } = require('./config');

    const resolved = resolveCliConfig(options);
    const provider = options.provider || process.env.AGENT_PROVIDER || 'deepseek';
    const model = options.model || process.env.AGENT_MODEL || 'deepseek-chat';

    const agentOptions = mergeAgentOptions({
        model: {
            provider,
            model,
            baseUrl: options.baseUrl || process.env.AGENT_BASE_URL || undefined,
            apiKey: options.apiKey || process.env.AGENT_API_KEY || undefined,
            apiKeyEnv: options.apiKeyEnv || undefined,
            timeoutMs: parseInt(options.timeout as string) || 120000
        }
    });

    const modelAdapterProvider = {
        provide: ModelAdapter,
        useFactory: () => new OpenAICompatibleModelAdapter({
            provider,
            model,
            baseUrl: options.baseUrl || process.env.AGENT_BASE_URL || `https://api.${provider === 'openai' ? 'openai.com' : 'deepseek.com'}`,
            apiKey: options.apiKey || process.env.AGENT_API_KEY || undefined,
            apiKeyEnv: options.apiKeyEnv || undefined,
            timeoutMs: parseInt(options.timeout as string) || 120000
        })
    };

    process.stdout.write(`\nStarting interactive chat session...\n`);
    process.stdout.write(`Provider: ${provider} | Model: ${model}\n`);
    process.stdout.write(`Session: ${resolved.sessionId}\n`);
    process.stdout.write(`Workspace: ${resolved.workspace}\n`);
    process.stdout.write(`Type /help for commands, /quit to exit.\n\n`);

    const ctx = await Application.run(AgentModule, {
        providers: [
            ...provideTools(resolved.tools),
            modelAdapterProvider,
            { provide: AGENT_OPTIONS, useValue: agentOptions },
        ]
    });

    const runtime: any = ctx.get(AgentRuntime);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\n> '
    });

    const sessionId = resolved.sessionId;

    const processInput = async (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) return;

        if (trimmed === '/quit' || trimmed === '/exit') {
            process.stdout.write('\nGoodbye.\n');
            rl.close();
            return;
        }

        if (trimmed === '/help') {
            process.stdout.write('\nCommands:\n');
            process.stdout.write('  /quit, /exit  - Exit the chat session.\n');
            process.stdout.write('  /help         - Show this help.\n');
            process.stdout.write('  /clear        - Clear the screen.\n');
            process.stdout.write('  /session <id> - Switch session.\n');
            rl.prompt();
            return;
        }

        if (trimmed === '/clear') {
            process.stdout.write('\x1b[2J\x1b[H');
            rl.prompt();
            return;
        }

        process.stdout.write('\n');
        try {
            const stream = runtime.runStreamingTurn(sessionId, trimmed);
            let toolCallActive = false;

            for await (const chunk of stream) {
                if (chunk.type === 'text' && chunk.content) {
                    process.stdout.write(chunk.content);
                } else if (chunk.type === 'reasoning' && chunk.content) {
                    process.stdout.write(`\x1b[90m${chunk.content}\x1b[0m`);
                } else if (chunk.type === 'tool_call') {
                    if (!toolCallActive) {
                        process.stdout.write('\n');
                    }
                    toolCallActive = true;
                    process.stdout.write(`\x1b[33m[Tool: ${chunk.content || '...'}]\x1b[0m\n`);
                } else if (chunk.type === 'done') {
                    process.stdout.write('\n');
                }
            }
        } catch (error: any) {
            process.stderr.write(`\n\x1b[31mError: ${error.message}\x1b[0m\n`);
        }
        rl.prompt();
    };

    rl.on('line', (line: string) => {
        void processInput(line);
    });

    rl.on('close', async () => {
        process.stdout.write('\nClosing session...\n');
        await ctx.close();
        process.exit(0);
    });

    rl.prompt();
}

if (require.main === module) {
    void createAgentCli().parseAsync(process.argv);
}

export { createAgentCli };
