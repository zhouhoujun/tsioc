import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

export interface BackupEntry {
    id: string;
    type: 'session' | 'memory' | 'config' | 'knowledge';
    data: string;
    metadata: Record<string, any>;
    createdAt: number;
}

export interface BackupManifest {
    id: string;
    label: string;
    entries: BackupEntry[];
    createdAt: number;
    size: number;
}

@Abstract()
export abstract class BackupAdapter {
    abstract createBackup(label: string, entries: BackupEntry[]): Promise<BackupManifest>;
    abstract listBackups(): Promise<Array<{ id: string; label: string; createdAt: number; size: number; entryCount: number }>>;
    abstract getBackup(id: string): Promise<BackupManifest | null>;
    abstract deleteBackup(id: string): Promise<boolean>;
    abstract restoreBackup(id: string, types?: string[]): Promise<{ restored: number; errors: string[] }>;
}


@Injectable()
export class BackupTool implements AgentTool {
    name = 'backup';
    description = 'Create, list, inspect, and restore backups of session data, memory, knowledge, and configuration. Provides safety nets before destructive operations.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['create', 'list', 'get', 'delete', 'restore'],
                description: 'Backup operation.'
            },
            label: {
                type: 'string',
                description: 'Human-readable label for the backup (required for create).'
            },
            id: {
                type: 'string',
                description: 'Backup ID (required for get, delete, restore).'
            },
            types: {
                type: 'array',
                items: { type: 'string', enum: ['session', 'memory', 'config', 'knowledge'] },
                description: 'Filter which types to restore (default: all).'
            }
        },
        required: ['action']
    };
    toolset = 'backup';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        private adapter: BackupAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const action = typeof input?.action === 'string' ? input.action : '';

        switch (action) {
            case 'list': {
                const backups = await this.adapter.listBackups();
                return { backups, total: backups.length };
            }
            case 'create': {
                const label = this.requireString(input?.label, 'backup label');
                const manifest = await this.adapter.createBackup(label, []);
                return { created: true, backup: manifest };
            }
            case 'get': {
                const id = this.requireString(input?.id, 'backup id');
                const backup = await this.adapter.getBackup(id);
                if (!backup) { throw new Error(`Backup '${id}' not found.`); }
                return {
                    backup: {
                        id: backup.id,
                        label: backup.label,
                        createdAt: backup.createdAt,
                        size: backup.size,
                        entryCount: backup.entries.length,
                        types: [...new Set(backup.entries.map(e => e.type))]
                    }
                };
            }
            case 'delete': {
                const id = this.requireString(input?.id, 'backup id');
                const deleted = await this.adapter.deleteBackup(id);
                return { deleted, id };
            }
            case 'restore': {
                const id = this.requireString(input?.id, 'backup id');
                const types = Array.isArray(input?.types) ? input.types.filter((t: any) => typeof t === 'string') : undefined;
                const result = await this.adapter.restoreBackup(id, types);
                return {
                    restored: result.restored,
                    errors: result.errors.length ? result.errors : undefined
                };
            }
            default:
                throw new Error('Invalid action. Must be: create, list, get, delete, restore.');
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
