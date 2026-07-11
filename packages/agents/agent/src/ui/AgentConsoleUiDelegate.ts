import { AgentConsoleSelectOption } from './AgentConsoleSessionState';

export interface ModelProfile {
    provider: string;
    flashModel: string;
    strongModel: string;
    baseUrl?: string;
    apiKey: string;
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

    abstract applyModelProfile(profile: ModelProfile): Promise<void>;

    abstract quit(): void;
}
