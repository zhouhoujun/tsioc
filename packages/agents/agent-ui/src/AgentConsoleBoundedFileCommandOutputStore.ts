/**
 * Bounded durable command-output store backed by the cross-platform
 * `FileAdapter` (P267).
 *
 * Persists command outputs to a single JSON file through the injected
 * `FileAdapter` — the same abstraction used by `AgentConsoleSettingsStore`,
 * `AgentConsoleStash`, and `AgentConsoleTheme` — so both the TUI (node
 * FileAdapter) and the browser (platform-browser FileAdapter) share one
 * implementation. Each mutation rewrites the file, keeping at most `cap`
 * newest records, so results survive page/terminal restart.
 *
 * All filtering / session-matching / cursor-pagination / cap-eviction logic is
 * inherited from `AbstractCommandOutputStore`; this class only supplies the
 * file persistence seam (`load` / `persist`) and re-persists on mutation.
 *
 * Cross-platform: this module must NOT import node APIs.
 */
import { FileAdapter } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { AgentConsolePathProvider, resolveAgentConsoleDirectory } from './AgentConsolePathProvider';
import {
    AbstractCommandOutputStore,
    AgentConsoleCommandOutputHistoryEntry,
    AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP
} from './AgentConsoleCommandOutputHistory';

@Injectable()
export class BoundedFileCommandOutputStore extends AbstractCommandOutputStore {
    protected readonly fileAdapter: FileAdapter;
    protected readonly fileDirectory: string;
    protected readonly filePath: string;

    /** `fileAdapter` always exists for a durable store; the host supplies it. */
    constructor(fileAdapter: FileAdapter, directory = '', cap = AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP, paths?: AgentConsolePathProvider) {
        super(Math.max(1, Math.floor(cap ?? AGENT_CONSOLE_COMMAND_OUTPUT_HISTORY_CAP)));
        this.fileAdapter = fileAdapter;
        this.fileDirectory = paths?.dotDirectory(String(directory)) || resolveAgentConsoleDirectory(this.fileAdapter, String(directory));
        this.filePath = this.fileAdapter.join(this.fileDirectory, 'command-output-history.json');
        this.load();
    }

    override async append(entry: AgentConsoleCommandOutputHistoryEntry): Promise<void> {
        await super.append(entry);
        await this.persist();
    }

    override async clear(sessionId?: string, opts: { all?: boolean } = {}): Promise<number> {
        const removed = await super.clear(sessionId, opts);
        await this.persist();
        return removed;
    }

    protected load(): void {
        try {
            if (!this.fileAdapter.existsSync(this.filePath)) {
                this.entries = [];
                return;
            }
            const parsed = this.fileAdapter.readJSONSync<{ entries?: AgentConsoleCommandOutputHistoryEntry[] }>(this.filePath);
            const list = Array.isArray(parsed?.entries) ? parsed.entries : [];
            this.entries = list
                .filter((e: any) => e && typeof e.id === 'string')
                .slice(0, this.cap);
        } catch {
            this.entries = [];
        }
    }

    protected async persist(): Promise<void> {
        try {
            // Ensure the parent directory exists so the first write never hits
            // ENOENT (mirrors AgentConsoleSettingsStore.save).
            await this.fileAdapter.mkdir(this.fileDirectory, { recursive: true });
            await this.fileAdapter.writeText(
                this.filePath,
                JSON.stringify({ version: 1, entries: this.entries })
            );
        } catch {
            // best-effort: never throw on persistence failure
        }
    }
}
