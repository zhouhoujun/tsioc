import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';

export interface CanvasEntry {
    id?: string;
    type: 'text' | 'code' | 'list' | 'table' | 'mermaid' | 'note';
    title: string;
    content: string;
    position?: { x: number; y: number };
    metadata?: Record<string, any>;
}

export interface CanvasData {
    id: string;
    title: string;
    entries: CanvasEntry[];
    createdAt: number;
    updatedAt: number;
}

@Abstract()
export abstract class CanvasAdapter {
    abstract create(canvas: { title: string; entries?: CanvasEntry[] }): Promise<CanvasData>;
    abstract get(id: string): Promise<CanvasData | null>;
    abstract update(id: string, updates: Partial<CanvasData>): Promise<CanvasData>;
    abstract delete(id: string): Promise<boolean>;
    abstract list(): Promise<Array<{ id: string; title: string; entryCount: number; updatedAt: number }>>;
}



@Injectable()
export class CanvasTool implements AgentTool {
    name = 'canvas';
    description = 'Create, read, update, and list structured canvases for visual planning, code design, system diagrams (Mermaid), notes, and tables. Acts as a flexible whiteboard for complex work.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['create', 'get', 'update', 'delete', 'list'],
                description: 'Canvas operation.'
            },
            id: {
                type: 'string',
                description: 'Canvas ID (required for get, update, delete).'
            },
            title: {
                type: 'string',
                description: 'Canvas title (required for create).'
            },
            entries: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['text', 'code', 'list', 'table', 'mermaid', 'note'] },
                        title: { type: 'string' },
                        content: { type: 'string' }
                    },
                    required: ['type', 'title', 'content']
                },
                description: 'Canvas entries for create/update.'
            }
        },
        required: ['action']
    };
    toolset = 'canvas';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(CanvasAdapter)
        private adapter?: CanvasAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        if (!this.adapter) {
            throw new Error('canvas requires a configured CanvasAdapter. Provide one via the AGENT_CANVAS_ADAPTER token.');
        }
        const action = typeof input?.action === 'string' ? input.action : '';

        switch (action) {
            case 'list': {
                const canvases = await this.adapter.list();
                return { canvases, total: canvases.length };
            }
            case 'create': {
                const title = this.requireString(input?.title, 'canvas title');
                const canvas = await this.adapter.create({
                    title,
                    entries: Array.isArray(input?.entries) ? input.entries : undefined
                });
                return { created: true, canvas };
            }
            case 'get': {
                const id = this.requireString(input?.id, 'canvas id');
                const canvas = await this.adapter.get(id);
                if (!canvas) {
                    throw new Error(`Canvas '${id}' not found.`);
                }
                return { canvas };
            }
            case 'update': {
                const id = this.requireString(input?.id, 'canvas id');
                const updates: Partial<CanvasData> = {};
                if (typeof input?.title === 'string') { updates.title = input.title; }
                if (Array.isArray(input?.entries)) { updates.entries = input.entries; }
                const canvas = await this.adapter.update(id, updates);
                return { updated: true, canvas };
            }
            case 'delete': {
                const id = this.requireString(input?.id, 'canvas id');
                const deleted = await this.adapter.delete(id);
                return { deleted, id };
            }
            default:
                throw new Error('Invalid action. Must be: create, get, update, delete, list.');
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
