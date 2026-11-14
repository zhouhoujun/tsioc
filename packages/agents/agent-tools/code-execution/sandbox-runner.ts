import { buildSandboxExecCommand, detectSandboxExecTool, probeSandboxExecTool, SandboxMode } from '@tsdi/agent';

export interface SandboxedCommand {
    command: string;
    args: string[];
    /** True when the command is actually wrapped by an OS sandbox tool. */
    applied: boolean;
    reason?: string;
}

/**
 * Wrap a command with the platform sandbox. Degrades explicitly (and reports
 * why) instead of pretending the command was isolated.
 */
export async function wrapSandboxedCommand(
    mode: SandboxMode | undefined,
    workspace: string | undefined,
    command: string,
    args: string[]
): Promise<SandboxedCommand> {
    if (!mode || mode === 'off') {
        return { command, args, applied: false };
    }
    if (!workspace) {
        return { command, args, applied: false, reason: 'No workspace is available for workspace sandboxing.' };
    }
    const probe = await detectSandboxExecTool(process.platform, name => probeSandboxExecTool(name, process.platform));
    if (!probe.tool) {
        return { command, args, applied: false, reason: probe.reason };
    }
    const wrapped = buildSandboxExecCommand(probe.tool, mode, command, args, { workspace });
    if (!wrapped) {
        return { command, args, applied: false, reason: `The ${probe.tool} sandbox cannot express mode '${mode}'.` };
    }
    return { ...wrapped, applied: true };
}

/** Node 22+ permission model flag; absent on runtimes without it. */
export function hasNodePermissionFlag(): boolean {
    const flags = (process as unknown as { allowedNodeEnvironmentFlags?: Set<string> }).allowedNodeEnvironmentFlags;
    return flags?.has('--permission') === true;
}

/**
 * Standalone runner used when JS/TS executes under the OS sandbox. The worker
 * path is kept for `off` mode, but a sandboxed child cannot use
 * `worker_threads` safely, so it runs the snippet in a dedicated Node child and
 * reports through a result file inside the workspace.
 */
export function buildSandboxedNodeRunnerSource(): string {
    return `
const fs = require('fs');
const { createRequire } = require('module');
const { format } = require('util');
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

const [codePath, resultPath, cwd] = process.argv.slice(2);
const code = fs.readFileSync(codePath, 'utf8');
const requireFromCwd = createRequire(cwd + '/__execute_code__.js');
const processProxy = Object.create(process);
processProxy.cwd = () => cwd;
const userModule = { exports: {} };
let stdout = '';
let stderr = '';
const consoleProxy = {
    log: (...args) => { stdout += format(...args) + '\\n'; },
    info: (...args) => { stdout += format(...args) + '\\n'; },
    warn: (...args) => { stderr += format(...args) + '\\n'; },
    error: (...args) => { stderr += format(...args) + '\\n'; }
};
const write = (payload) => fs.writeFileSync(resultPath, JSON.stringify(payload));

(async () => {
    const fn = new AsyncFunction('require', 'module', 'exports', 'console', 'process', '__dirname', '__filename', '"use strict";\\nreturn (async () => {\\n' + code + '\\n})();');
    await fn(requireFromCwd, userModule, userModule.exports, consoleProxy, processProxy, cwd, cwd + '/__execute_code__.js');
    write({ stdout, stderr, exitCode: 0 });
})().catch(error => {
    const message = error && error.stack ? String(error.stack) : String(error?.message || error);
    write({ stdout, stderr: stderr ? stderr + message : message, exitCode: 1, error: message });
});
`;
}
