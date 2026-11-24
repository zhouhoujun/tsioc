import { Injectable } from '@tsdi/ioc';
import { ArtifactStore, AgentTool, AgentToolContext } from '@tsdi/agent';
import { nodeArtifactAdapter } from './node-adapter';

function requireWorkspace(context: AgentToolContext | undefined): string {
    const workspace = String(context?.workspace || '').trim();
    if (!workspace) {
        throw new Error('Artifact tools require a session workspace.');
    }
    return workspace;
}

function store(): ArtifactStore {
    return new ArtifactStore(nodeArtifactAdapter);
}

function summarize(manifest: { id: string; title: string; entry: string; files: string[]; mime: string }): Record<string, any> {
    return { id: manifest.id, title: manifest.title, entry: manifest.entry, files: manifest.files, mime: manifest.mime };
}

@Injectable()
export class ArtifactCreateTool implements AgentTool {
    name = 'artifact_create';
    description = 'Create a local artifact (HTML/markdown/JSON) served for this workspace.';
    toolset = 'artifacts';
    source = 'local';
    inputSchema = {
        type: 'object',
        properties: {
            title: { type: 'string' },
            entry: { type: 'string', description: 'Entry file path (defaults to the first file).' },
            mime: { type: 'string' },
            files: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: { path: { type: 'string' }, content: { type: 'string' } },
                    required: ['path', 'content']
                }
            }
        },
        required: ['files']
    };
    execution = { readOnly: false, sideEffect: true, requiresSequential: true, timeoutMs: 15000 };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const workspace = requireWorkspace(context);
        const manifest = await store().create(workspace, {
            title: String(input?.title || ''),
            entry: String(input?.entry || input?.files?.[0]?.path || ''),
            mime: input?.mime ? String(input.mime) : undefined,
            files: Array.isArray(input?.files) ? input.files : []
        });
        return { ...summarize(manifest), url: `/artifacts/${manifest.id}/${manifest.entry}` };
    }
}

@Injectable()
export class ArtifactReadTool implements AgentTool {
    name = 'artifact_read';
    description = 'Read an artifact file (manifest entry by default).';
    toolset = 'artifacts';
    source = 'local';
    inputSchema = {
        type: 'object',
        properties: { id: { type: 'string' }, path: { type: 'string' } },
        required: ['id']
    };
    execution = { readOnly: true, timeoutMs: 10000 };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const result = await store().read(requireWorkspace(context), String(input?.id || ''), input?.path ? String(input.path) : undefined);
        if (!result) {
            throw new Error(`Artifact "${input?.id}" or file not found.`);
        }
        return result;
    }
}

@Injectable()
export class ArtifactUpdateTool implements AgentTool {
    name = 'artifact_update';
    description = 'Update an artifact title/entry/mime or add/overwrite files.';
    toolset = 'artifacts';
    source = 'local';
    inputSchema = {
        type: 'object',
        properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            entry: { type: 'string' },
            mime: { type: 'string' },
            files: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: { path: { type: 'string' }, content: { type: 'string' } },
                    required: ['path', 'content']
                }
            }
        },
        required: ['id']
    };
    execution = { readOnly: false, sideEffect: true, requiresSequential: true, timeoutMs: 15000 };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const manifest = await store().update(requireWorkspace(context), String(input?.id || ''), {
            title: input?.title !== undefined ? String(input.title) : undefined,
            entry: input?.entry !== undefined ? String(input.entry) : undefined,
            mime: input?.mime !== undefined ? String(input.mime) : undefined,
            files: Array.isArray(input?.files) ? input.files : undefined
        });
        return summarize(manifest);
    }
}

@Injectable()
export class ArtifactDeleteTool implements AgentTool {
    name = 'artifact_delete';
    description = 'Delete a local artifact and its files.';
    toolset = 'artifacts';
    source = 'local';
    inputSchema = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] };
    execution = { readOnly: false, sideEffect: true, requiresSequential: true, timeoutMs: 10000 };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const removed = await store().remove(requireWorkspace(context), String(input?.id || ''));
        return { id: String(input?.id || ''), removed };
    }
}
