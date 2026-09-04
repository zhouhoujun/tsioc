/**
 * Minimal in-memory test doubles for MemoryStore, SessionStore, and
 * ToolActivationStore.
 *
 * These are local to the test suite — NOT exported production implementations.
 * Named Test* (not InMemory*) to comply with the
 * "禁止新增 InMemory* 类" architecture constraint.
 */
import { MemoryStore, AgentMemoryRecord, SessionStore, AgentSessionSection, AgentSessionProjectIndex, AgentThreadIndex, AgentSessionSnapshotInfo, AgentSessionProjectMetadata, ToolActivationStore } from '@tsdi/agent';
import { AgentMessage, AgentState } from '@tsdi/agent';

// ---------------------------------------------------------------------------
// TestMemoryStore
// ---------------------------------------------------------------------------

export class TestMemoryStore extends MemoryStore {
    private records: AgentMemoryRecord[] = [];

    override async put(record: AgentMemoryRecord): Promise<void> {
        const idx = this.records.findIndex(r => r.id === record.id);
        if (idx >= 0) {
            this.records[idx] = record;
        } else {
            this.records.push(record);
        }
    }

    override async search(query: string, sessionId?: string): Promise<AgentMemoryRecord[]> {
        const q = String(query || '').toLowerCase();
        return this.records.filter(r => {
            if (sessionId && r.sessionId !== sessionId && r.scope !== 'global') return false;
            return String(r.key || '').toLowerCase().includes(q)
                || String(r.value || '').toLowerCase().includes(q);
        });
    }

    override async getAll(sessionId?: string): Promise<AgentMemoryRecord[]> {
        if (!sessionId) return [...this.records];
        return this.records.filter(r => r.sessionId === sessionId || r.scope === 'global');
    }

    override async delete(id: string, sessionId?: string, scope?: AgentMemoryRecord['scope']): Promise<number> {
        const record = this.records.find(r => r.id === id);
        if (!record) return 0;
        // Match the production TypeOrmMemoryStore.delete visibility semantics:
        // - global records are only deleted when scope === 'global' is explicitly passed
        // - session records are only deleted when the owning sessionId matches
        if (record.scope === 'global') {
            if (scope !== 'global') return 0;
        } else if (!sessionId || record.sessionId !== sessionId) {
            return 0;
        }
        const before = this.records.length;
        this.records = this.records.filter(r => r.id !== id);
        return before - this.records.length;
    }

    override async deleteBySession(sessionId: string): Promise<number> {
        const before = this.records.length;
        this.records = this.records.filter(r => !(r.sessionId === sessionId && r.scope === 'session'));
        return before - this.records.length;
    }

    override async clear(): Promise<void> {
        this.records = [];
    }
}

// ---------------------------------------------------------------------------
// TestSessionStore
// ---------------------------------------------------------------------------

interface SessionEntry {
    state: AgentState;
    sections: AgentSessionSection[];
    snapshots: Map<string, AgentState>;
}

export class TestSessionStore extends SessionStore {
    private sessions = new Map<string, SessionEntry>();

    private ensure(sessionId: string): SessionEntry {
        let entry = this.sessions.get(sessionId);
        if (!entry) {
            entry = {
                state: { sessionId, messages: [], createdAt: Date.now(), updatedAt: Date.now() },
                sections: [],
                snapshots: new Map()
            };
            this.sessions.set(sessionId, entry);
        }
        return entry;
    }

    override async get(sessionId: string): Promise<AgentState> {
        return { ...this.ensure(sessionId).state, messages: [...this.ensure(sessionId).state.messages] };
    }

    override async has(sessionId: string): Promise<boolean> {
        return this.sessions.has(sessionId);
    }

    override async listSessionIds(): Promise<string[]> {
        return [...this.sessions.keys()];
    }

    override async listProjects(): Promise<AgentSessionProjectIndex[]> {
        const map = new Map<string, AgentSessionProjectIndex>();
        for (const [id, entry] of this.sessions) {
            const s = entry.state;
            const key = s.projectId || '__none__';
            let idx = map.get(key);
            if (!idx) {
                idx = {
                    projectKey: key,
                    projectId: s.projectId,
                    workspace: s.workspace,
                    primaryThreadId: s.primaryThreadId,
                    sessionRole: s.sessionRole,
                    rootRequest: s.rootRequest,
                    focusSummary: s.focusSummary,
                    sessionIds: [],
                    lastActiveAt: 0
                };
                map.set(key, idx);
            }
            idx.sessionIds.push(id);
            idx.lastActiveAt = Math.max(idx.lastActiveAt || 0, s.updatedAt || 0);
        }
        return [...map.values()];
    }

    override async listThreads(): Promise<AgentThreadIndex[]> {
        return [];
    }

    override async listSections(sessionId: string): Promise<AgentSessionSection[]> {
        return [...this.ensure(sessionId).sections];
    }

