import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';
import { AgentConsolePathProvider, resolveAgentConsoleDirectory, resolveAgentConsoleStoreFile } from './AgentConsolePathProvider';

@Injectable()
export class AgentConsoleRawModeStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null, @Optional() private paths?: AgentConsolePathProvider | null) {}

    async load(workspace: string): Promise<boolean> {
        if (!workspace || !this.fileAdapter) return false;
        try {
            const text = await this.fileAdapter.readText(this.path(workspace));
            const parsed = JSON.parse(text);
            return typeof parsed?.rawMode === 'boolean' ? parsed.rawMode : false;
        } catch {
            return false;
        }
    }

    async save(workspace: string, rawMode: boolean): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.paths?.dotDirectory(workspace) || resolveAgentConsoleDirectory(this.fileAdapter, workspace);
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({ version: 1, rawMode }, null, 2));
    }

    private path(workspace: string): string {
        return this.paths?.storeFile(workspace, 'raw-mode.json') || resolveAgentConsoleStoreFile(this.fileAdapter!, workspace, 'raw-mode.json');
    }
}
