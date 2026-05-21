import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export interface KanbanCard {
    id: string;
    title: string;
    description?: string;
    status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    assignee?: string;
    tags?: string[];
    blockedReason?: string;
    linkedCardIds?: string[];
    comments?: Array<{ id: string; text: string; createdAt: number; author?: string }>;
    createdAt: number;
    updatedAt: number;
    heartbeatAt?: number;
}

export interface KanbanBoard {
    id: string;
    name: string;
    description?: string;
    columns: string[];
    cards: KanbanCard[];
}

export interface KanbanAdapter {
    listBoards(): Promise<Array<{ id: string; name: string; cardCount: number }>>;
    getBoard(id: string): Promise<KanbanBoard | null>;
    createCard(boardId: string, card: Omit<KanbanCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<KanbanCard>;
    updateCard(boardId: string, cardId: string, updates: Partial<KanbanCard>): Promise<KanbanCard>;
    addComment(boardId: string, cardId: string, text: string, author?: string): Promise<KanbanCard>;
    linkCards(boardId: string, sourceId: string, targetId: string): Promise<void>;
}

export const AGENT_KANBAN_ADAPTER = 'AGENT_KANBAN_ADAPTER';

@Injectable()
export class KanbanTool implements AgentTool {
    name = 'kanban';
    description = 'Kanban board management: show board, list boards, create cards, update status, block/unblock, add comments, and link related cards. Useful for structured task tracking during development.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['list', 'show', 'create', 'update', 'block', 'unblock', 'comment', 'link'],
                description: 'Kanban operation.'
            },
            board_id: {
                type: 'string',
                description: 'Board ID (required for show, create, update, block, unblock, comment, link).'
            },
            card_id: {
                type: 'string',
                description: 'Card ID (required for update, block, unblock, comment, link).'
            },
            title: {
                type: 'string',
                description: 'Card title (required for create).'
            },
            description: {
                type: 'string',
                description: 'Card description.'
            },
            status: {
                type: 'string',
                enum: ['backlog', 'todo', 'in_progress', 'review', 'done', 'blocked'],
                description: 'Card status (for create and update).'
            },
            priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Card priority.'
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Card tags.'
            },
            blocked_reason: {
                type: 'string',
                description: 'Reason card is blocked (required for block action).'
            },
            text: {
                type: 'string',
                description: 'Comment text (required for comment action).'
            },
            target_card_id: {
                type: 'string',
                description: 'Target card ID for linking (required for link action).'
            }
        },
        required: ['action']
    };
    toolset = 'kanban';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(
        @Optional() @Inject(AGENT_KANBAN_ADAPTER, { defaultValue: null })
        private adapter?: KanbanAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        if (!this.adapter) {
            throw new Error('kanban requires a configured KanbanAdapter. Provide one via the AGENT_KANBAN_ADAPTER token.');
        }
        const action = typeof input?.action === 'string' ? input.action : '';

        switch (action) {
            case 'list': {
                const boards = await this.adapter.listBoards();
                return { boards, total: boards.length };
            }
            case 'show': {
                const boardId = this.requireString(input?.board_id, 'kanban board_id');
                const board = await this.adapter.getBoard(boardId);
                if (!board) { throw new Error(`Board '${boardId}' not found.`); }
                const cardCountByStatus: Record<string, number> = {};
                for (const card of board.cards) {
                    cardCountByStatus[card.status] = (cardCountByStatus[card.status] ?? 0) + 1;
                }
                return { board: { id: board.id, name: board.name, columns: board.columns, cards: board.cards }, cardCountByStatus };
            }
            case 'create': {
                const boardId = this.requireString(input?.board_id, 'kanban board_id');
                const title = this.requireString(input?.title, 'kanban title');
                const card = await this.adapter.createCard(boardId, {
                    title,
                    description: typeof input?.description === 'string' ? input.description : undefined,
                    status: (typeof input?.status === 'string' ? input.status : 'todo') as KanbanCard['status'],
                    priority: typeof input?.priority === 'string' ? input.priority as KanbanCard['priority'] : undefined,
                    tags: Array.isArray(input?.tags) ? input.tags.filter((t: any) => typeof t === 'string') : undefined
                });
                return { created: true, card };
            }
            case 'update': {
                const boardId = this.requireString(input?.board_id, 'kanban board_id');
                const cardId = this.requireString(input?.card_id, 'kanban card_id');
                const updates: Partial<KanbanCard> = {};
                if (typeof input?.title === 'string') { updates.title = input.title; }
                if (typeof input?.description === 'string') { updates.description = input.description; }
                if (typeof input?.status === 'string') { updates.status = input.status as KanbanCard['status']; }
                if (typeof input?.priority === 'string') { updates.priority = input.priority as KanbanCard['priority']; }
                const updated = await this.adapter.updateCard(boardId, cardId, updates);
                return { updated: true, card: updated };
            }
            case 'block': {
                const boardId = this.requireString(input?.board_id, 'kanban board_id');
                const cardId = this.requireString(input?.card_id, 'kanban card_id');
                const reason = this.requireString(input?.blocked_reason, 'kanban blocked_reason');
                const blocked = await this.adapter.updateCard(boardId, cardId, { status: 'blocked', blockedReason: reason });
                return { blocked: true, card: blocked };
            }
            case 'unblock': {
                const boardId = this.requireString(input?.board_id, 'kanban board_id');
                const cardId = this.requireString(input?.card_id, 'kanban card_id');
                const unblocked = await this.adapter.updateCard(boardId, cardId, { status: 'in_progress', blockedReason: undefined });
                return { unblocked: true, card: unblocked };
            }
            case 'comment': {
                const boardId = this.requireString(input?.board_id, 'kanban board_id');
                const cardId = this.requireString(input?.card_id, 'kanban card_id');
                const text = this.requireString(input?.text, 'kanban comment text');
                const card = await this.adapter.addComment(boardId, cardId, text);
                return { commented: true, card };
            }
            case 'link': {
                const boardId = this.requireString(input?.board_id, 'kanban board_id');
                const cardId = this.requireString(input?.card_id, 'kanban card_id');
                const targetId = this.requireString(input?.target_card_id, 'kanban target_card_id');
                await this.adapter.linkCards(boardId, cardId, targetId);
                return { linked: true, source: cardId, target: targetId };
            }
            default:
                throw new Error('Invalid action. Must be: list, show, create, update, block, unblock, comment, link.');
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
