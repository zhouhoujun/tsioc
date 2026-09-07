import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentConsolePathProvider, resolveAgentConsoleDirectory, resolveAgentConsoleStoreFile } from './AgentConsolePathProvider';

@Injectable()
export class AgentConsoleStashStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null, @Optional() private paths?: AgentConsolePathProvider | null) {}

    async load(workspace: string): Promise<Record<string, string>> {
        if (!workspace || !this.fileAdapter) return {};
        try {
            const text = await this.fileAdapter.readText(this.path(workspace));
            const parsed = JSON.parse(text);
            if (!parsed?.stashes || typeof parsed.stashes !== 'object') return {};
            const stashes: Record<string, string> = {};
            Object.entries(parsed.stashes as Record<string, unknown>).forEach(([name, value]) => {
                const textValue = String(value ?? '').trim();
                if (name.trim() && textValue) {
                    stashes[name] = textValue;
                }
            });
            return stashes;
        } catch {
            return {};
        }
    }

    async save(workspace: string, stashes: Record<string, string>): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.paths?.dotDirectory(workspace) || resolveAgentConsoleDirectory(this.fileAdapter, workspace);
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({ version: 1, stashes }, null, 2));
    }

    private path(workspace: string): string {
        return this.paths?.storeFile(workspace, 'stash.json') || resolveAgentConsoleStoreFile(this.fileAdapter!, workspace, 'stash.json');
    }
}
