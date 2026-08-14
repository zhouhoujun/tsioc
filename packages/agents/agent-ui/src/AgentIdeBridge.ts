import { token } from '@tsdi/ioc';

export interface AgentIdeContext {
    activeFile?: string;
    selection?: { startLine: number; endLine: number; text?: string };
    platform?: string;
}

export interface AgentIdeBridge {
    readonly available: boolean;
    getContext(): Promise<AgentIdeContext | undefined>;
}

export const AGENT_IDE_BRIDGE = token<AgentIdeBridge>('AGENT_IDE_BRIDGE');

export class VscodeIdeBridge implements AgentIdeBridge {
    readonly available = true;
    private context: AgentIdeContext | undefined;

    constructor(target: { addEventListener(type: string, listener: (event: any) => unknown): unknown } | null = null) {
        target?.addEventListener('message', (event: any) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') {
                return;
            }
            if (data.type === 'tsdiAgent.ideContext') {
                this.context = {
                    activeFile: data.activeFile || undefined,
                    selection: data.selection
                        ? { startLine: data.selection.startLine, endLine: data.selection.endLine, text: data.selection.text }
                        : undefined,
                    platform: 'vscode'
                };
            }
        });
    }

    async getContext(): Promise<AgentIdeContext | undefined> {
        return this.context;
    }
}

