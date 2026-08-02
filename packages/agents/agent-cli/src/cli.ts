#!/usr/bin/env node
import { Command } from 'commander';
import { runAgentApplication, runAgentPrompt, runAgentRpcStdio, runAgentStreaming } from './run-command';
import { runAgentConsole } from './run-console';
import { runMcpAdd, runMcpAuth, runMcpList, runMcpLogout, runMcpRemove } from './mcp-command';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { AgentUiConfigService } from '@tsdi/agent-ui';
import { SessionStore } from '@tsdi/agent';

const configReader = new CliAgentUiConfigReader();
const CLI_VERSION = '6.0.31';
const DEFAULT_COMMAND = 'chat';
const TOP_LEVEL_COMMANDS = new Set(['run', 'chat', 'tools', 'mcp', 'rpc-stdio', 'help']);
const TOP_LEVEL_HELP_FLAGS = new Set(['-h', '--help', '-V', '--version']);
const OPTION_FLAGS_WITH_VALUES = new Set([
    '--session',
    '--root',
    '--workspace',
    '--tools',
    '--provider',
    '--model',
    '--base-url',
    '--api-key',
    '--api-key-env',
    '--timeout'
]);

function collectValues(value: string, previous: string[]): string[] {
    return [...previous, value];
}

function normalizeCliArgv(argv: string[]): string[] {    const tail = argv.slice(2);
    if (!tail.length) {
        return [...argv, DEFAULT_COMMAND];
    }

    const leadingOptions: string[] = [];
    for (let index = 0; index < tail.length; index++) {
        const token = tail[index];
        if (TOP_LEVEL_HELP_FLAGS.has(token)) {
            return argv;
        }
        if (TOP_LEVEL_COMMANDS.has(token)) {
            if (!leadingOptions.length || index === 0) {
                return argv;
            }
            return [...argv.slice(0, 2), token, ...leadingOptions, ...tail.slice(index + 1)];
        }
        if (!token.startsWith('-')) {
            return argv;
        }

        leadingOptions.push(token);
        const flag = token.includes('=') ? token.slice(0, token.indexOf('=')) : token;
        if (OPTION_FLAGS_WITH_VALUES.has(flag) && !token.includes('=')) {
            const value = tail[index + 1];
            if (value !== undefined) {
                leadingOptions.push(value);
            }
            index += 1;
        }
    }

    return [...argv.slice(0, 2), DEFAULT_COMMAND, ...tail];
}

