import { ActivityContext, ActivityResult } from '../../activities/Activity';
import { IVisualWorkflowNode } from '../../visual/types';
import { WorkflowPlugin } from '../types';
import { errorResult, pluginField, pluginPort } from './shared';

function workspaceRoot(context: ActivityContext): string | undefined {
    const policy = (context as any)?.policy;
    return (context as any)?.workspaceRoot || policy?.workspaceRoot || undefined;
}

function resolvePath(config: any, context: ActivityContext, path: typeof import('node:path')): string {
    const input = String(config?.path || '').trim();
    if (!input) {
        throw new Error('File path is required');
    }
    const root = workspaceRoot(context);
    if (!root) {
        return input;
    }
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, input);
    const relative = path.relative(resolvedRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(
            `File path must stay inside the workspace root: ${resolvedRoot}. `
            + 'Use a path inside the root or update WORKFLOW_WORKSPACE_ROOT.'
        );
    }
    return resolved;
}


export function createFilePlugin(): WorkflowPlugin {
    return {
        id: 'file',
        name: 'File',
        description: 'Read and write local files on the workflow host',
        version: '1.0.0',
        nodes: [{
            type: 'file-read',
            label: 'File read',
            description: 'Read a file from the workflow host',
            category: 'storage',
            icon: '▤',
            color: '#475569',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [
                pluginPort('out', 'out', 'output', 'Content'),
                pluginPort('error', 'error', 'output', 'Error')
            ],
            fields: [
                pluginField({ key: 'path', label: 'File path', type: 'text', required: true, placeholder: './data/input.json' }),
                pluginField({
                    key: 'encoding',
                    label: 'Encoding',
                    type: 'select',
                    defaultValue: 'utf8',
                    options: [
                        { label: 'UTF-8', value: 'utf8' },
                        { label: 'Base64', value: 'base64' },
                        { label: 'Hex', value: 'hex' }
                    ]
                }),
                pluginField({ key: 'output', label: 'Write result to', type: 'text', defaultValue: 'content', placeholder: 'content' })
            ],
            defaultConfig: { encoding: 'utf8', output: 'content' },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                try {
                    const fs: any = await import('node:fs/promises');
                    const path: any = await import('node:path');
                    const file = resolvePath(node.config, context, path);
                    const content = await fs.readFile(file, { encoding: String(node.config?.encoding || 'utf8') });
                    const output = String(node.config?.output || 'content');
                    return { success: true, data: { nodeId: node.id, [output]: content, content } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }, {
            type: 'file-write',
            label: 'File write',
            description: 'Write or append a file on the workflow host',
            category: 'storage',
            icon: '▥',
            color: '#334155',
            textColor: '#ffffff',
            inputs: [pluginPort('in', 'in', 'input', 'Input')],
            outputs: [
                pluginPort('out', 'out', 'output', 'Output'),
                pluginPort('error', 'error', 'output', 'Error')
            ],
            fields: [
                pluginField({ key: 'path', label: 'File path', type: 'text', required: true, placeholder: './data/output.json' }),
                pluginField({ key: 'content', label: 'Content', type: 'textarea', rows: 6, placeholder: 'file content' }),
                pluginField({
                    key: 'encoding',
                    label: 'Encoding',
                    type: 'select',
                    defaultValue: 'utf8',
                    options: [
                        { label: 'UTF-8', value: 'utf8' },
                        { label: 'Base64', value: 'base64' },
                        { label: 'Hex', value: 'hex' }
                    ]
                }),
                pluginField({ key: 'append', label: 'Append', type: 'boolean', defaultValue: false }),
                pluginField({ key: 'createDirs', label: 'Create parent folders', type: 'boolean', defaultValue: false })
            ],
            defaultConfig: { encoding: 'utf8', append: false, createDirs: false },
            execute: async (node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> => {
                try {
                    const fs: any = await import('node:fs/promises');
                    const path: any = await import('node:path');
                    const file = resolvePath(node.config, context, path);
                    if (node.config?.createDirs === true) {
                        await fs.mkdir(path.dirname(file), { recursive: true });
                    }
                    const content = String(node.config?.content ?? '');
                    if (node.config?.append === true) {
                        await fs.appendFile(file, content, { encoding: String(node.config?.encoding || 'utf8') });
                    } else {
                        await fs.writeFile(file, content, { encoding: String(node.config?.encoding || 'utf8') });
                    }
                    return { success: true, data: { nodeId: node.id, path: file, bytes: content.length } };
                } catch (error) {
                    return errorResult(node.id, error);
                }
            }
        }]
    };
}
