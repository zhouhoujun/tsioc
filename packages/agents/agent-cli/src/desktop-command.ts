import { spawn } from 'child_process';
import * as path from 'path';
import { resolveCliConfig } from './config';

export interface AgentDesktopCliOptions {
    root?: string;
    session?: string;
    workspace?: string;
    gatewayUrl?: string;
    token?: string;
    desktopEntry?: string;
    electron?: string;
}

export interface AgentDesktopLaunchPlan {
    command: string;
    args: string[];
    env: Record<string, string | undefined>;
    sessionId: string;
    workspace: string;
    gatewayUrl: string;
}

export interface AgentDesktopLauncher {
    resolve(moduleId: string): string;
    launch(command: string, args: string[], options: { env: Record<string, string | undefined>; detached: boolean; stdio: 'ignore' }): { unref(): void };
}

function defaultLauncher(): AgentDesktopLauncher {
    return {
        resolve: moduleId => require.resolve(moduleId),
        launch: (command, args, options) => spawn(command, args, options as any)
    };
}

export function createAgentDesktopLaunchPlan(options: AgentDesktopCliOptions, launcher: AgentDesktopLauncher = defaultLauncher()): AgentDesktopLaunchPlan {
    const resolved = resolveCliConfig(options);
    const gatewayUrl = String(options.gatewayUrl || process.env.TSDI_AGENT_GATEWAY_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(gatewayUrl)) throw new Error('Desktop gateway URL must use http:// or https://.');
    let entry = options.desktopEntry || process.env.TSDI_AGENT_DESKTOP_ENTRY;
    if (!entry) {
        try { entry = launcher.resolve('@tsdi/agent-desktop'); }
        catch { entry = path.resolve(__dirname, '../../agent-desktop/dist/main.js'); }
    }
    let command = options.electron || process.env.TSDI_AGENT_ELECTRON;
    const args: string[] = [];
    if (!command) {
        try {
            command = process.execPath;
            args.push(launcher.resolve('electron/cli.js'));
        } catch {
            command = 'electron';
        }
    }
    args.push(entry);
    return {
        command,
        args,
        env: {
            ...process.env,
            TSDI_AGENT_GATEWAY_URL: gatewayUrl,
            TSDI_AGENT_TOKEN: options.token ?? process.env.TSDI_AGENT_TOKEN,
            TSDI_AGENT_SESSION_ID: resolved.sessionId,
            TSDI_AGENT_WORKSPACE: resolved.workspace
        },
        sessionId: resolved.sessionId,
        workspace: resolved.workspace,
        gatewayUrl
    };
}

export async function runAgentDesktop(options: AgentDesktopCliOptions, launcher: AgentDesktopLauncher = defaultLauncher()): Promise<AgentDesktopLaunchPlan> {
    const plan = createAgentDesktopLaunchPlan(options, launcher);
    try {
        const child = launcher.launch(plan.command, plan.args, { env: plan.env, detached: true, stdio: 'ignore' });
        child.unref();
        process.stdout.write(`Desktop handoff requested for session '${plan.sessionId}' (${plan.gatewayUrl}).\n`);
        return plan;
    } catch (error) {
        throw new Error(`Unable to launch @tsdi/agent-desktop: ${error instanceof Error ? error.message : String(error)}. Install Electron or set TSDI_AGENT_ELECTRON/TSDI_AGENT_DESKTOP_ENTRY.`);
    }
}