    override async addSection(sessionId: string, label: string, _beforeId?: string, sectionId?: string): Promise<AgentSessionSection> {
        const entry = this.ensure(sessionId);
        const id = sectionId || `sec-${Date.now()}`;
        const section: AgentSessionSection = { id, label, createdAt: Date.now() };
        entry.sections.push(section);
        return section;
    }

    override async renameSection(_sessionId: string, _sectionId: string, _label: string): Promise<void> { /* noop */ }
    override async moveSection(_sessionId: string, _sectionId: string, _beforeId?: string): Promise<void> { /* noop */ }
    override async deleteSection(sessionId: string, sectionId: string): Promise<void> {
        const entry = this.ensure(sessionId);
        entry.sections = entry.sections.filter(s => s.id !== sectionId);
    }

    override async appendRaw(sessionId: string, message: AgentMessage): Promise<AgentState> {
        const entry = this.ensure(sessionId);
        entry.state.messages.push(message);
        entry.state.updatedAt = message.createdAt || Date.now();
        return this.get(sessionId);
    }

    override async setSummary(sessionId: string, summary: string): Promise<void> {
        this.ensure(sessionId).state.summary = summary;
    }

    override async setTitle(sessionId: string, title?: string): Promise<void> {
        this.ensure(sessionId).state.title = title;
    }

    override async setPinned(sessionId: string, pinned: boolean): Promise<void> {
        this.ensure(sessionId).state.pinned = pinned;
    }

    override async setArchived(sessionId: string, archived: boolean): Promise<void> {
        this.ensure(sessionId).state.archived = archived;
    }

    override async snapshot(sessionId: string, label?: string): Promise<string> {
        const entry = this.ensure(sessionId);
        const snapId = `snap-${Date.now()}`;
        entry.snapshots.set(snapId, JSON.parse(JSON.stringify(entry.state)));
        return snapId;
    }

    override async listSnapshots(sessionId: string): Promise<AgentSessionSnapshotInfo[]> {
        const entry = this.ensure(sessionId);
        return [...entry.snapshots.entries()].map(([id, state]) => ({
            snapshotId: id,
            messageCount: state.messages.length,
            createdAt: state.createdAt || 0
        }));
    }

    override async restoreSnapshot(sessionId: string, snapshotId: string): Promise<void> {
        const entry = this.ensure(sessionId);
        const snap = entry.snapshots.get(snapshotId);
        if (snap) {
            entry.state = JSON.parse(JSON.stringify(snap));
            entry.state.sessionId = sessionId;
        }
    }

    override async deleteSnapshot(sessionId: string, snapshotId: string): Promise<void> {
        this.ensure(sessionId).snapshots.delete(snapshotId);
    }

    override async setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void> {
        this.ensure(sessionId).state.ownerPrincipalId = ownerPrincipalId;
    }

    override async setWorkspace(sessionId: string, workspace?: string): Promise<void> {
        this.ensure(sessionId).state.workspace = workspace;
    }

    override async setProjectMetadata(sessionId: string, metadata: AgentSessionProjectMetadata): Promise<void> {
        const s = this.ensure(sessionId).state;
        if (metadata.projectId !== undefined) s.projectId = metadata.projectId;
        if (metadata.primaryThreadId !== undefined) s.primaryThreadId = metadata.primaryThreadId;
        if (metadata.originThreadId !== undefined) s.originThreadId = metadata.originThreadId;
        if (metadata.sessionRole !== undefined) s.sessionRole = metadata.sessionRole;
        if (metadata.rootRequest !== undefined) s.rootRequest = metadata.rootRequest;
        if (metadata.focusSummary !== undefined) s.focusSummary = metadata.focusSummary;
        if (metadata.threadStatus !== undefined) s.threadStatus = metadata.threadStatus;
    }

    override delete(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    override clear(): void {
        this.sessions.clear();
    }
}

// ---------------------------------------------------------------------------
// TestActivationStore
// ---------------------------------------------------------------------------

export class TestActivationStore extends ToolActivationStore {
    private active = new Map<string, Set<string>>();

    override activate(sessionId: string, name: string): void {
        let set = this.active.get(sessionId);
        if (!set) {
            set = new Set();
            this.active.set(sessionId, set);
        }
        set.add(name);
    }

    override isActive(sessionId: string, name: string): boolean {
        return this.active.get(sessionId)?.has(name) ?? false;
    }

    override getActive(sessionId: string): string[] {
        return [...(this.active.get(sessionId) ?? [])];
    }
}

export function withTestStoreProviders(): any[] {
    return [
        { provide: MemoryStore, useValue: new TestMemoryStore() },
        { provide: SessionStore, useValue: new TestSessionStore() },
        { provide: ToolActivationStore, useValue: new TestActivationStore() }
    ];
}
