import { Injectable } from '@tsdi/ioc';
import { ApprovalAdapter, ApprovalRequest, ApprovalResult } from '../approval/approval.tool';
import { IntentVerifierAdapter, IntentVerificationResult } from '../security/verifiable-intent.tool';
import { PollAdapter, PollData, PollOption } from '../poll/poll.tool';
import { CanvasAdapter, CanvasData, CanvasEntry } from '../canvas/canvas.tool';
import { KanbanAdapter, KanbanBoard, KanbanCard } from '../kanban/kanban.tool';
import { ModelRoutingAdapter, ModelRoute } from '../model-routing/model-routing.tool';
import { KnowledgeAdapter, KnowledgeEntry, KnowledgeSearchResult } from '../knowledge/types';
import { DataExportAdapter, ExportRequest, ExportResult, ImportRequest, ImportResult } from '../data/data-manage.tool';
import { BackupAdapter, BackupEntry, BackupManifest } from '../backup/backup.tool';

/**
 * Default ApprovalAdapter that auto-approves all requests.
 */
@Injectable({ provide: ApprovalAdapter })
export class DefaultApprovalAdapter extends ApprovalAdapter {
    private requests: ApprovalRequest[] = [];

    async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
        this.requests.push(request);
        return { approved: true, approvedBy: 'default', approvedAt: Date.now() };
    }

    pendingRequests(sessionId?: string): ApprovalRequest[] {
        if (sessionId) {
            return this.requests.filter(r => r.toolName === sessionId);
        }
        return [...this.requests];
    }

    cancelRequest(toolName: string, sessionId: string): boolean {
        const idx = this.requests.findIndex(r => r.toolName === toolName);
        if (idx >= 0) {
            this.requests.splice(idx, 1);
            return true;
        }
        return false;
    }
}

/**
 * Default IntentVerifierAdapter that auto-approves all intent verifications.
 */
@Injectable({ provide: IntentVerifierAdapter })
export class DefaultIntentVerifierAdapter extends IntentVerifierAdapter {
    async verify(action: string, context: string): Promise<IntentVerificationResult> {
        return { approved: true, verifiedAction: action, reasoning: 'Auto-approved by default adapter.' };
    }
}

/**
 * Default PollAdapter using in-memory storage.
 */
@Injectable({ provide: PollAdapter })
export class DefaultPollAdapter extends PollAdapter {
    private polls = new Map<string, PollData>();

