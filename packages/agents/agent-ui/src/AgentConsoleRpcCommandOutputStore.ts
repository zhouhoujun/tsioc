import { AgentConsoleAppRpc, AgentConsoleCommandOutputHistoryEntry, CommandOutputPage, CommandOutputQuery, CommandOutputStore } from '@tsdi/agent';

/** Browser/remote implementation of the shared command-output store port. */
export class RpcCommandOutputStore implements CommandOutputStore {
    constructor(private readonly rpc: AgentConsoleAppRpc, private readonly sessionId: () => string) {}

    async list(query: CommandOutputQuery = {}): Promise<CommandOutputPage> {
        const result = await this.rpc.request('command_output.list', { sessionId: this.sessionId(), ...query });
        return { items: Array.isArray(result?.items) ? result.items : [], nextCursor: result?.nextCursor, total: Number(result?.total || 0) };
    }

    async get(id: string, sessionId?: string): Promise<AgentConsoleCommandOutputHistoryEntry | undefined> {
        return (await this.rpc.request('command_output.get', { sessionId: sessionId || this.sessionId(), id })) || undefined;
    }

    async append(entry: AgentConsoleCommandOutputHistoryEntry): Promise<void> {
        await this.rpc.request('command_output.append', { sessionId: entry.sessionId || this.sessionId(), entry });
    }

    async clear(sessionId?: string, opts: { all?: boolean } = {}): Promise<number> {
        const result = await this.rpc.request('command_output.clear', { sessionId: sessionId || this.sessionId(), all: opts.all === true });
        return Number(result?.removed || 0);
    }
}
