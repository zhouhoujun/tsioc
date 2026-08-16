import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';

export interface AgentConsoleModelStoreData {
    favorites: string[];
    recents: string[];
}

@Injectable()
export class AgentConsoleModelStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null) {}

    async load(workspace: string): Promise<AgentConsoleModelStoreData> {
        if (!workspace || !this.fileAdapter) return { favorites: [], recents: [] };
        try {
            const text = await this.fileAdapter.readText(this.path(workspace));
            const parsed = JSON.parse(text);
            const favorites = this.normalizeNames(parsed?.favorites);
            const recents = this.normalizeNames(parsed?.recents);
            return { favorites, recents };
        } catch {
            return { favorites: [], recents: [] };
        }
    }

    async save(workspace: string, data: AgentConsoleModelStoreData): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.fileAdapter.join(workspace, '.tsdi-agent');
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({
            version: 1,
            favorites: this.normalizeNames(data?.favorites),
            recents: this.normalizeNames(data?.recents)
        }, null, 2));
    }

    private normalizeNames(names: unknown): string[] {
        if (!Array.isArray(names)) return [];
        const seen: string[] = [];
        names.forEach((value) => {
            const name = String(value ?? '').trim();
            if (name && !seen.includes(name)) {
                seen.push(name);
            }
        });
        return seen.slice(0, 10);
    }

    private path(workspace: string): string {
        return this.fileAdapter!.join(workspace, '.tsdi-agent', 'models.json');
    }
}