    async createPoll(question: string, options: string[]): Promise<PollData> {
        const id = `poll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const poll: PollData = {
            id,
            question,
            options: options.map(label => ({ label, count: 0 })),
            totalVotes: 0,
            createdAt: Date.now()
        };
        this.polls.set(id, poll);
        return { ...poll };
    }

    async vote(pollId: string, optionLabel: string): Promise<PollData> {
        const poll = this.polls.get(pollId);
        if (!poll) {
            throw new Error(`Poll '${pollId}' not found.`);
        }
        if (poll.closedAt) {
            throw new Error(`Poll '${pollId}' is closed.`);
        }
        const option = poll.options.find(o => o.label === optionLabel);
        if (!option) {
            throw new Error(`Option '${optionLabel}' not found in poll '${pollId}'.`);
        }
        option.count++;
        poll.totalVotes++;
        return { ...poll };
    }

    async closePoll(pollId: string): Promise<PollData> {
        const poll = this.polls.get(pollId);
        if (!poll) {
            throw new Error(`Poll '${pollId}' not found.`);
        }
        poll.closedAt = Date.now();
        return { ...poll };
    }

    async getPoll(pollId: string): Promise<PollData | null> {
        const poll = this.polls.get(pollId);
        return poll ? { ...poll } : null;
    }

    async listPolls(): Promise<Array<{ id: string; question: string; totalVotes: number; closed: boolean }>> {
        return Array.from(this.polls.values()).map(p => ({
            id: p.id,
            question: p.question,
            totalVotes: p.totalVotes,
            closed: !!p.closedAt
        }));
    }
}

/**
 * Default CanvasAdapter using in-memory storage.
 */
@Injectable({ provide: CanvasAdapter })
export class DefaultCanvasAdapter extends CanvasAdapter {
    private canvases = new Map<string, CanvasData>();

    async create(canvas: { title: string; entries?: CanvasEntry[] }): Promise<CanvasData> {
        const id = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = Date.now();
        const data: CanvasData = {
            id,
            title: canvas.title,
            entries: canvas.entries ?? [],
            createdAt: now,
            updatedAt: now
        };
        this.canvases.set(id, data);
        return { ...data };
    }

    async get(id: string): Promise<CanvasData | null> {
        const data = this.canvases.get(id);
        return data ? JSON.parse(JSON.stringify(data)) : null;
    }

    async update(id: string, updates: Partial<CanvasData>): Promise<CanvasData> {
        const existing = this.canvases.get(id);
        if (!existing) {
            throw new Error(`Canvas '${id}' not found.`);
        }
        const updated: CanvasData = {
            ...existing,
            ...updates,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: Date.now()
        };
        if (updates.entries) {
            updated.entries = updates.entries;
        }
        this.canvases.set(id, updated);
        return JSON.parse(JSON.stringify(updated));
    }

    async delete(id: string): Promise<boolean> {
        return this.canvases.delete(id);
    }

    async list(): Promise<Array<{ id: string; title: string; entryCount: number; updatedAt: number }>> {
        return Array.from(this.canvases.values()).map(c => ({
            id: c.id,
            title: c.title,
            entryCount: c.entries.length,
            updatedAt: c.updatedAt
        }));
    }
}

/**
 * Default KanbanAdapter using in-memory storage.
 */
@Injectable({ provide: KanbanAdapter })
export class DefaultKanbanAdapter extends KanbanAdapter {
    private boards = new Map<string, KanbanBoard>();

    async listBoards(): Promise<Array<{ id: string; name: string; cardCount: number }>> {
        return Array.from(this.boards.values()).map(b => ({
            id: b.id,
            name: b.name,
            cardCount: b.cards.length
        }));
    }

    async getBoard(id: string): Promise<KanbanBoard | null> {
        const board = this.boards.get(id);
        return board ? JSON.parse(JSON.stringify(board)) : null;
    }

    async createCard(boardId: string, card: Omit<KanbanCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<KanbanCard> {
        const board = this.boards.get(boardId);
        if (!board) {
            throw new Error(`Board '${boardId}' not found.`);
        }
        const now = Date.now();
        const newCard: KanbanCard = {
            ...card as any,
            id: `card-${now}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: now,
            updatedAt: now
        };
        board.cards.push(newCard);
        return JSON.parse(JSON.stringify(newCard));
    }

    async updateCard(boardId: string, cardId: string, updates: Partial<KanbanCard>): Promise<KanbanCard> {
        const board = this.boards.get(boardId);
        if (!board) {
            throw new Error(`Board '${boardId}' not found.`);
        }
        const idx = board.cards.findIndex(c => c.id === cardId);
        if (idx < 0) {
            throw new Error(`Card '${cardId}' not found in board '${boardId}'.`);
        }
        board.cards[idx] = { ...board.cards[idx], ...updates, id: cardId, updatedAt: Date.now() };
        return JSON.parse(JSON.stringify(board.cards[idx]));
    }

    async addComment(boardId: string, cardId: string, text: string, author?: string): Promise<KanbanCard> {
        const board = this.boards.get(boardId);
        if (!board) {
            throw new Error(`Board '${boardId}' not found.`);
        }
        const card = board.cards.find(c => c.id === cardId);
        if (!card) {
            throw new Error(`Card '${cardId}' not found in board '${boardId}'.`);
        }
        const comment = { id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, createdAt: Date.now(), author };
        card.comments = [...(card.comments ?? []), comment];
        card.updatedAt = Date.now();
        return JSON.parse(JSON.stringify(card));
    }

    async linkCards(boardId: string, sourceId: string, targetId: string): Promise<void> {
        const board = this.boards.get(boardId);
        if (!board) {
            throw new Error(`Board '${boardId}' not found.`);
        }
        const source = board.cards.find(c => c.id === sourceId);
        if (!source) {
            throw new Error(`Card '${sourceId}' not found in board '${boardId}'.`);
        }
        const target = board.cards.find(c => c.id === targetId);
        if (!target) {
            throw new Error(`Card '${targetId}' not found in board '${boardId}'.`);
        }
        source.linkedCardIds = [...new Set([...(source.linkedCardIds ?? []), targetId])];
        target.linkedCardIds = [...new Set([...(target.linkedCardIds ?? []), sourceId])];
    }
}

/**
 * Default ModelRoutingAdapter using simple pattern/regex matching.
 */
@Injectable({ provide: ModelRoutingAdapter })
export class DefaultModelRoutingAdapter extends ModelRoutingAdapter {
    private routes: ModelRoute[] = [];

    async listRoutes(): Promise<ModelRoute[]> {
        return JSON.parse(JSON.stringify(this.routes));
    }

    async getRoute(id: string): Promise<ModelRoute | null> {
        const route = this.routes.find(r => r.id === id);
        return route ? JSON.parse(JSON.stringify(route)) : null;
    }

