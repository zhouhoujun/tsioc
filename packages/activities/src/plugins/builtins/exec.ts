import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { errorResult, pluginField, pluginPort } from './shared';

function argumentList(value: any): string[] {
    if (Array.isArray(value)) {
        return value.map(item => item && typeof item === 'object' && 'value' in item ? String(item.value) : String(item));
    }
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map(String);
            }
        } catch {
            return value.split(/\s+/).filter(Boolean);
        }
    }
    return [];
}

export function createExecPlugin(): WorkflowPlugin {
    return {
        id: 'exec',
        name: 'Exec',
        description: 'Run a host process and capture its output',
        version: '1.0.0',
        nodes: [{
            type: 'exec',
            label: 'Exec',
            description: 'Run a host command and capture stdout/stderr',
            category: 'action',
            icon: '>_',
            color: '#1e293b',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [
                pluginPort('out', 'out', 'output', 'Output'),
                pluginPort('error', 'error', 'output', 'Error')
            ],
            fields: [
                pluginField({ key: 'command', label: 'Command', type: 'text', required: true, placeholder: '/usr/bin/node' }),
                pluginField({ key: 'args', label: 'Arguments', type: 'list', addLabel: '+ Add argument', itemFields: [pluginField({ key: 'value', label: 'Argument', type: 'text', placeholder: '--flag' })] }),
                pluginField({ key: 'cwd', label: 'Working directory', type: 'text', placeholder: './' }),
                pluginField({ key: 'env', label: 'Environment', type: 'keyvalue', valueType: 'text', placeholder: 'KEY' }),
                pluginField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 30000, min: 0, step: 1000, unit: 'ms', group: 'Reliability' }),
                pluginField({ key: 'output', label: 'Write stdout to', type: 'text', defaultValue: 'stdout' })
            ],
            defaultConfig: { args: [], timeout: 30000, output: 'stdout' },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                const config = node.config || {};
                try {
                    const childProcess: any = await import('node:child_process');
                    const path: any = await import('node:path');
                    const policy = (context as any)?.policy || {};
                    const workspaceRoot = (context as any)?.workspaceRoot || policy.workspaceRoot;
                    const allowedCommands = (context as any)?.allowedCommands || policy.allowedCommands;
                    const command = String(config.command || '');
                    if (Array.isArray(allowedCommands) && allowedCommands.length
                        && !allowedCommands.some(item =>
                            String(item) === command || String(item) === path.basename(command)
                        )) {
                        throw new Error(
                            `Command is not allowed by the workspace policy: ${command}. `
                            + `Allowed commands: ${allowedCommands.join(', ')}`
                        );
                    }
                    let cwd: string | undefined = config.cwd ? String(config.cwd) : undefined;
                    if (workspaceRoot) {
                        const resolvedRoot = path.resolve(String(workspaceRoot));
                        cwd = config.cwd ? path.resolve(resolvedRoot, String(config.cwd)) : resolvedRoot;
                        const relative = path.relative(resolvedRoot, cwd);
                        if (relative.startsWith('..') || path.isAbsolute(relative)) {
                            throw new Error(
                                `Working directory must stay inside the workspace root: ${resolvedRoot}`
                            );
                        }
                    }
                    const timeout = Math.max(0, Number(config.timeout) || 0);
                    const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
                        const child = childProcess.spawn(command, argumentList(config.args), {
                            cwd,
                            env: config.env && typeof config.env === 'object'
                                ? { ...((globalThis as any).process?.env || {}), ...config.env }
                                : (globalThis as any).process?.env,
                            shell: false
                        });
                        let stdout = '';
                        let stderr = '';
                        let settled = false;
                        const timer = timeout > 0
                            ? setTimeout(() => {
                                if (!settled) {
                                    settled = true;
                                    child.kill();
                                    reject(new Error(`Command timed out after ${timeout}ms`));
                                }
                            }, timeout)
                            : undefined;
                        child.stdout?.on('data', (chunk: any) => { stdout += chunk.toString(); });
                        child.stderr?.on('data', (chunk: any) => { stderr += chunk.toString(); });
                        child.once('error', (error: Error) => {
                            if (settled) {
                                return;
                            }
                            settled = true;
                            if (timer) {
                                clearTimeout(timer);
                            }
                            reject(error);
                        });
                        child.once('close', (code: number) => {
                            if (settled) {
                                return;
                            }
                            settled = true;
                            if (timer) {
                                clearTimeout(timer);
                            }
                            resolve({ code: code ?? 0, stdout, stderr });
                        });
                    });
                    const output = String(config.output || 'stdout');
                    return {
                        success: result.code === 0,
                        error: result.code === 0 ? undefined : new Error(`Command exited with code ${result.code}`),
                        data: { nodeId: node.id, ...result, [output]: result.stdout }
                    };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
