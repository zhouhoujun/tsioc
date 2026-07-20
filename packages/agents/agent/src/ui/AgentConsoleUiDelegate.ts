import { AgentConsoleSelectOption } from './AgentConsoleSessionState';

export interface ModelProfile {
    provider: string;
    flashModel: string;
    strongModel: string;
    baseUrl?: string;
    apiKey?: string;
    configName?: string;
}

export interface SavedModelProfileChoice {
    name: string;
    provider: string;
    flashModel: string;
    strongModel: string;
    baseUrl?: string;
    active?: boolean;
}

export interface AgentConsoleSessionChoice {
    id: string;
    current?: boolean;
    detail?: string;
}

export abstract class AgentConsoleUiDelegate {
    abstract select(
        title: string,
        options: AgentConsoleSelectOption[],
        selectedIndex?: number,
        hint?: string
    ): Promise<string | undefined>;

    abstract prompt(
        question: string,
        secret?: boolean
    ): Promise<string | undefined>;

    abstract notify(message: string, duration?: number): void;

    abstract copyText(text: string): Promise<boolean>;

    copy(_target?: string): Promise<boolean> {
        return Promise.resolve(false);
    }

    listSessions(): Promise<AgentConsoleSessionChoice[]> {
        return Promise.resolve([]);
    }

    switchSession(_sessionId?: string): Promise<void> {
        return Promise.resolve();
    }

    listModelProfiles(): Promise<SavedModelProfileChoice[]> {
        return Promise.resolve([]);
    }

    abstract applyModelProfile(profile: ModelProfile): Promise<void>;

    abstract quit(): void;
}
