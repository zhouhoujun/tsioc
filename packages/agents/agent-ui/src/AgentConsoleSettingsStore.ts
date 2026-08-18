import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';

export interface AgentConsoleSettingsData {
    language?: string;
    vimMode?: boolean;
    showThinking?: boolean;
    showTimestamps?: boolean;
    showToolOutput?: boolean;
    showUsername?: boolean;
    timelineMode?: boolean;
    thinkingLevel?: 'low' | 'medium' | 'high';
}

@Injectable()
export class AgentConsoleSettingsStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null) {}

    async load(workspace: string): Promise<AgentConsoleSettingsData> {
        if (!workspace || !this.fileAdapter) return {};
        try {
            const text = await this.fileAdapter.readText(this.path(workspace));
            const parsed = JSON.parse(text);
            return {
                language: typeof parsed?.language === 'string' && parsed.language.trim() ? parsed.language.trim() : undefined,
                vimMode: typeof parsed?.vimMode === 'boolean' ? parsed.vimMode : undefined,
                showThinking: typeof parsed?.showThinking === 'boolean' ? parsed.showThinking : undefined,
                showTimestamps: typeof parsed?.showTimestamps === 'boolean' ? parsed.showTimestamps : undefined,
                showToolOutput: typeof parsed?.showToolOutput === 'boolean' ? parsed.showToolOutput : undefined,
                showUsername: typeof parsed?.showUsername === 'boolean' ? parsed.showUsername : undefined,
                timelineMode: typeof parsed?.timelineMode === 'boolean' ? parsed.timelineMode : undefined,
                thinkingLevel: parsed?.thinkingLevel === 'low' || parsed?.thinkingLevel === 'medium' || parsed?.thinkingLevel === 'high'
                    ? parsed.thinkingLevel
                    : undefined
            };
        } catch {
            return {};
        }
    }

    async save(workspace: string, data: AgentConsoleSettingsData): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.fileAdapter.join(workspace, '.tsdi-agent');
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({
            version: 1,
            ...(data.language ? { language: data.language } : {}),
            ...(typeof data.vimMode === 'boolean' ? { vimMode: data.vimMode } : {}),
            ...(typeof data.showThinking === 'boolean' ? { showThinking: data.showThinking } : {}),
            ...(typeof data.showTimestamps === 'boolean' ? { showTimestamps: data.showTimestamps } : {}),
            ...(typeof data.showToolOutput === 'boolean' ? { showToolOutput: data.showToolOutput } : {}),
            ...(typeof data.showUsername === 'boolean' ? { showUsername: data.showUsername } : {}),
            ...(typeof data.timelineMode === 'boolean' ? { timelineMode: data.timelineMode } : {}),
            ...(data.thinkingLevel ? { thinkingLevel: data.thinkingLevel } : {})
        }, null, 2));
    }

    private path(workspace: string): string {
        return this.fileAdapter!.join(workspace, '.tsdi-agent', 'settings.json');
    }
}