    async setRoute(route: Omit<ModelRoute, 'id'>): Promise<ModelRoute> {
        const id = `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newRoute: ModelRoute = { ...route, id };
        this.routes.push(newRoute);
        return JSON.parse(JSON.stringify(newRoute));
    }

    async deleteRoute(id: string): Promise<boolean> {
        const idx = this.routes.findIndex(r => r.id === id);
        if (idx >= 0) {
            this.routes.splice(idx, 1);
            return true;
        }
        return false;
    }

    async resolve(input: string, _context?: Record<string, any>): Promise<{ model: string; route?: ModelRoute }> {
        for (const route of this.routes) {
            const allMatch = route.matcher.every(m => {
                try {
                    const re = new RegExp(m.pattern, 'i');
                    return re.test(input);
                } catch {
                    return input.toLowerCase().includes(m.pattern.toLowerCase());
                }
            });
            if (allMatch) {
                return { model: route.model, route };
            }
        }
        return { model: 'default' };
    }
}

/**
 * Default KnowledgeAdapter using in-memory storage with simple text search.
 */
@Injectable({ provide: KnowledgeAdapter })
export class DefaultKnowledgeAdapter extends KnowledgeAdapter {
    private entries: KnowledgeEntry[] = [];

    async search(query: string, options?: { tags?: string[]; limit?: number; offset?: number }): Promise<KnowledgeSearchResult> {
        const q = query.toLowerCase();
        let results = this.entries.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.content.toLowerCase().includes(q) ||
            (e.tags?.some(t => t.toLowerCase().includes(q)) ?? false)
        );

        if (options?.tags?.length) {
            results = results.filter(e =>
                options.tags!.some(t => e.tags?.includes(t))
            );
        }

        const total = results.length;
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? 10;
        const paged = results.slice(offset, offset + limit);

        return {
            entries: paged.map(e => ({ ...e })),
            total
        };
    }

    async store(entry: KnowledgeEntry): Promise<KnowledgeEntry> {
        const now = Date.now();
        const stored: KnowledgeEntry = {
            ...entry,
            id: entry.id || `know-${now}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: entry.createdAt || now,
            updatedAt: now
        };
        const idx = this.entries.findIndex(e => e.id === stored.id);
        if (idx >= 0) {
            this.entries[idx] = stored;
        } else {
            this.entries.push(stored);
        }
        return { ...stored };
    }

    async delete(id: string): Promise<boolean> {
        const idx = this.entries.findIndex(e => e.id === id);
        if (idx >= 0) {
            this.entries.splice(idx, 1);
            return true;
        }
        return false;
    }
}

/**
 * Default DataExportAdapter using JSON serialization.
 */
@Injectable({ provide: DataExportAdapter })
export class DefaultDataExportAdapter extends DataExportAdapter {
    async exportData(request: ExportRequest): Promise<ExportResult> {
        const data = JSON.stringify({
            scope: request.scope,
            sessionId: request.sessionId,
            filter: request.filter,
            exportedAt: Date.now()
        }, null, 2);

        let format = request.format;
        if (format === 'markdown') {
            return {
                data: '```json\n' + data + '\n```',
                format: 'markdown',
                entryCount: 1
            };
        }
        if (format === 'csv') {
            return {
                data: 'scope,sessionId,exportedAt\n' +
                    `"${request.scope}","${request.sessionId ?? ''}",${Date.now()}\n`,
                format: 'csv',
                entryCount: 1
            };
        }
        return { data, format: 'json', entryCount: 1 };
    }

    async importData(request: ImportRequest): Promise<ImportResult> {
        if (request.format === 'json') {
            try {
                JSON.parse(request.data);
                return { imported: 1, errors: [] };
            } catch (e: any) {
                return { imported: 0, errors: [e.message] };
            }
        }
        return { imported: 0, errors: ['Only JSON format is supported by default adapter.'] };
    }
}

/**
 * Default BackupAdapter using in-memory storage.
 */
@Injectable({ provide: BackupAdapter })
export class DefaultBackupAdapter extends BackupAdapter {
    private manifests = new Map<string, BackupManifest>();

    async createBackup(label: string, entries: BackupEntry[]): Promise<BackupManifest> {
        const id = `backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const manifest: BackupManifest = {
            id,
            label,
            entries: entries.map(e => ({ ...e })),
            createdAt: Date.now(),
            size: entries.reduce((acc, e) => acc + e.data.length + JSON.stringify(e.metadata).length, 0)
        };
        this.manifests.set(id, manifest);
        return JSON.parse(JSON.stringify(manifest));
    }

    async listBackups(): Promise<Array<{ id: string; label: string; createdAt: number; size: number; entryCount: number }>> {
        return Array.from(this.manifests.values()).map(m => ({
            id: m.id,
            label: m.label,
            createdAt: m.createdAt,
            size: m.size,
            entryCount: m.entries.length
        }));
    }

    async getBackup(id: string): Promise<BackupManifest | null> {
        const manifest = this.manifests.get(id);
        return manifest ? JSON.parse(JSON.stringify(manifest)) : null;
    }

    async deleteBackup(id: string): Promise<boolean> {
        return this.manifests.delete(id);
    }

    async restoreBackup(id: string, _types?: string[]): Promise<{ restored: number; errors: string[] }> {
        const manifest = this.manifests.get(id);
        if (!manifest) {
            throw new Error(`Backup '${id}' not found.`);
        }
        const entries = _types
            ? manifest.entries.filter(e => _types.includes(e.type))
            : manifest.entries;
        return { restored: entries.length, errors: [] };
    }
}
