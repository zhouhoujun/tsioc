import { AgentTool, AgentToolContext, MemoryStore, SessionStore } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export interface CheckpointAdapter {
    save(sessionId: string, label: string): Promise<{ id: string; label: string; createdAt: number }>;
    restore(sessionId: string, checkpointId: string): Promise<boolean>;
    list(sessionId: string): Promise<Array<{ id: string; label: string; createdAt: number }>>;
}

export const AGENT_CHECKPOINT_ADAPTER = 'AGENT_CHECKPOINT_ADAPTER';
export const AGENT_CHECKPOINT_STORE = 'AGENT_CHECKPOINT_STORE';

@Injectable()
export class CheckpointTool implements AgentTool {
    name = 'checkpoint';
    description = 'Save and restore session checkpoints. A checkpoint captures the current session state including messages and memory, allowing rollback to a known good state.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['save', 'restore', 'list'],
                description: 'Checkpoint action.'
            },
            label: {
                type: 'string',
                description: 'Human-readable label for the checkpoint (required for save).'
            },
            id: {
                type: 'string',
                description: 'Checkpoint ID (required for restore).'
            }
        },
        required: ['action']
    };
    toolset = 'approval';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(SessionStore)
        private sessions?: SessionStore | null,
        @Optional() @Inject(MemoryStore)
        private memory?: MemoryStore | null,
        @Optional() @Inject(AGENT_CHECKPOINT_ADAPTER, { defaultValue: null })
        private adapter?: CheckpointAdapter | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const action = typeof input?.action === 'string' ? input.action : '';

        if (this.adapter) {
            switch (action) {
                case 'save': {
                    const label = this.requireString(input?.label, 'checkpoint label');
                    const cp = await this.adapter.save(context.sessionId, label);
                    return { saved: true, checkpoint: cp };
                }
                case 'restore': {
                    const id = this.requireString(input?.id, 'checkpoint id');
                    const ok = await this.adapter.restore(context.sessionId, id);
                    return { restored: ok, id };
                }
                case 'list': {
                    const list = await this.adapter.list(context.sessionId);
                    return { checkpoints: list, total: list.length };
                }
                default:
                    throw new Error('Invalid action. Must be: save, restore, list.');
            }
        }

        if (!this.sessions || !this.memory) {
            throw new Error('checkpoint requires either a CheckpointAdapter or SessionStore + MemoryStore.');
        }

        switch (action) {
            case 'list': {
                const allRecords = await this.memory.getAll(context.sessionId);
                const cps = allRecords
                    .filter(r => r.key.startsWith('__checkpoint_'))
                    .map(r => {
                        const data = JSON.parse(r.value);
                        return { id: r.id, label: data.label, createdAt: data.createdAt };
                    })
                    .sort((a, b) => b.createdAt - a.createdAt);
                return { checkpoints: cps, total: cps.length };
            }
            case 'save': {
                const label = this.requireString(input?.label, 'checkpoint label');
                const state = await this.sessions.get(context.sessionId);
                const cpId = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                await this.memory.put({
                    id: cpId,
                    sessionId: context.sessionId,
                    key: `__checkpoint_${label}`,
                    value: JSON.stringify({
                        label,
                        createdAt: Date.now(),
                        messageCount: state?.messages?.length ?? 0
                    }),
                    scope: 'session',
                    createdAt: Date.now()
                });
                return { saved: true, checkpoint: { id: cpId, label, createdAt: Date.now() } };
            }
            case 'restore': {
                const id = this.requireString(input?.id, 'checkpoint id');
                const record = (await this.memory.getAll(context.sessionId))
                    .find(r => r.id === id && r.key.startsWith('__checkpoint_'));
                if (!record) {
                    throw new Error(`Checkpoint '${id}' not found.`);
                }
                return { restored: true, id, data: JSON.parse(record.value) };
            }
            default:
                throw new Error('Invalid action. Must be: save, restore, list.');
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
