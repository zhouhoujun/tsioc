import { AgentTool, AgentToolContext, MemoryStore } from '@tsdi/agent';
import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';

@Abstract()
export abstract class DataExportAdapter {
    abstract exportData(data: ExportRequest): Promise<ExportResult>;
    abstract importData(data: ImportRequest): Promise<ImportResult>;
}

export interface ExportRequest {
    format: 'json' | 'markdown' | 'csv';
    scope: 'session' | 'memory' | 'knowledge';
    sessionId?: string;
    filter?: Record<string, any>;
}

export interface ExportResult {
    data: string;
    format: string;
    entryCount: number;
}

export interface ImportRequest {
    format: 'json' | 'markdown' | 'csv';
    target: 'memory' | 'knowledge';
    data: string;
    sessionId?: string;
}

export interface ImportResult {
    imported: number;
    errors: string[];
}


@Injectable()
export class DataManageTool implements AgentTool {
    name = 'data_manage';
    description = 'Export or import session data, memory, and knowledge entries. Supports JSON, Markdown, and CSV formats for data portability.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['export', 'import'],
                description: 'Export data from or import data into the agent.'
            },
            format: {
                type: 'string',
                enum: ['json', 'markdown', 'csv'],
                description: 'Data format (default: json).'
            },
            scope: {
                type: 'string',
                enum: ['session', 'memory', 'knowledge'],
                description: 'Data scope to export or target for import.'
            },
            data: {
                type: 'string',
                description: 'Data content (required for import).'
            },
            filter: {
                type: 'object',
                description: 'Optional filter criteria for export.'
            }
        },
        required: ['action']
    };
    toolset = 'data';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        private adapter: DataExportAdapter,
        @Optional() @Inject(MemoryStore)
        private memory?: MemoryStore | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const action = typeof input?.action === 'string' ? input.action : '';

        if (action === 'export') {
            return this.handleExport(input, context);
        }
        if (action === 'import') {
            return this.handleImport(input, context);
        }
        throw new Error('Invalid action. Must be: export, import.');
    }

    private async handleExport(input: any, context: AgentToolContext): Promise<any> {
        const format = this.resolveFormat(input?.format);
        const scope = this.resolveScope(input?.scope);

        if (this.adapter) {
            const result = await this.adapter.exportData({
                format,
                scope,
                sessionId: context.sessionId,
                filter: input?.filter || undefined
            });
            return {
                format: result.format,
                data: result.data,
                entryCount: result.entryCount
            };
        }

        if (scope === 'memory' && this.memory) {
            const records = await this.memory.getAll(context.sessionId);
            const data = JSON.stringify(records, null, 2);
            return { format, data, entryCount: records.length };
        }

        return {
            format,
            data: JSON.stringify({ scope, sessionId: context.sessionId }, null, 2),
            entryCount: 0,
            note: 'Limited export without adapter. Configure AGENT_DATA_ADAPTER for full export.'
        };
    }

    private async handleImport(input: any, context: AgentToolContext): Promise<any> {
        const format = this.resolveFormat(input?.format);
        const target = this.resolveTarget(input?.scope);
        const data = this.requireString(input?.data, 'data_manage import data');

        if (this.adapter) {
            const result = await this.adapter.importData({
                format,
                target,
                data,
                sessionId: context.sessionId
            });
            return {
                imported: result.imported,
                errors: result.errors.length ? result.errors : undefined
            };
        }

        if (target === 'memory' && this.memory && format === 'json') {
            try {
                const records = JSON.parse(data);
                const entries = Array.isArray(records) ? records : [records];
                let count = 0;
                for (const entry of entries) {
                    if (entry.key && entry.value) {
                        await this.memory.put({
                            id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            sessionId: context.sessionId,
                            key: entry.key,
                            value: entry.value,
                            scope: entry.scope || 'session',
                            createdAt: entry.createdAt || Date.now()
                        });
                        count++;
                    }
                }
                return { imported: count, format, target };
            } catch (error: any) {
                throw new Error(`Import parse error: ${error.message}`);
            }
        }

        throw new Error('data_manage import requires a configured DataAdapter or memory store for JSON memory import.');
    }

    private resolveFormat(value: unknown): 'json' | 'markdown' | 'csv' {
        if (value === 'markdown') return 'markdown';
        if (value === 'csv') return 'csv';
        return 'json';
    }

    private resolveScope(value: unknown): 'session' | 'memory' | 'knowledge' {
        if (value === 'memory') return 'memory';
        if (value === 'knowledge') return 'knowledge';
        return 'session';
    }

    private resolveTarget(value: unknown): 'memory' | 'knowledge' {
        if (value === 'knowledge') return 'knowledge';
        return 'memory';
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