function createAgentCli(): Command {
    const program = new Command();
    program.name('tsdi-agent');
    program.version(CLI_VERSION);

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
        .action(async (options: any) => {
            await runAgentConsole(options);
        });

    const project = program
        .command('project')
        .description('Manage projects and inspect project-level session grouping.');

    project
        .command('list')
        .description('List all projects with session counts and last active timestamps.')
        .option('--root <dir>', 'Agent config root.')
        .option('--json', 'Output JSON.')
        .action(async (options: any) => {
            const ctx = await runAgentApplication(options, {});
            try {
                const sessionStore = ctx.get(SessionStore);
                const projects = await sessionStore.listProjects();
                if (options.json) {
                    process.stdout.write(JSON.stringify(projects, null, 2) + '\n');
                    return;
                }
                if (!projects.length) {
                    process.stdout.write('No projects found.\n');
                    return;
                }
                for (const project of projects) {
                    process.stdout.write(`${formatProjectListLine(project)}\n`);
                }
            } finally {
                await ctx.close();
            }
        });

    project
        .command('sessions <projectKey>')
        .description('List sessions belonging to a project.')
        .option('--root <dir>', 'Agent config root.')
        .option('--json', 'Output JSON.')
        .action(async (projectKey: string, options: any) => {
            const ctx = await runAgentApplication(options, {});
            try {
                const sessionStore = ctx.get(SessionStore);
                const projects = await sessionStore.listProjects();
                const match = projects.find((p: {
                    projectKey?: string;
                    projectId?: string;
                    workspace?: string;
                    primaryThreadId?: string;
                    sessionRole?: string;
                    rootRequest?: string;
                    focusSummary?: string;
                    sessionIds: string[];
                    lastActiveAt?: string;
                }) => p.projectKey === projectKey);
                if (!match) {
                    process.stdout.write(`Project not found: ${projectKey}\n`);
                    return;
                }
                const sessions = await Promise.all(
                    match.sessionIds.map(async (id: string) => {
                        const state = await sessionStore.get(id);
                        return { id, summary: state.summary || '', messages: state.messages?.length || 0, updatedAt: state.updatedAt };
                    })
                );
                const orderedSessions = sortProjectSessions(sessions);
                if (options.json) {
                    process.stdout.write(JSON.stringify({ project: match, sessions: orderedSessions }, null, 2) + '\n');
                    return;
                }
                process.stdout.write(`${formatProjectSessionsHeader(match)}\n`);
                process.stdout.write(`Sessions: ${orderedSessions.length}\n\n`);
                for (const session of orderedSessions) {
                    const updated = session.updatedAt ? new Date(session.updatedAt).toISOString() : '-';
                    const summary = (session.summary || '').slice(0, 80);
                    process.stdout.write(`  ${session.id}  |  ${session.messages} msgs  |  ${updated}  |  ${summary}\n`);
                }
            } finally {
                await ctx.close();
            }
        });

    program
        .command('tools list')
        .description('List resolved tool configuration.')
        .option('--root <dir>', 'Agent config root.')
        .option('--tools <items>', 'Comma-separated tool names.')
        .option('--no-default-tools', 'Disable defaults.')
        .action((options: any) => {
            const resolved = new AgentUiConfigService(configReader, options).resolve();
            process.stdout.write(JSON.stringify({
                root: resolved.root,
                settingsPath: resolved.settingsPath,
                workspace: resolved.workspace,
                skillRoots: resolved.skillRoots,
                tools: resolved.tools.registration ?? {}
            }, null, 2) + '\n');
        });

    const mcp = program
        .command('mcp')
        .description('Manage MCP servers (streamable HTTP + OAuth).');

    mcp
        .command('add <id>')
        .description('Add or update an MCP server configuration.')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .option('--url <url>', 'Remote server endpoint (streamable HTTP).')
        .option('--command <cmd>', 'Local server command (stdio).')
        .option('--header <name=value>', 'Static request header (repeatable).', collectValues, [])
        .option('--bearer-token <token>', 'Static bearer token auth.')
        .option('--client-id <id>', 'OAuth client id (triggers OAuth auth config).')
        .option('--scope <scope>', 'OAuth scope.')
        .option('--title <title>', 'Display title for the server.')
        .action(async (id: string, options: any) => {
            await runMcpAdd({ ...options, args: id });
        });

    mcp
        .command('list')
        .description('List configured MCP servers and their auth state.')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .option('--json', 'Emit JSON output.')
        .action((options: any) => {
            runMcpList(options).catch(error => {
                process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
                process.exitCode = 1;
            });
        });

    mcp
        .command('auth <id>')
        .description('Run the OAuth authorization flow for a remote MCP server.')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .option('--client-id <id>', 'OAuth client id override.')
        .option('--scope <scope>', 'OAuth scope override.')
        .action(async (id: string, options: any) => {
            await runMcpAuth({ ...options, args: id });
        });

    mcp
        .command('logout <id>')
        .description('Remove stored OAuth credentials for an MCP server.')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .action(async (id: string, options: any) => {
            await runMcpLogout({ ...options, args: id });
        });

    mcp
        .command('remove <id>')
        .description('Remove an MCP server configuration.')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .action(async (id: string, options: any) => {
            await runMcpRemove({ ...options, args: id });
        });

    program
        .command('rpc-stdio')
        .description('Start the shared App Server over stdio using JSON-RPC 2.0 JSONL frames.')        .option('--session <id>', 'Default session ID for follow-up requests.')
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
            await runAgentRpcStdio(options);
        });

    return program;
}

function resolveProjectDisplayLabel(project?: {
    projectId?: string;
    primaryThreadId?: string;
    workspace?: string;
    projectKey?: string;
    rootRequest?: string;
    focusSummary?: string;
} | null): string {
    return String(project?.projectId || project?.focusSummary || project?.workspace || project?.primaryThreadId || project?.rootRequest || project?.projectKey || '-').trim() || '-';
}

function formatProjectListLine(project: {
    projectKey?: string;
    projectId?: string;
    workspace?: string;
    primaryThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
    sessionIds: string[];
    lastActiveAt?: number;
}): string {
    const key = String(project.projectKey || '-').trim() || '-';
    const label = resolveProjectDisplayLabel(project);
    const workspace = String(project.workspace || '-').trim() || '-';
    const count = project.sessionIds.length;
    const lastActive = project.lastActiveAt
        ? new Date(project.lastActiveAt).toISOString()
        : '-';
    return `${label}  [${key}]  |  workspace ${workspace}  |  ${count} session${count === 1 ? '' : 's'}  |  last ${lastActive}`;
}

function formatProjectSessionsHeader(project: {
    projectKey?: string;
    projectId?: string;
    workspace?: string;
    primaryThreadId?: string;
    rootRequest?: string;
    focusSummary?: string;
}): string {
    const label = resolveProjectDisplayLabel(project);
    const key = String(project.projectKey || '-').trim() || '-';
    const workspace = String(project.workspace || '-').trim() || '-';
    return `Project: ${label}  [${key}]  |  workspace ${workspace}`;
}

function sortProjectSessions<T extends { id: string; updatedAt?: number }>(sessions: T[]): T[] {
    return sessions.slice().sort((left, right) => {
        const activityDelta = (right.updatedAt || 0) - (left.updatedAt || 0);
        if (activityDelta !== 0) {
            return activityDelta;
        }
        return left.id.localeCompare(right.id);
    });
}

if (require.main === module) {
    const argv = normalizeCliArgv(process.argv);
    void createAgentCli().parseAsync(argv);
}

export {
    createAgentCli,
    normalizeCliArgv,
    formatProjectListLine,
    formatProjectSessionsHeader,
    resolveProjectDisplayLabel,
    sortProjectSessions
};
