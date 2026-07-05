import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

export interface ModelRoute {
    id: string;
    name: string;
    matcher: { field: string; pattern: string }[];
    model: string;
    provider?: string;
    config?: Record<string, any>;
}

@Abstract()
export abstract class ModelRoutingAdapter {
    abstract listRoutes(): Promise<ModelRoute[]>;
    abstract getRoute(id: string): Promise<ModelRoute | null>;
    abstract setRoute(route: Omit<ModelRoute, 'id'>): Promise<ModelRoute>;
    abstract deleteRoute(id: string): Promise<boolean>;
    abstract resolve(input: string, context?: Record<string, any>): Promise<{ model: string; route?: ModelRoute }>;
}


@Injectable()
export class ModelRoutingTool implements AgentTool {
    name = 'model_routing';
    description = 'Manage model routing rules: list, create, update, delete routes, and resolve which model handles a given request based on configurable matchers.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['list', 'get', 'set', 'delete', 'resolve'],
                description: 'Routing operation.'
            },
            id: {
                type: 'string',
                description: 'Route ID (required for get, delete).'
            },
            name: {
                type: 'string',
                description: 'Route name (required for set).'
            },
            matchers: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        field: { type: 'string' },
                        pattern: { type: 'string' }
                    },
                    required: ['field', 'pattern']
                },
                description: 'Match conditions (required for set).'
            },
            model: {
                type: 'string',
                description: 'Model identifier (required for set).'
            },
            provider: {
                type: 'string',
                description: 'Optional provider name.'
            },
            input: {
                type: 'string',
                description: 'Input text to resolve against routes (required for resolve).'
            }
        },
        required: ['action']
    };
    toolset = 'model_routing';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        private adapter: ModelRoutingAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const action = typeof input?.action === 'string' ? input.action : '';

        switch (action) {
            case 'list': {
                const routes = await this.adapter.listRoutes();
                return { routes, total: routes.length };
            }
            case 'get': {
                const id = this.requireString(input?.id, 'model_routing id');
                const route = await this.adapter.getRoute(id);
                if (!route) { throw new Error(`Route '${id}' not found.`); }
                return { route };
            }
            case 'set': {
                const name = this.requireString(input?.name, 'model_routing name');
                const matchers = this.requireMatchers(input?.matchers);
                const model = this.requireString(input?.model, 'model_routing model');
                const route = await this.adapter.setRoute({
                    name, matcher: matchers, model,
                    provider: typeof input?.provider === 'string' ? input.provider : undefined
                });
                return { set: true, route };
            }
            case 'delete': {
                const id = this.requireString(input?.id, 'model_routing id');
                const deleted = await this.adapter.deleteRoute(id);
                return { deleted, id };
            }
            case 'resolve': {
                const resolveInput = this.requireString(input?.input, 'model_routing input');
                const resolved = await this.adapter.resolve(resolveInput);
                return { model: resolved.model, matchedRoute: resolved.route ?? undefined };
            }
            default:
                throw new Error('Invalid action. Must be: list, get, set, delete, resolve.');
        }
    }

    private requireMatchers(value: unknown): { field: string; pattern: string }[] {
        if (!Array.isArray(value) || value.length === 0) {
            throw new Error('Invalid matchers: must be a non-empty array of {field, pattern} objects.');
        }
        return value.map((m, i) => {
            if (!m || typeof m.field !== 'string' || typeof m.pattern !== 'string') {
                throw new Error(`Invalid matcher at index ${i}: must have string field and pattern.`);
            }
            return { field: m.field, pattern: m.pattern };
        });
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
